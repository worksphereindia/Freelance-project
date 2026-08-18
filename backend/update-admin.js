require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

// --- UPDATE THESE DETAILS ---
const NEW_ADMIN_EMAIL = 'admin@worksphere';
const NEW_ADMIN_PASSWORD = 'admin@worksphere26';
const NEW_ADMIN_NAME = 'Super Admin';
// ----------------------------

const updateAdmin = async () => {
  try {
    console.log('Connecting to database...');
    // Uses the MONGO_URI from your .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB successfully.');

    // Check if an admin already exists
    let admin = await User.findOne({ role: 'admin' });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, salt);

    if (admin) {
      console.log(`Found existing admin with email: ${admin.email}`);
      admin.email = NEW_ADMIN_EMAIL;
      admin.password = hashedPassword;
      admin.name = NEW_ADMIN_NAME;
      admin.isVerified = true;
      admin.isProfileComplete = true;
      
      await admin.save();
      console.log(`Successfully updated existing admin credentials to: ${NEW_ADMIN_EMAIL}`);
    } else {
      console.log('No existing admin found. Creating a new admin user...');
      admin = await User.create({
        name: NEW_ADMIN_NAME,
        email: NEW_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isProfileComplete: true
      });
      console.log(`Successfully created new admin user with email: ${NEW_ADMIN_EMAIL}`);
    }

    console.log('Done! You can now log in with the new credentials.');
  } catch (error) {
    console.error('Error updating admin:', error);
  } finally {
    process.exit(0);
  }
};

updateAdmin();
