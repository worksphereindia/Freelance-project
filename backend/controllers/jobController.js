const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const User = require('../models/User');
const { decrypt } = require('../utils/crypto');
const { sendEmail, sendProfessionalEmail } = require('../utils/email');
const axios = require('axios');

const emitJobUpdate = (req, userIds) => {
  const io = req.app.get('io');
  if (io) {
    userIds.forEach(id => {
      if (id) io.to(`updates_${id.toString()}`).emit('job_updated');
    });
  }
};

exports.createJob = async (req, res) => {
  try {
    const { title, description, budget, skills, category } = req.body;
    const job = await Job.create({
      client: req.user.id,
      title,
      description,
      budget,
      skills,
      category
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'open', isApproved: true, isRehire: { $ne: true } };

    const jobs = await Job.find(query)
      .populate('client', 'name companyName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalJobs: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    if (req.user.role === 'client') {
      const jobs = await Job.find({ client: req.user.id }).populate('selectedFreelancer', 'name profilePicture skills rating').sort({ createdAt: -1 }).lean();
      
      // Attach bid count to each job
      const jobsWithBids = await Promise.all(jobs.map(async (job) => {
        const bidCount = await Bid.countDocuments({ job: job._id });
        return { ...job, bidCount };
      }));
      
      res.json(jobsWithBids);
    } else {
      // Freelancer: Get jobs they bid on, OR jobs where they are the rehireTargetFreelancer, OR selectedFreelancer
      const bids = await Bid.find({ freelancer: req.user.id }).populate({
        path: 'job',
        populate: { path: 'client', select: 'name companyName' }
      });
      const biddedJobs = bids.map(bid => bid.job).filter(job => job != null);

      const assignedJobs = await Job.find({
        $or: [
          { selectedFreelancer: req.user.id },
          { rehireTargetFreelancer: req.user.id }
        ]
      }).populate('client', 'name companyName').lean();

      const allJobs = [...biddedJobs, ...assignedJobs];
      
      const uniqueJobs = Array.from(new Set(allJobs.map(j => j._id.toString())))
        .map(id => allJobs.find(j => j._id.toString() === id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(uniqueJobs);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobMessages = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { freelancerId } = req.query;
    
    let query = { job: jobId };
    
    if (freelancerId) {
      query.$or = [
        { sender: req.user.id, receiver: freelancerId },
        { sender: freelancerId, receiver: req.user.id }
      ];
    } else if (req.user.role === 'freelancer') {
      const job = await Job.findById(jobId);
      if (job) {
        query.$or = [
          { sender: req.user.id, receiver: job.client },
          { sender: job.client, receiver: req.user.id }
        ];
      }
    } else {
      const job = await Job.findById(jobId);
      if (job && job.selectedFreelancer) {
        query.$or = [
          { sender: req.user.id, receiver: job.selectedFreelancer },
          { sender: job.selectedFreelancer, receiver: req.user.id }
        ];
      } else {
        return res.json([]);
      }
    }

    // Mark messages received by the current user as read in the DB
    await Message.updateMany(
      { ...query, receiver: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find(query).sort({ createdAt: 1 });
    
    // Decrypt messages for authorized client reading
    const decryptedMessages = messages.map(msg => {
      try {
        return {
          _id: msg._id,
          sender: msg.sender,
          receiver: msg.receiver,
          job: msg.job,
          content: decrypt(msg.content),
          isRead: msg.isRead,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        };
      } catch (err) {
        return msg;
      }
    });

    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobBids = async (req, res) => {
  try {
    const { jobId } = req.params;
    const query = { job: jobId };
    
    // If user is a freelancer, only allow them to see their own bid
    if (req.user.role === 'freelancer') {
      query.freelancer = req.user.id;
    }
    
    const bids = await Bid.find(query).populate('freelancer', 'name skills rating profilePicture experience');
    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.placeBid = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { amount, proposal } = req.body;
    
    // Check if freelancer is approved by admin
    const userProfile = await User.findById(req.user.id);
    if (!userProfile || !userProfile.isFreelancerApproved) {
      return res.status(403).json({ message: 'Your account is pending admin approval. You cannot place bids yet.' });
    }

    // Check Subscription Limits
    if (!userProfile.subscriptionPlan || userProfile.subscriptionPlan === 'none') {
      return res.status(403).json({ message: 'You need an active subscription plan to place bids.' });
    }
    
    if (userProfile.subscriptionExpiry && new Date() > new Date(userProfile.subscriptionExpiry)) {
      userProfile.subscriptionPlan = 'none';
      await userProfile.save();
      return res.status(403).json({ message: 'Your subscription has expired. Please renew your plan to continue bidding.' });
    }

    if (userProfile.subscriptionPlan === 'basic' && userProfile.bidsThisMonth >= 3) {
      return res.status(403).json({ message: 'You have reached your limit of 3 bids for the Basic Plan. Please upgrade to Advanced for unlimited bids.' });
    }

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'open') {
      return res.status(404).json({ message: 'Job not found or not open' });
    }

    const bid = await Bid.create({
      job: jobId,
      freelancer: req.user.id,
      amount,
      proposal,
      negotiationHistory: [
        {
          offeredBy: 'freelancer',
          amount: amount,
          message: proposal,
          status: 'pending'
        }
      ]
    });

    userProfile.bidsThisMonth += 1;
    await userProfile.save();

    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    
    const bid = await Bid.findById(bidId).populate('job');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Ensure only the client who posted the job can accept the bid
    if (bid.job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update Bid status
    bid.status = 'accepted';
    if (bid.negotiationHistory && bid.negotiationHistory.length > 0) {
      const lastHist = bid.negotiationHistory[bid.negotiationHistory.length - 1];
      if (lastHist.status === 'pending') {
        lastHist.status = 'accepted';
      }
    }
    await bid.save();

    // Reject all other bids for this job
    await Bid.updateMany(
      { job: bid.job._id, _id: { $ne: bidId } },
      { $set: { status: 'rejected' } }
    );

    // Update Job
    const job = await Job.findById(bid.job._id);
    job.status = 'in-progress';
    job.selectedFreelancer = bid.freelancer;
    job.acceptedPrice = bid.amount; // Save agreed bid amount
    await job.save();

    res.json({ message: 'Bid accepted, job in progress', job, bid });

    // Emit real-time update
    emitJobUpdate(req, [job.client, job.selectedFreelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deliverJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { deliverableLink } = req.body;
    
    if (!deliverableLink) {
      return res.status(400).json({ message: 'Deliverable link is required.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if current user is the selected freelancer
    if (job.selectedFreelancer?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to deliver this job' });
    }

    if (job.status !== 'in-progress') {
      return res.status(400).json({ message: 'Job is not in progress' });
    }

    job.status = 'delivered';
    job.deliverableLink = deliverableLink;
    await job.save();

    res.json({ message: 'Work delivered successfully, pending client review', job });

    // Emit real-time update
    emitJobUpdate(req, [job.client, job.selectedFreelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('client', 'name companyName profilePicture')
      .populate('selectedFreelancer', 'name skills rating portfolioUrl experience location profilePicture');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveJob = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized, admin only' });
    }
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    job.isApproved = true;
    await job.save();
    res.json({ message: 'Job approved successfully', job });

    // Emit real-time update
    if (job.client) emitJobUpdate(req, [job.client]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAiMatches = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to get AI matches for this job' });
    }

    const freelancers = await User.find({ role: 'freelancer' }).select('_id skills name username rating profileCompleteness profilePicture');

    const payload = {
      job: {
        id: job._id.toString(),
        title: job.title || '',
        description: job.description || '',
        skills_required: job.skills || []
      },
      freelancers: freelancers.map(f => ({
        id: f._id.toString(),
        name: f.name || '',
        skills: f.skills || [],
        rating: f.rating || 5
      }))
    };

    let matches = [];
    try {
      const aiResponse = await axios.post('http://127.0.0.1:8000/match', payload, { timeout: 3000 });
      matches = aiResponse.data;
    } catch (aiError) {
      console.warn('AI Matcher unavailable, using fallback keyword matching.');
      matches = freelancers.map(f => {
        let score = 0;
        job.skills.forEach(skill => {
          if (f.skills && f.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
            score += 1;
          }
        });
        return { freelancer_id: f._id.toString(), score: job.skills.length ? score / job.skills.length : 0 };
      }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);
    }

    const enrichedMatches = matches.map(match => {
      const fData = freelancers.find(f => f._id.toString() === match.freelancer_id);
      return {
        freelancer: fData,
        score: match.score
      };
    });

    res.status(200).json(enrichedMatches);
  } catch (error) {
    console.error('AI Matcher Error:', error.message);
    res.status(500).json({ message: 'Failed to generate AI matches' });
  }
};

exports.getAiRecommendedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (user.subscriptionPlan !== 'pro') {
      return res.status(403).json({ message: 'Pro subscription required for AI Job Search.' });
    }

    const openJobs = await Job.find({ status: 'open' }).select('_id title description skills category budget');
    if (!openJobs || openJobs.length === 0) {
      return res.status(200).json([]);
    }

    const payload = {
      freelancer: {
        id: user._id.toString(),
        name: user.name || '',
        skills: user.skills || [],
        rating: user.rating || 5
      },
      jobs: openJobs.map(j => ({
        id: j._id.toString(),
        title: j.title || '',
        description: j.description || '',
        skills_required: j.skills || []
      }))
    };

    let matches = [];
    try {
      const aiResponse = await axios.post('http://127.0.0.1:8000/match-jobs', payload, { timeout: 3000 });
      matches = aiResponse.data;
    } catch (aiError) {
      console.warn('AI Matcher unavailable, using fallback keyword matching.', aiError.message);
      matches = openJobs.map(j => {
        let score = 0;
        if (j.skills && j.skills.length > 0) {
          j.skills.forEach(skill => {
            if (user.skills && user.skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
              score += 1;
            }
          });
          score = score / j.skills.length;
        }
        return { job_id: j._id.toString(), score };
      }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);
    }

    const enrichedMatches = matches.map(match => {
      const jobData = openJobs.find(j => j._id.toString() === match.job_id);
      return {
        job: jobData,
        score: match.score
      };
    });

    res.status(200).json(enrichedMatches);
  } catch (error) {
    console.error('AI Recommend Job Search Error:', error.message);
    res.status(500).json({ message: 'Failed to generate AI recommended jobs' });
  }
};

exports.updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { amount, proposal } = req.body;
    
    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    if (bid.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const job = await Job.findById(bid.job);
    if (!job || job.status !== 'open') {
      return res.status(400).json({ message: 'Job is no longer open for bidding' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Bid price must be a valid number greater than 0.' });
    }

    if (amount) bid.amount = amount;
    if (proposal) bid.proposal = proposal;
    await bid.save();

    res.json({ message: 'Bid updated successfully', bid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.disputeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { reason } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.client.toString() !== req.user.id && (!job.selectedFreelancer || job.selectedFreelancer.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to dispute this job' });
    }

    job.status = 'disputed';
    // We could store the reason in a new field or just keep it simple
    await job.save();

    res.json({ message: 'Job marked as disputed. Admin will review.', job });

    // Emit real-time update
    emitJobUpdate(req, [job.client, job.selectedFreelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.postCounterOffer = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { amount, message } = req.body;

    const bid = await Bid.findById(bidId).populate('job');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const isFreelancer = bid.freelancer.toString() === req.user.id;
    const isClient = bid.job.client.toString() === req.user.id;

    if (!isFreelancer && !isClient) {
      return res.status(403).json({ message: 'Not authorized to negotiate this bid' });
    }

    if (bid.status !== 'pending' || bid.job.status !== 'open') {
      return res.status(400).json({ message: 'Bidding is closed for this project' });
    }

    const offeredBy = isClient ? 'client' : 'freelancer';

    // Append to negotiation history
    bid.negotiationHistory.push({
      offeredBy,
      amount,
      message: message || `Counter-offer proposed by ${offeredBy}`,
      status: 'pending'
    });

    // Mark previous pending steps as rejected
    for (let i = 0; i < bid.negotiationHistory.length - 1; i++) {
      if (bid.negotiationHistory[i].status === 'pending') {
        bid.negotiationHistory[i].status = 'rejected';
      }
    }

    bid.amount = amount;
    await bid.save();

    res.json({ message: 'Counter-offer submitted successfully', bid });

    // Emit real-time update
    emitJobUpdate(req, [bid.job.client, bid.freelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptCounterOffer = async (req, res) => {
  try {
    const { bidId } = req.params;
    const bid = await Bid.findById(bidId).populate('job');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    if (bid.negotiationHistory.length === 0) {
      return res.status(400).json({ message: 'No counter-offers found to accept' });
    }

    const lastOffer = bid.negotiationHistory[bid.negotiationHistory.length - 1];
    if (lastOffer.status !== 'pending') {
      return res.status(400).json({ message: 'No pending counter-offer is active' });
    }

    const offeredBy = lastOffer.offeredBy;
    const isClient = req.user.role === 'client' && bid.job.client.toString() === req.user.id;
    const isFreelancer = req.user.role === 'freelancer' && bid.freelancer.toString() === req.user.id;

    if ((offeredBy === 'client' && !isFreelancer) || (offeredBy === 'freelancer' && !isClient)) {
      return res.status(403).json({ message: 'You cannot accept your own counter-offer' });
    }

    // Update active offer status to accepted
    lastOffer.status = 'accepted';
    bid.status = 'accepted';
    await bid.save();

    const job = await Job.findById(bid.job._id);
    job.status = 'in-progress';
    job.selectedFreelancer = bid.freelancer;
    job.acceptedPrice = bid.amount;
    await job.save();

    // Reject other bids
    await Bid.updateMany(
      { job: bid.job._id, _id: { $ne: bidId } },
      { $set: { status: 'rejected' } }
    );

    res.json({ message: 'Negotiation accepted and contract established!', bid });

    // Emit real-time update
    emitJobUpdate(req, [job.client, job.selectedFreelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectCounterOffer = async (req, res) => {
  try {
    const { bidId } = req.params;
    const bid = await Bid.findById(bidId).populate('job');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    if (bid.negotiationHistory.length === 0) {
      return res.status(400).json({ message: 'No counter-offers found to decline' });
    }

    const lastOffer = bid.negotiationHistory[bid.negotiationHistory.length - 1];
    if (lastOffer.status !== 'pending') {
      return res.status(400).json({ message: 'No pending counter-offer is active' });
    }

    lastOffer.status = 'rejected';
    await bid.save();

    res.json({ message: 'Counter-offer declined successfully', bid });

    // Emit real-time update
    emitJobUpdate(req, [bid.job.client, bid.freelancer]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.inviteFreelancer = async (req, res) => {
  try {
    const { jobId, freelancerId } = req.params;
    const job = await Job.findById(jobId);
    
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to invite to this job' });
    }

    if (!job.invitedFreelancers.includes(freelancerId)) {
      job.invitedFreelancers.push(freelancerId);
      await job.save();
    }
    
    res.json({ message: 'Freelancer invited successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---- Project Assets (client shares files with the hired freelancer) ----

const MAX_ASSET_BYTES = 25 * 1024 * 1024; // 25 MB
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'com', 'scr', 'js', 'jar'];

// Only the job owner (client) and the selected freelancer may see/manage assets
const canAccessJobAssets = (job, userId) => {
  const isClient = job.client.toString() === userId;
  const isFreelancer = job.selectedFreelancer && job.selectedFreelancer.toString() === userId;
  return { isClient, isFreelancer, allowed: isClient || isFreelancer };
};

exports.getJobAssets = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).select('client selectedFreelancer assets');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const { allowed } = canAccessJobAssets(job, req.user.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to view assets for this job' });
    }

    const assets = [...(job.assets || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadJobAsset = async (req, res) => {
  try {
    const { jobId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only the client who owns the job can share assets
    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the hiring client can upload assets.' });
    }

    // Assets are only shareable once a freelancer has been hired (job accepted)
    if (!job.selectedFreelancer) {
      return res.status(400).json({ message: 'You can share assets only after a freelancer is hired.' });
    }

    const name = file.originalname;
    const size = file.size;
    const type = file.mimetype;
    
    // Construct local URL for the file
    const url = `${process.env.VITE_API_URL || 'http://localhost:5000'}/uploads/assets/${file.filename}`;

    const asset = {
      name,
      url,
      type: type || '',
      size: size ? Number(size) : undefined,
      storagePath: `uploads/assets/${file.filename}`,
      uploadedBy: req.user.id,
      createdAt: new Date()
    };

    job.assets.push(asset);
    await job.save();

    // Notify the freelancer that a new asset is available (best-effort)
    try {
      const freelancer = await User.findById(job.selectedFreelancer).select('email');
      if (freelancer && freelancer.email) {
        sendProfessionalEmail(
          freelancer.email,
          `New project asset shared — "${job.title}"`,
          "New Project Asset",
          `<p>The client has shared a new file for <strong>"${job.title}"</strong>.</p>
           <p>Open the <strong>Assets</strong> panel in your project chat to download it.</p>`
        );
      }
    } catch (mailErr) {
      console.error('Asset notification email failed:', mailErr);
    }

    const saved = job.assets[job.assets.length - 1];
    res.status(201).json({ message: 'Asset shared successfully', asset: saved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteJobAsset = async (req, res) => {
  try {
    const { jobId, assetId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only the client who owns the job can remove assets
    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to remove this asset.' });
    }

    const asset = job.assets.id(assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    asset.deleteOne();
    await job.save();

    res.json({ message: 'Asset removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── REHIRE / MAINTENANCE FLOW ──────────────────────────────────────────────────
//
//  Step 1 (Client)     → POST /:jobId/rehire
//                         Client describes what upgrade/maintenance they need.
//                         No budget given — freelancer will quote.
//
//  Step 2 (Freelancer) → POST /:jobId/rehire-respond
//                         Freelancer proposes their price, or declines.
//
//  Step 3 (Client)     → POST /:jobId/rehire-accept-counter   (accept)
//                       → POST /:jobId/rehire-reject-counter   (reject)
//                         If accepted → job moves in-progress, client goes to /pay/:jobId
//
// ────────────────────────────────────────────────────────────────────────────────

// Step 1 — Client sends maintenance/rehire request (description only, no budget)
exports.createRehireRequest = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { title, description } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ message: 'Please describe what you need (at least 10 characters).' });
    }

    const originalJob = await Job.findById(jobId).populate('selectedFreelancer', 'name email');
    if (!originalJob) return res.status(404).json({ message: 'Original job not found.' });

    if (originalJob.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (originalJob.status !== 'completed' && originalJob.status !== 'cancelled') {
      return res.status(400).json({ message: 'Can only send a maintenance request from a completed job.' });
    }

    if (!originalJob.selectedFreelancer) {
      return res.status(400).json({ message: 'No freelancer was hired for the original job.' });
    }

    // Create placeholder rehire job — budget is 0 until freelancer quotes
    const newJob = await Job.create({
      client: req.user.id,
      title: title || `Maintenance: ${originalJob.title}`,
      description: description,
      budget: 1, // placeholder, will be set when freelancer quotes
      category: originalJob.category,
      skills: originalJob.skills,
      isApproved: true,
      status: 'open',
      isRehire: true,
      rehireOf: originalJob._id,
      rehireStatus: 'pending_freelancer', // waiting for freelancer to quote
      rehireDescription: description,
      rehireTargetFreelancer: originalJob.selectedFreelancer._id,
      paymentStatus: 'pending'
    });

    // Notify freelancer via socket
    emitJobUpdate(req, [originalJob.selectedFreelancer._id]);

    // Email freelancer
    try {
      const client = await User.findById(req.user.id).select('name companyName');
      const emailHtml = `
        <p>Hi ${originalJob.selectedFreelancer.name},</p>
        <p><strong>${client.name || client.companyName}</strong> wants to hire you for a maintenance / upgrade on a previous project.</p>
        <p><strong>Project:</strong> ${originalJob.title}</p>
        <p><strong>What they need:</strong></p>
        <blockquote style="border-left:3px solid #7c3aed;padding:8px 16px;margin:12px 0;color:#555;">${description}</blockquote>
        <p>Please log in to your WorkSphere dashboard to review and quote a price.</p>
        <div style="text-align:center;margin-top:24px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Quote Your Price</a>
        </div>
      `;
      await sendProfessionalEmail(
        originalJob.selectedFreelancer.email,
        'WorkSphere – New Maintenance Request',
        '🔔 A client wants to hire you again',
        emailHtml
      );
    } catch (mailErr) {
      console.error('Rehire request email failed:', mailErr);
    }

    res.status(201).json({ message: 'Maintenance request sent to freelancer.', job: newJob });
  } catch (error) {
    console.error('Error creating rehire request:', error);
    res.status(500).json({ message: error.message });
  }
};

// Step 2 — Freelancer quotes a price or declines
exports.respondRehireRequest = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { action, proposedAmount } = req.body; // action: 'quote' | 'reject'

    const rehireJob = await Job.findById(jobId)
      .populate('client', 'name email')
      .populate('rehireTargetFreelancer', 'name email');

    if (!rehireJob) return res.status(404).json({ message: 'Rehire job not found.' });

    if (rehireJob.rehireTargetFreelancer?._id?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (rehireJob.rehireStatus !== 'pending_freelancer') {
      return res.status(400).json({ message: 'This request is not awaiting your response.' });
    }

    if (action === 'reject') {
      rehireJob.rehireStatus = 'rejected';
      await rehireJob.save();
      emitJobUpdate(req, [rehireJob.client._id]);
      // Email client
      try {
        const emailHtml = `
          <p>Hi ${rehireJob.client.name},</p>
          <p>Unfortunately, <strong>${rehireJob.rehireTargetFreelancer.name}</strong> is unable to take on the maintenance request for <strong>${rehireJob.title}</strong> at this time.</p>
        `;
        await sendProfessionalEmail(rehireJob.client.email, 'WorkSphere – Maintenance Request Declined', '❌ Freelancer declined your request', emailHtml);
      } catch (mailErr) { console.error('Reject email failed:', mailErr); }
      return res.json({ message: 'Maintenance request declined.' });
    }

    if (action === 'quote') {
      const amount = Number(proposedAmount);
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Please provide a valid quoted amount.' });
      }

      rehireJob.rehireStatus = 'pending_client'; // waiting for client to accept/reject
      rehireJob.rehireFreelancerAmount = amount;
      rehireJob.budget = amount; // update budget with quoted price
      await rehireJob.save();

      emitJobUpdate(req, [rehireJob.client._id]);

      // Email client
      try {
        const emailHtml = `
          <p>Hi ${rehireJob.client.name},</p>
          <p><strong>${rehireJob.rehireTargetFreelancer.name}</strong> has quoted a price for your maintenance request on <strong>${rehireJob.title}</strong>.</p>
          <p><strong>What you requested:</strong></p>
          <blockquote style="border-left:3px solid #7c3aed;padding:8px 16px;margin:12px 0;color:#555;">${rehireJob.rehireDescription}</blockquote>
          <p><strong>Freelancer's Quote:</strong> <span style="font-size:20px;font-weight:bold;color:#7c3aed;">₹${amount.toLocaleString('en-IN')}</span></p>
          <p>Please log in to accept or reject this quote.</p>
          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Review Quote</a>
          </div>
        `;
        await sendProfessionalEmail(
          rehireJob.client.email,
          'WorkSphere – Freelancer Quoted a Price',
          '💬 Your maintenance request has been quoted',
          emailHtml
        );
      } catch (mailErr) { console.error('Quote email failed:', mailErr); }

      return res.json({ message: 'Price quoted to client.', job: rehireJob });
    }

    res.status(400).json({ message: 'Invalid action. Use "quote" or "reject".' });
  } catch (error) {
    console.error('Error responding to rehire:', error);
    res.status(500).json({ message: error.message });
  }
};

// Step 3a — Client accepts the freelancer's quoted price → contract created
exports.acceptRehireCounter = async (req, res) => {
  try {
    const { jobId } = req.params;

    const rehireJob = await Job.findById(jobId)
      .populate('rehireTargetFreelancer', 'name email')
      .populate('client', 'name email');

    if (!rehireJob) return res.status(404).json({ message: 'Rehire job not found.' });

    if (rehireJob.client._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (rehireJob.rehireStatus !== 'pending_client') {
      return res.status(400).json({ message: 'No pending quote to accept.' });
    }

    const finalAmount = rehireJob.rehireFreelancerAmount;

    rehireJob.rehireStatus = 'accepted';
    rehireJob.acceptedPrice = finalAmount;
    rehireJob.budget = finalAmount;
    rehireJob.selectedFreelancer = rehireJob.rehireTargetFreelancer._id;
    rehireJob.status = 'in-progress';
    await rehireJob.save();

    // Create bid record for audit trail
    await Bid.create({
      job: rehireJob._id,
      freelancer: rehireJob.rehireTargetFreelancer._id,
      amount: finalAmount,
      proposal: `Maintenance quote accepted. Work: ${rehireJob.rehireDescription}`,
      status: 'accepted'
    });

    emitJobUpdate(req, [rehireJob.client._id, rehireJob.rehireTargetFreelancer._id]);

    // Email freelancer — quote accepted
    try {
      const emailHtml = `
        <p>Hi ${rehireJob.rehireTargetFreelancer.name},</p>
        <p><strong>${rehireJob.client.name}</strong> has accepted your quote of <strong>₹${finalAmount.toLocaleString('en-IN')}</strong> for <strong>${rehireJob.title}</strong>.</p>
        <p>The client will now fund the project escrow. You'll receive a notification once funds are secured and work can begin.</p>
      `;
      await sendProfessionalEmail(
        rehireJob.rehireTargetFreelancer.email,
        'WorkSphere – Your Quote Was Accepted!',
        '✅ Client accepted your maintenance quote',
        emailHtml
      );
    } catch (mailErr) { console.error('Accept quote email failed:', mailErr); }

    res.json({ message: 'Quote accepted. Proceed to payment.', job: rehireJob });
  } catch (error) {
    console.error('Error accepting rehire quote:', error);
    res.status(500).json({ message: error.message });
  }
};

// Step 3b — Client rejects the freelancer's quoted price
exports.rejectRehireCounter = async (req, res) => {
  try {
    const { jobId } = req.params;

    const rehireJob = await Job.findById(jobId)
      .populate('rehireTargetFreelancer', 'name email')
      .populate('client', 'name email');

    if (!rehireJob) return res.status(404).json({ message: 'Rehire job not found.' });
    if (rehireJob.client._id.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
    if (rehireJob.rehireStatus !== 'pending_client') return res.status(400).json({ message: 'No pending quote to reject.' });

    rehireJob.rehireStatus = 'rejected';
    await rehireJob.save();

    emitJobUpdate(req, [rehireJob.rehireTargetFreelancer._id]);

    // Email freelancer
    try {
      const emailHtml = `
        <p>Hi ${rehireJob.rehireTargetFreelancer.name},</p>
        <p>${rehireJob.client.name} has decided not to proceed with the quoted price of ₹${rehireJob.rehireFreelancerAmount?.toLocaleString('en-IN')} for <strong>${rehireJob.title}</strong>.</p>
      `;
      await sendProfessionalEmail(rehireJob.rehireTargetFreelancer.email, 'WorkSphere – Quote Not Accepted', '❌ Client did not accept your quote', emailHtml);
    } catch (mailErr) { console.error('Reject quote email failed:', mailErr); }

    res.json({ message: 'Quote rejected.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// kept for backward compat
exports.rehireFreelancer = exports.createRehireRequest;

exports.generateProposal = async (req, res) => {
  try {
    const { jobId } = req.body;
    const user = req.user;

    if (user.role !== 'freelancer' || user.subscriptionPlan !== 'advanced') {
      return res.status(403).json({ message: 'Only Pro freelancers can use Magic AI Proposal' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Assuming we have the freelancer's data from req.user
    const aiPayload = {
      job_title: job.title,
      job_description: job.description,
      freelancer_name: user.name,
      freelancer_skills: user.skills || []
    };

    const response = await axios.post('http://localhost:8000/generate-proposal', aiPayload);
    res.json({ proposal: response.data.proposal });
  } catch (error) {
    console.error('Error generating AI proposal:', error.message);
    res.status(500).json({ message: 'Failed to generate proposal from AI service' });
  }
};
