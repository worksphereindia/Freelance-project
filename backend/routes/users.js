const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();
const Razorpay = require('razorpay');
const { sendEmail, sendProfessionalEmail } = require('../utils/email');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock',
});

// GET /api/users/freelancers
router.get('/freelancers', protect, async (req, res) => {
  try {
    const freelancers = await User.find({
      role: 'freelancer',
      isFreelancerApproved: true
    }).select('-password -otp -otpExpires -upiId -bankAccount');
    
    res.json(freelancers);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching freelancers' });
  }
});

// POST /api/users/subscribe (Creates Order)
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['basic', 'advanced'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid subscription plan.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can subscribe.' });
    }

    const amount = plan === 'advanced' ? 150 : 50;

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'mock') {
      return res.json({ 
        isMock: true, 
        order: { id: `mock_order_${Math.random().toString(36).substring(7)}`, amount: amount * 100 },
        plan, 
        amount 
      });
    }

    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: `sub_${req.user.id.substring(0, 10)}_${Date.now().toString().slice(-8)}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ isMock: false, order, plan, amount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating subscription order.' });
  }
});

// POST /api/users/verify-subscription
router.post('/verify-subscription', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    
    if (!['basic', 'advanced'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid subscription plan.' });
    }

    const user = await User.findById(req.user.id);
    user.subscriptionPlan = plan;
    user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.bidsThisMonth = 0; // reset
    await user.save();

    // Send professional email
    try {
      const emailHtml = `
          <p>Hi ${user.name},</p>
          <p>You have successfully subscribed to the <strong>${plan.toUpperCase()} Plan</strong>.</p>
          <p>Your subscription is active and will automatically renew on <strong>${user.subscriptionExpiry.toDateString()}</strong>.</p>
          <ul style="padding-left: 20px;">
            <li><strong>Plan:</strong> ${plan.toUpperCase()} Plan</li>
            <li><strong>Bids Allowed:</strong> ${plan === 'basic' ? '3 per month' : 'Unlimited'}</li>
            <li><strong>Valid Until:</strong> ${user.subscriptionExpiry.toDateString()}</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.VITE_API_URL || 'http://localhost:5173'}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
      `;
      
      await sendProfessionalEmail(user.email, 'WorkSphere Subscription Confirmed', `Subscription Confirmed! 🎉`, emailHtml);
    } catch (mailErr) {
      console.error('Failed to send subscription email:', mailErr);
    }

    res.json({ message: 'Subscription successful', user });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error while verifying subscription.' });
  }
});

module.exports = router;
