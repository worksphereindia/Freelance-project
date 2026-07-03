const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const User = require('../models/User');
const { decrypt } = require('../utils/crypto');
const { sendEmail } = require('../utils/email');
const axios = require('axios');

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

    const jobs = await Job.find({ status: 'open', isApproved: true })
      .populate('client', 'name companyName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments({ status: 'open', isApproved: true });

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
      const bids = await Bid.find({ freelancer: req.user.id }).populate({
        path: 'job',
        populate: { path: 'client', select: 'name companyName' }
      });
      const jobs = bids.map(bid => bid.job).filter(job => job != null);
      const uniqueJobs = Array.from(new Set(jobs.map(j => j._id.toString())))
        .map(id => jobs.find(j => j._id.toString() === id))
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
    const { name, url, type, size, storagePath } = req.body;

    if (!name || !url) {
      return res.status(400).json({ message: 'Asset name and url are required.' });
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

    // Basic validation
    if (size && Number(size) > MAX_ASSET_BYTES) {
      return res.status(400).json({ message: 'File exceeds the 25 MB limit.' });
    }
    const ext = name.split('.').pop().toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ message: `Files of type .${ext} are not allowed.` });
    }

    const asset = {
      name,
      url,
      type: type || '',
      size: size ? Number(size) : undefined,
      storagePath: storagePath || '',
      uploadedBy: req.user.id,
      createdAt: new Date()
    };

    job.assets.push(asset);
    await job.save();

    // Notify the freelancer that a new asset is available (best-effort)
    try {
      const freelancer = await User.findById(job.selectedFreelancer).select('email');
      if (freelancer && freelancer.email) {
        sendEmail(
          freelancer.email,
          `New project asset shared — "${job.title}"`,
          `The client has shared a new file ("${name}") for the project "${job.title}". Log in to download it from the Assets panel.`,
          `<div style="font-family:sans-serif;padding:20px">
             <h2>New Project Asset</h2>
             <p>The client has shared a new file for <strong>"${job.title}"</strong>.</p>
             <p>Open the <strong>Assets</strong> panel in your project chat to download it.</p>
           </div>`
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

    res.json({ message: 'Asset removed successfully', assetId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
