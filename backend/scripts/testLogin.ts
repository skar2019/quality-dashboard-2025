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

const testLogin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    const email = 'skar@adobe.com';
    const password = '111111';

    console.log('Testing login with:', { email, password });

    // Test the exact query from the login function
    const user = await User.findOne({ email, password });
    
    if (user) {
      console.log('Login successful!');
      console.log('User found:', {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType
      });
    } else {
      console.log('Login failed - user not found');
      
      // Let's check what users exist
      const allUsers = await User.find({});
      console.log('All users in database:');
      allUsers.forEach(u => {
        console.log(`- ${u.email} (${u.password}) - ${u.userType}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

testLogin(); 