import mongoose, { Schema, Document } from 'mongoose';

export interface IJiraSprint extends Document {
  projectId: string;
  projectName?: string;
  sprint: string;
  startDate: Date;
  endDate: Date;
  importedAt: Date;
  importedBy?: string;
  fileName?: string;
  issueCount?: number;
}

const JiraSprintSchema: Schema = new Schema({
  projectId: { type: String, required: true },
  projectName: { type: String },
  sprint: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  importedAt: { type: Date, required: true, default: Date.now },
  importedBy: { type: String },
  fileName: { type: String },
  issueCount: { type: Number }
});

export default mongoose.model<IJiraSprint>('JiraSprint', JiraSprintSchema); 