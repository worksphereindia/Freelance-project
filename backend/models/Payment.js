const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    amount: { type: Number, required: true }, // Total amount in INR
    platformFee: { type: Number, required: true }, // 5% fee
    freelancerAmount: { type: Number, required: true }, // 95% to freelancer
    status: { type: String, enum: ['created', 'escrow_funded', 'released', 'refunded'], default: 'created' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
