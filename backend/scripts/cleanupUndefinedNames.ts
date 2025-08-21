import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/users';

// Load environment variables
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not found in .env file.');
  process.exit(1);
}

const cleanupUndefinedNames = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Find users with undefined names
    const usersWithUndefinedNames = await User.find({ name: undefined });
    
    console.log(`\n🔍 Found ${usersWithUndefinedNames.length} users with undefined names:`);
    
    if (usersWithUndefinedNames.length > 0) {
      usersWithUndefinedNames.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email} | UserType: ${user.userType} | ID: ${user.id}`);
      });

      // Delete users with undefined names
      const deleteResult = await User.deleteMany({ name: undefined });
      console.log(`\n✅ Deleted ${deleteResult.deletedCount} users with undefined names.`);
    } else {
      console.log('No users with undefined names found.');
    }

    // Show remaining admin users
    console.log('\n📋 Remaining admin users:');
    const remainingAdmins = await User.find({ 
      userType: { $in: ['super_admin', 'project_admin'] } 
    }).select('-password');
    
    remainingAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Name: ${admin.name} | Email: ${admin.email} | Role: ${admin.userType}`);
    });
    
  } catch (error) {
    console.error('Error cleaning up undefined names:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

cleanupUndefinedNames(); 