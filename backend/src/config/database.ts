import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/quality-dashboard';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Successfully disconnected from MongoDB.');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}; 