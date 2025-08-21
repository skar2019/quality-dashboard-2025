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

const addUser = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'skar@adobe.com' });
    if (existingUser) {
      console.log('User skar@adobe.com already exists.');
      return;
    }

    // Create new user
    const newUser = new User({
      id: uuidv4(),
      name: 'Suman Kar',
      email: 'skar@adobe.com',
      password: '111111',
      userType: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();
    console.log('User skar@adobe.com created successfully!');
    
  } catch (error) {
    console.error('Error adding user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

addUser(); 