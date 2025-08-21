import express from 'express';
import axios from 'axios';

const router = express.Router();

// ML Models API URL
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// Generate summary report
router.post('/generate', async (req, res) => {
  try {
    const { sprint, project, includeMetrics, message } = req.body;
    
    // Use RAG chatbot service for summary reports
    const chatRequest = {
      message: message || 'Generate a comprehensive summary report with project status overview, including completion percentages, task counts, quality metrics, and risk assessments. Provide color-coded status indicators (green for on-track, amber for slight issues, red for critical) and overall portfolio health.',
      sprint,
      project,
    };
    
    // Call the summary report service
    const response = await axios.post(`${ML_API_URL}/api/summary-report/generate`, chatRequest);
    
    res.json(response.data);
  } catch (error: any) {
    console.error('Summary report RAG error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to generate summary report via RAG',
        detail: error.message 
      });
    }
  }
});

// Get summary data only (no display formatting)
router.post('/data', async (req, res) => {
  try {
    const { sprint, project, includeMetrics, message } = req.body;
    
    const dataRequest = {
      message: message || 'Generate project status data',
      sprint,
      project,
      includeMetrics: includeMetrics !== false,
    };
    
    // Call the data-only endpoint
    const response = await axios.post(`${ML_API_URL}/api/summary-report/data`, dataRequest);
    
    res.json(response.data);
  } catch (error: any) {
    console.error('Summary data error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to get summary data',
        detail: error.message 
      });
    }
  }
});

// Get project status
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const response = await axios.get(`${ML_API_URL}/api/summary-report/project/${projectId}`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Project status error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to get project status',
        detail: error.message 
      });
    }
  }
});

// Refresh summary report
router.post('/refresh', async (req, res) => {
  try {
    const response = await axios.post(`${ML_API_URL}/api/summary-report/refresh`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Refresh summary report error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to refresh summary report',
        detail: error.message 
      });
    }
  }
});

// Get service status
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/api/summary-report/status`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Summary report status error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to get summary report service status',
        detail: error.message 
      });
    }
  }
});

// Mock data for development/testing
router.post('/mock/generate', (req, res) => {
  const { message } = req.body;
  
  // If message is provided, it's a chat request
  if (message) {
    return res.json({
      response: 'I can help you with summary reports. Try asking for a "summary report" or "project status overview".'
    });
  }
  
  const mockSummaryReport = {
    projectStatuses: [
      {
        projectId: '1',
        projectName: 'Adani Project',
        status: 'on-track',
        completionPercentage: 75,
        totalTasks: 120,
        completedTasks: 90,
        overdueTasks: 5,
        blockedTasks: 2,
        sprintVelocity: 15,
        qualityScore: 85,
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
        summary: 'Project is progressing well with good velocity and quality metrics. Most tasks are on track with minimal blockers.'
      },
      {
        projectId: '2',
        projectName: 'Digital Transformation',
        status: 'slight-issues',
        completionPercentage: 60,
        totalTasks: 200,
        completedTasks: 120,
        overdueTasks: 15,
        blockedTasks: 8,
        sprintVelocity: 12,
        qualityScore: 72,
        riskLevel: 'medium',
        lastUpdated: new Date().toISOString(),
        summary: 'Project has some delays and quality issues that need attention. Several tasks are overdue and blocked.'
      },
      {
        projectId: '3',
        projectName: 'Legacy Migration',
        status: 'critical',
        completionPercentage: 35,
        totalTasks: 150,
        completedTasks: 52,
        overdueTasks: 25,
        blockedTasks: 12,
        sprintVelocity: 8,
        qualityScore: 58,
        riskLevel: 'high',
        lastUpdated: new Date().toISOString(),
        summary: 'Critical project with significant delays and quality issues. Immediate intervention required.'
      }
    ],
    overallStatus: 'slight-issues',
    totalProjects: 3,
    onTrackProjects: 1,
    issuesProjects: 1,
    criticalProjects: 1,
    summary: 'Overall project portfolio shows mixed results. One project is on track, one has slight issues, and one is critical. Focus should be on addressing the critical project and improving the project with slight issues.',
    generatedAt: new Date().toISOString()
  };

  res.json(mockSummaryReport);
});

export default router;
