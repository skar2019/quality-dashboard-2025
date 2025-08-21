import mongoose, { Schema, Document } from 'mongoose';

export interface IJiraSprintIssues extends Document {
  importBatchId?: mongoose.Types.ObjectId;
  projectId: string;
  sprint: string;
  reportType: string;
  startDate: Date;
  endDate: Date;
  importedAt: Date;
  importedBy?: string;
  fileName?: string;

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
  importBatchId: { type: Schema.Types.ObjectId, ref: 'JiraImportBatch', required: false },
  projectId: { type: String, required: true },
  sprint: { type: String, required: true },
  reportType: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  importedAt: { type: Date, required: true, default: Date.now },
  importedBy: { type: String },
  fileName: { type: String },

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
  raw: { type: Schema.Types.Mixed },
});

export default mongoose.model<IJiraSprintIssues>('JiraSprintIssues', JiraSprintIssuesSchema); 