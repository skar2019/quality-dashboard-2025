import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import JiraSprintIssues from '../src/models/jiraSprintIssues';
import JiraSprint from '../src/models/jiraSprint';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not found in .env file.');
  process.exit(1);
}

const clearJiraData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Successfully connected to MongoDB.');

    // Delete all JIRA Master Data
    const dataResult = await JiraSprintIssues.deleteMany({});
    console.log(`Deleted ${dataResult.deletedCount} JiraSprintIssues documents.`);

    // Delete all JIRA Master Reports
    const reportResult = await JiraSprint.deleteMany({});
    console.log(`Deleted ${reportResult.deletedCount} JiraSprint documents.`);

    console.log('All JIRA Master Data and Reports have been cleared.');
  } catch (error) {
    console.error('Error clearing JIRA data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

clearJiraData(); 