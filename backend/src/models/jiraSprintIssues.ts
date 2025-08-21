import mongoose, { Schema, Document } from 'mongoose';

export interface IJiraSprintIssues extends Document {
  masterReportId: mongoose.Types.ObjectId;
  issueKey: string;
  summary: string;
  issueType: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  created: Date;
  updated: Date;
  resolution: string;
  description: string;
  raw?: any;
}

const JiraSprintIssuesSchema: Schema = new Schema({
  masterReportId: { type: Schema.Types.ObjectId, ref: 'JiraSprint', required: true },
  issueKey: { type: String, required: true },
  summary: { type: String, required: true },
  issueType: { type: String, required: true },
  status: { type: String, required: true },
  priority: { type: String, required: true },
  assignee: { type: String, required: true },
  reporter: { type: String, required: true },
  created: { type: Date, required: true },
  updated: { type: Date, required: true },
  resolution: { type: String, required: true },
  description: { type: String, required: true },
  raw: { type: Schema.Types.Mixed }
});

export default mongoose.model<IJiraSprintIssues>('JiraSprintIssues', JiraSprintIssuesSchema); 