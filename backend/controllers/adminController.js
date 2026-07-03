const User = require('../models/User');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const ContactMessage = require('../models/ContactMessage');
const Violation = require('../models/Violation');
const Bid = require('../models/Bid');
const Review = require('../models/Review');
const AdminLog = require('../models/AdminLog');
const { decrypt } = require('../utils/crypto');
const { sendEmail } = require('../utils/email');

// Records a destructive/sensitive admin action (best-effort; never blocks the action)
const logAdminAction = async (req, { action, targetType, targetId, targetLabel, details }) => {
  try {
    await AdminLog.create({
      admin: req.user?.id,
      adminName: req.user?.name || 'Admin',
      action,
      targetType,
      targetId,
      targetLabel,
      details
    });
  } catch (err) {
    console.error('Failed to write admin audit log:', err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const jobCount = await Job.countDocuments();
    const paymentCount = await Payment.countDocuments();

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const jobs = await Job.find()
      .populate('client', 'name')
      .populate('selectedFreelancer', 'name')
      .sort({ createdAt: -1 });
    const payments = await Payment.find()
      .populate('client', 'name')
      .populate('freelancer', 'name')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    // Financial Metrics
    const fundedPayments = payments.filter(p => p.status === 'escrow_funded' || p.status === 'released');
    const totalEscrowVolume = fundedPayments.reduce((acc, p) => acc + p.amount, 0);
    const platformFees = fundedPayments.reduce((acc, p) => acc + (p.platformFee || 0), 0);

    // Job Status counts
    const jobsStatus = {
      open: jobs.filter(j => j.status === 'open').length,
      inProgress: jobs.filter(j => j.status === 'in-progress').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      delivered: jobs.filter(j => j.status === 'delivered').length,
      pendingApproval: jobs.filter(j => !j.isApproved).length
    };

    res.json({ 
      userCount, 
      jobCount, 
      paymentCount,
      totalEscrowVolume,
      platformFees,
      users, 
      jobs,
      payments,
      jobsStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Guard: never delete an admin or yourself
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted.' });
    }
    if (id === req.user.id) {
      return res.status(403).json({ message: 'You cannot delete your own account.' });
    }

    // Guard: refuse if the user has funds locked in active escrow
    const activeEscrow = await Payment.countDocuments({
      $or: [{ client: id }, { freelancer: id }],
      status: 'escrow_funded'
    });
    if (activeEscrow > 0) {
      return res.status(400).json({
        message: 'Cannot delete: this user has active escrow funds. Resolve or release those payments first.'
      });
    }

    // Cascade clean-up of related records
    const jobs = await Job.find({ client: id }).select('_id');
    const jobIds = jobs.map(j => j._id);

    const [delJobs, delBidsOfJobs, delBidsByUser, delPayments, delMessages, delViolations, delReviews] = await Promise.all([
      Job.deleteMany({ client: id }),
      Bid.deleteMany({ job: { $in: jobIds } }),
      Bid.deleteMany({ freelancer: id }),
      Payment.deleteMany({ $or: [{ client: id }, { freelancer: id }, { job: { $in: jobIds } }] }),
      Message.deleteMany({ $or: [{ sender: id }, { receiver: id }, { job: { $in: jobIds } }] }),
      Violation.deleteMany({ $or: [{ sender: id }, { receiver: id }, { job: { $in: jobIds } }] }),
      Review.deleteMany({ $or: [{ client: id }, { freelancer: id }, { job: { $in: jobIds } }] })
    ]);

    await User.findByIdAndDelete(id);

    const details = `Cascade removed ${delJobs.deletedCount} jobs, ${delBidsOfJobs.deletedCount + delBidsByUser.deletedCount} bids, ${delPayments.deletedCount} payments, ${delMessages.deletedCount} messages, ${delViolations.deletedCount} violations, ${delReviews.deletedCount} reviews.`;
    await logAdminAction(req, {
      action: 'delete_user',
      targetType: 'user',
      targetId: id,
      targetLabel: `${user.name} (${user.role})`,
      details
    });

    res.json({ message: 'User and related records removed', details });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Guard: refuse if this job has funds locked in active escrow
    const activeEscrow = await Payment.countDocuments({ job: id, status: 'escrow_funded' });
    if (activeEscrow > 0) {
      return res.status(400).json({
        message: 'Cannot delete: this job has active escrow funds. Resolve the payment first.'
      });
    }

    const [delBids, delPayments, delMessages, delViolations, delReviews] = await Promise.all([
      Bid.deleteMany({ job: id }),
      Payment.deleteMany({ job: id }),
      Message.deleteMany({ job: id }),
      Violation.deleteMany({ job: id }),
      Review.deleteMany({ job: id })
    ]);

    await Job.findByIdAndDelete(id);

    const details = `Cascade removed ${delBids.deletedCount} bids, ${delPayments.deletedCount} payments, ${delMessages.deletedCount} messages, ${delViolations.deletedCount} violations, ${delReviews.deletedCount} reviews.`;
    await logAdminAction(req, {
      action: 'delete_job',
      targetType: 'job',
      targetId: id,
      targetLabel: job.title,
      details
    });

    res.json({ message: 'Job and related records removed', details });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveFreelancer = async (req, res) => {
  try {
    const { adminRating } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isFreelancerApproved = true;
    if (adminRating !== undefined) {
      user.adminRating = Number(adminRating);
    }
    await user.save();
    res.json({ message: 'Freelancer approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.revokeFreelancer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isFreelancerApproved = false;
    await user.save();
    await logAdminAction(req, {
      action: 'revoke_freelancer',
      targetType: 'user',
      targetId: user._id,
      targetLabel: user.name,
      details: 'Freelancer approval revoked'
    });
    res.json({ message: 'Freelancer approval revoked', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, refundClient } = req.body;
    
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.status !== 'disputed') {
      return res.status(400).json({ message: 'Job is not disputed' });
    }

    const payment = await Payment.findOne({ job: id });

    if (refundClient) {
      // Logic to refund via Razorpay would go here.
      job.status = 'cancelled';
      job.paymentStatus = 'refunded';
      if (payment) {
        payment.status = 'refunded';
        await payment.save();
      }
    } else {
      job.status = 'completed';
      job.paymentStatus = 'released';
      if (payment) {
        payment.status = 'released';
        await payment.save();
      }
    }

    await job.save();
    await logAdminAction(req, {
      action: 'resolve_dispute',
      targetType: 'job',
      targetId: job._id,
      targetLabel: job.title,
      details: refundClient ? 'Refunded client (job cancelled)' : 'Released funds to freelancer (job completed)'
    });
    res.json({ message: `Dispute resolved. Action: ${refundClient ? 'Refunded Client' : 'Paid Freelancer'}`, job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDisputeMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({ job: id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name')
      .populate('receiver', 'name');

    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      content: decrypt(msg.content)
    }));

    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resolveContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    message.status = 'resolved';
    await message.save();
    res.json({ message: 'Contact message resolved', data: message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.replyContactMessage = async (req, res) => {
  try {
    const { replyText } = req.body;
    const message = await ContactMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    await sendEmail(
      message.email,
      `Re: ${message.subject}`,
      `Hello ${message.name || 'User'},\n\nRegarding your inquiry: "${message.subject}"\n\nAdmin Reply:\n${replyText}\n\nBest Regards,\nWorkOwn Team`
    );

    message.status = 'resolved';
    await message.save();
    res.json({ message: 'Reply sent and message resolved', data: message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getViolations = async (req, res) => {
  try {
    const violations = await Violation.find()
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    const decryptedViolations = violations.map(v => {
      let originalContent = 'Could not decrypt';
      try {
        originalContent = decrypt(v.originalMessage);
      } catch (err) {
        console.warn('Failed to decrypt violation message:', err.message);
      }
      return {
        ...v.toObject(),
        originalMessage: originalContent
      };
    });

    res.json(decryptedViolations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate('admin', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
