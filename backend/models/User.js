const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    authProvider: {
      type: String,
      default: 'email',
      enum: ['email', 'google']
    },
    profilePicture: { type: String },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], required: true },
    phoneNumber: { type: String },
    
    // Freelancer specific
    skills: [{ type: String }],
    portfolio: [{ type: String }], // URLs to portfolio items
    experience: { type: String },
    location: { type: String },
    rating: { type: Number, default: 0 },
    adminRating: { type: Number, default: 0 },
    profileCompleteness: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    
    // Client specific
    companyName: { type: String },
    
    // Payment specific
    upiId: { type: String }, // Encrypted
    bankAccount: { type: String }, // Encrypted
    
    isFlagged: { type: Boolean, default: false },
    violationCount: { type: Number, default: 0 }, // blocked contact-sharing attempts
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // Freelancer specific completeness
    isProfileComplete: { type: Boolean, default: false },
    isFreelancerApproved: { type: Boolean, default: false },
    phoneNumber: { type: String },
    portfolioUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
