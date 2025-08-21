"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var JiraSprintIssuesSchema = new mongoose_1.Schema({
    masterReportId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'JiraSprint', required: true },
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
    raw: { type: mongoose_1.Schema.Types.Mixed }
});
exports.default = mongoose_1.default.model('JiraSprintIssues', JiraSprintIssuesSchema);
