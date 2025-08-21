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

const checkUser = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Find the user
    const user = await User.findOne({ email: 'skar@adobe.com' });
    if (user) {
      console.log('User found:');
      console.log('ID:', user.id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Password:', user.password);
      console.log('UserType:', user.userType);
      console.log('CreatedAt:', user.createdAt);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

checkUser(); 