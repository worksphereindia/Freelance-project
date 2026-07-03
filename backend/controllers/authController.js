const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { encrypt } = require('../utils/crypto');
const { sendEmail, sendProfessionalEmail } = require('../utils/email');

const generateToken = (user) => {
  return jwt.sign({ 
    id: user._id || user.id, 
    role: user.role, 
    isProfileComplete: user.isProfileComplete, 
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profilePicture: user.profilePicture
  }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, skills, companyName, upiId, phoneNumber } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { name }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or name already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt sensitive info
    const encryptedUpi = upiId ? encrypt(upiId) : undefined;

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      skills,
      companyName,
      upiId: encryptedUpi,
      phoneNumber,
      otp,
      otpExpires
    });

    if (user) {
      // Send OTP via email
      await sendProfessionalEmail(
        user.email,
        "Your Verification Code",
        "Email Verification",
        `<p>Your OTP for verifying your WorkSphere account is:</p>
         <h2 style="letter-spacing: 5px; font-size: 32px; color: #2563eb; text-align: center;">${otp}</h2>
         <p style="text-align: center;">This code expires in 10 minutes.</p>`
      );

      res.status(201).json({
        message: 'User registered. Please verify OTP sent to email.',
        email: user.email
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    
    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // The 'email' field from the frontend can be either email or name
    const user = await User.findOne({ $or: [{ email }, { name: email }] });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email first', email: user.email, requireVerification: true });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
        profilePicture: user.profilePicture,
        token: generateToken(user),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      // Don't create the user yet, return 202 requiring role selection
      return res.status(202).json({
        requiresRole: true,
        name,
        email,
        photoURL
      });
    }

    // Update photo URL if provided and user doesn't have one
    if (photoURL && !user.profilePicture) {
      user.profilePicture = photoURL;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      profilePicture: user.profilePicture,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const { skills, portfolioUrl, phoneNumber, upiId, bankAccount, location, experience } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.skills = skills || user.skills;
    user.portfolioUrl = portfolioUrl;
    user.phoneNumber = phoneNumber;
    if (location) user.location = location;
    if (experience) user.experience = experience;
    if (upiId) user.upiId = encrypt(upiId);
    if (bankAccount) user.bankAccount = encrypt(bankAccount);
    
    user.isProfileComplete = true;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      profilePicture: user.profilePicture,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleComplete = async (req, res) => {
  try {
    const { name, email, role, photoURL } = req.body;
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);
    
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role, 
      authProvider: 'google',
      isVerified: true,
      profilePicture: photoURL
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      profilePicture: user.profilePicture,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { companyName, phoneNumber, skills, portfolioUrl, location, experience } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (location) user.location = location;
    
    if (user.role === 'client') {
      if (companyName) user.companyName = companyName;
    } else if (user.role === 'freelancer') {
      if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean);
      if (portfolioUrl) user.portfolioUrl = portfolioUrl;
      if (experience) user.experience = experience;
    }
    
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      profilePicture: user.profilePicture,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    await sendEmail(
      user.email,
      "Your Password Reset Verification Code",
      `Your password reset OTP is: ${otp}. It expires in 10 minutes.`
    );

    res.json({ message: 'OTP sent to registered email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;

    // Mark as verified if they reset their password via OTP successfully
    if (!user.isVerified) {
      user.isVerified = true;
    }

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
