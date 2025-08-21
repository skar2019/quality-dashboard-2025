import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/users';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not found in .env file.');
  process.exit(1);
}

const resetAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Delete all admin users (super_admin and project_admin)
    const deleteResult = await User.deleteMany({ 
      userType: { $in: ['super_admin', 'project_admin'] } 
    });
    console.log(`Deleted ${deleteResult.deletedCount} admin users.`);

    // Create new super admin user
    const newSuperAdmin = new User({
      id: uuidv4(),
      name : 'Super Admin',
      email: 'qd@adobe.com',
      password: '111111',
      userType: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newSuperAdmin.save();
    console.log('New super admin user created successfully!');
    console.log('Email: qd@adobe.com');
    console.log('Password: 111111');
    console.log('UserType: super_admin');

    // Create additional admin user
    const newAdmin = new User({
      id: uuidv4(),
      name : 'Suman kar',
      email: 'skar@adobe.com',
      password: '111111',
      userType: 'project_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newAdmin.save();
    console.log('\nAdditional admin user created successfully!');
    console.log('Email: skar@adobe.com');
    console.log('Password: 111111');
    console.log('UserType: admin');
    
  } catch (error) {
    console.error('Error resetting admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

resetAdmin(); 