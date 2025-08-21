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

const testCreateAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Test data
    const testAdminData = {
      id: uuidv4(),
      name: 'Test Admin User',
      email: 'testadmin@example.com',
      password: 'test123',
      userType: 'project_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('\n📝 Test data to be saved:');
    console.log(JSON.stringify(testAdminData, null, 2));

    // Create new admin using the same logic as the controller
    const newAdmin = new User(testAdminData);
    
    console.log('\n🔍 User model before save:');
    console.log('Name:', newAdmin.name);
    console.log('Email:', newAdmin.email);
    console.log('UserType:', newAdmin.userType);

    await newAdmin.save();

    console.log('\n✅ Admin saved successfully!');
    console.log('🔍 User model after save:');
    console.log('Name:', newAdmin.name);
    console.log('Email:', newAdmin.email);
    console.log('UserType:', newAdmin.userType);

    // Fetch the user from database to verify
    const savedAdmin = await User.findOne({ email: 'testadmin@example.com' });
    console.log('\n🔍 User fetched from database:');
    console.log('Name:', savedAdmin?.name);
    console.log('Email:', savedAdmin?.email);
    console.log('UserType:', savedAdmin?.userType);

    // Clean up - delete the test user
    await User.deleteOne({ email: 'testadmin@example.com' });
    console.log('\n🧹 Test user cleaned up from database.');
    
  } catch (error) {
    console.error('Error testing admin creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
};

testCreateAdmin(); 