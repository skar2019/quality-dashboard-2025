import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/users.ts'; // Use .ts extension with tsx
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Load environment variables from .env file in the current working directory (backend/)
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not found in .env file. Please ensure it is set correctly in backend/.env');
  process.exit(1);
}

const dummyUsers = [
  {
    id: uuidv4(),
    name: 'Test User',
    email: 'test@example.com',
    password: 'test123', // Reminder: Storing plaintext passwords is a security risk.
    userType: 'user',
  },
  {
    id: uuidv4(),
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    userType: 'project_admin',
  },
  {
    id: uuidv4(),
    name: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'super123',
    userType: 'super_admin',
  },
];

const seedDatabase = async () => {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URL.split('@')[1] ? MONGO_URL.split('@')[1].split('/')[0] : 'your configured URL'}...`); // Obfuscate credentials in log
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Optional: Clear existing users if you want a fresh start each time
    // await User.deleteMany({});
    // console.log('Cleared existing users.');

    for (const userData of dummyUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User with email ${userData.email} already exists. Skipping.`);
      } else {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${user.email} (${user.userType})`);
      }
    }

    console.log('Database seeded successfully with dummy users.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

seedDatabase(); 