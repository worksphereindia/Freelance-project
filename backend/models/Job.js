const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, required: true }, // in INR
    skills: [{ type: String, required: true }],
    category: { type: String, required: true, default: 'Web Design' },
    isApproved: { type: Boolean, default: false },
    status: {
    type: String,
    enum: ['open', 'in-progress', 'delivered', 'completed', 'cancelled', 'disputed'],
    default: 'open'
  },
    deliverableLink: { type: String },
    // Assets shared by the client with the hired freelancer (files live in Firebase Storage)
    assets: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String },
        size: { type: Number }, // bytes
        storagePath: { type: String }, // Firebase Storage path (for deletion reference)
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    selectedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedFreelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    acceptedPrice: { type: Number },
    paymentStatus: { type: String, enum: ['pending', 'escrow_funded', 'released', 'refunded'], default: 'pending' },

    // Rehire / Maintenance negotiation fields
    isRehire: { type: Boolean, default: false },
    rehireOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // original job reference
    rehireStatus: {
      type: String,
      enum: ['none', 'pending_freelancer', 'pending_client', 'accepted', 'rejected'],
      default: 'none'
    },
    rehireDescription: { type: String },
    rehireClientOffer: { type: Number }, // amount client proposed
    rehireFreelancerAmount: { type: Number }, // amount freelancer counter-proposed
    rehireTargetFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // freelancer being rehired
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);

