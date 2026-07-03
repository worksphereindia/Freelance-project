const mongoose = require('mongoose');

// Records destructive / sensitive admin actions for accountability
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String },
    action: { type: String, required: true }, // e.g. 'delete_user', 'delete_job', 'resolve_dispute', 'revoke_freelancer'
    targetType: { type: String }, // 'user' | 'job' | 'payment'
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String }, // human-readable name/title at time of action
    details: { type: String } // extra context (e.g. dispute outcome, cascade counts)
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminLog', adminLogSchema);
