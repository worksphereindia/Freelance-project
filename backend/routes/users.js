const express = require('express');
const User = require('../models/User');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const { protect } = require('../middleware/auth');
const router = express.Router();
const Razorpay = require('razorpay');
const { sendEmail, sendProfessionalEmail } = require('../utils/email');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

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

    const basePrice = plan === 'advanced' ? 150 : 50;
    const taxAmount = basePrice * 0.02; // 2% GST
    const totalAmount = basePrice + taxAmount;

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'mock') {
      const mockOrderId = `mock_order_${Math.random().toString(36).substring(7)}`;
      await SubscriptionPayment.create({
        user: req.user.id,
        plan,
        amount: totalAmount,
        taxAmount,
        basePrice,
        razorpayOrderId: mockOrderId,
        status: 'created'
      });
      return res.json({ 
        isMock: true, 
        order: { id: mockOrderId, amount: totalAmount * 100 },
        plan, 
        amount: totalAmount 
      });
    }

    const options = {
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt: `sub_${req.user.id.substring(0, 10)}_${Date.now().toString().slice(-8)}`
    };

    const order = await razorpay.orders.create(options);
    
    await SubscriptionPayment.create({
      user: req.user.id,
      plan,
      amount: totalAmount,
      taxAmount,
      basePrice,
      razorpayOrderId: order.id,
      status: 'created'
    });

    res.json({ isMock: false, order, plan, amount: totalAmount });
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

    // Mark subscription payment as completed
    const subPayment = await SubscriptionPayment.findOne({ razorpayOrderId: razorpay_order_id });
    if (subPayment) {
      subPayment.status = 'completed';
      subPayment.razorpayPaymentId = razorpay_payment_id || 'mock_payment_id';
      await subPayment.save();
    }

    // Send professional email receipt
    try {
      const basePrice = subPayment ? subPayment.basePrice : (plan === 'advanced' ? 150 : 50);
      const tax = subPayment ? subPayment.taxAmount : (basePrice * 0.02);
      const total = subPayment ? subPayment.amount : (basePrice + tax);

      const emailHtml = `
          <p>Hi ${user.name},</p>
          <p>Thank you for subscribing to the <strong>${plan.toUpperCase()} Plan</strong>.</p>
          <p>Your subscription is active and will automatically renew on <strong>${user.subscriptionExpiry.toDateString()}</strong>.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Subscription Receipt</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">Plan</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${plan.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">Base Price</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${basePrice.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569;">GST (2%)</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 16px; color: #0f172a;">Total Paid</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; font-size: 16px; color: #2563eb;">₹${total.toFixed(2)}</td>
              </tr>
            </table>
            <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center;">Order ID: ${razorpay_order_id}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.VITE_API_URL || 'http://localhost:5173'}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
      `;
      
      await sendProfessionalEmail(user.email, 'WorkSphere Subscription Receipt', `Subscription Confirmed! 🎉`, emailHtml);
    } catch (mailErr) {
      console.error('Failed to send subscription email:', mailErr);
    }

    res.json({ message: 'Subscription successful', user });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error while verifying subscription.' });
  }
});

// POST /api/users/profile-picture
router.post('/profile-picture', protect, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    // Convert the memory buffer to a base64 data URL
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${b64}`;

    // Update user profile picture
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = imageUrl;
    await user.save();

    res.json({ message: 'Profile picture updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to upload profile picture.' });
  }
});

module.exports = router;
