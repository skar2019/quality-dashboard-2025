import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JiraSprint from '../src/models/jiraSprint';
import JiraSprintIssues from '../src/models/jiraSprintIssues';

// Load environment variables
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL not found in .env file.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URL!);
  console.log('Connected to MongoDB');

  const reports = await JiraSprint.find({ projectId: "yourProjectId" }).sort({ importedAt: -1 }).limit(5).lean();
  console.log('--- 5 Most Recent JiraSprint Documents ---');
  reports.forEach((r, i) => {
    console.log(`Report #${i + 1}:`, r);
  });

  const datas = await JiraSprintIssues.find().sort({ created: -1 }).limit(5).lean();
  console.log('--- 5 Most Recent JiraSprintIssues Documents ---');
  datas.forEach((d, i) => {
    console.log(`Data #${i + 1}:`, d);
  });

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 