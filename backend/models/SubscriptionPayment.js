const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['basic', 'pro'], required: true },
    amount: { type: Number, required: true }, // Total amount including GST in INR
    taxAmount: { type: Number, required: true }, // GST amount
    basePrice: { type: Number, required: true }, // Base price without GST
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['created', 'completed', 'failed'], default: 'created' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
