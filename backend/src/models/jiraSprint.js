"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var JiraSprintSchema = new mongoose_1.Schema({
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
exports.default = mongoose_1.default.model('JiraSprint', JiraSprintSchema);
