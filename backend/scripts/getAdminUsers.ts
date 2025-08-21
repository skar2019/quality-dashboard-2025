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

const getAdminUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Get all admin users (super_admin and project_admin)
    const adminUsers = await User.find({ 
      userType: { $in: ['super_admin', 'project_admin'] } 
    }).select('-password');

    console.log(`\n📋 Found ${adminUsers.length} admin users in database:`);
    console.log('=' .repeat(60));
    
    if (adminUsers.length === 0) {
      console.log('No admin users found in database.');
    } else {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}.`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   UserType: ${admin.userType}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log(`   Updated: ${admin.updatedAt}`);
        console.log('   ' + '-'.repeat(40));
      });
    }

    // Also get all users to see the full picture
    const allUsers = await User.find({}).select('-password');
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    console.log('All users by type:');
    const userTypes = {};
    allUsers.forEach(user => {
      userTypes[user.userType] = (userTypes[user.userType] || 0) + 1;
    });
    Object.entries(userTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} users`);
    });
    
  } catch (error) {
    console.error('Error getting admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

getAdminUsers(); 