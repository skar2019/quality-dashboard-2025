import express, { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import fs from 'fs';
import JiraSprint from '../models/jiraSprint';
import JiraSprintIssues from '../models/jiraSprintIssues';
import mongoose from 'mongoose';
import axios from 'axios';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Function to process JIRA data for RAG embedding
async function processJiraDataForRAG(masterReport: any, jiraData: any[]): Promise<void> {
  try {
    const mlApiUrl = process.env.ML_API_URL;
    
    if (!mlApiUrl) {
      console.error('❌ ML_API_URL environment variable is not set');
      console.log('⚠️ RAG processing skipped - ML_API_URL not configured');
      return;
    }
    
    console.log(`🔗 Using ML API URL: ${mlApiUrl}`);
    
    // Transform JIRA data using optimized embedding logic from POC
    const transformedData = jiraData.map(item => {
      // Clean and combine text fields like in the POC
      const cleanText = (text: string): string => {
        if (!text || typeof text !== 'string') return '';
        return text
          .trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/[^\w\s\-.,!?;:()]/g, '') // Remove special characters except basic punctuation
          .substring(0, 5000); // Limit length like in POC
      };

      // Create combined document text like in POC
      const summary = cleanText(item.summary || '');
      const description = cleanText(item.description || '');
      
      let documentText = '';
      if (summary && description) {
        documentText = `Summary: ${summary} Description: ${description}`;
      } else if (summary) {
        documentText = `Summary: ${summary}`;
      } else if (description) {
        documentText = `Description: ${description}`;
      } else {
        documentText = 'No content available';
      }

      // Skip items with no content
      if (!documentText || documentText === 'No content available') {
        return null;
      }

      // Create data in the required format for ML API
      const jiraIssueData = {
        issueKey: cleanText(item.issueKey || ''),
        summary: cleanText(item.summary || ''),
        issueType: cleanText(item.issueType || ''),
        status: cleanText(item.status || ''),
        priority: cleanText(item.priority || ''),
        assignee: cleanText(item.assignee || ''),
        reporter: cleanText(item.reporter || ''),
        created: item.created ? new Date(item.created).toISOString() : '',
        updated: item.updated ? new Date(item.updated).toISOString() : '',
        resolution: cleanText(item.resolution || ''),
        description: cleanText(item.description || ''),
        projectId: masterReport.projectName,
        sprintId: masterReport.sprint || ''
      };

      // Remove empty values
      const cleanedData = Object.fromEntries(
        Object.entries(jiraIssueData).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      return cleanedData;
    }).filter(item => item !== null); // Remove null items

    console.log(`Transformed ${transformedData.length} JIRA items for RAG processing (${jiraData.length - transformedData.length} items skipped due to no content)`);
    
    if (transformedData.length === 0) {
      console.log('No valid data to send for RAG processing');
      return;
    }

    // Log sample data being sent
    if (transformedData.length > 0) {
      console.log('📤 Sample data being sent to ML API:', JSON.stringify(transformedData[0], null, 2));
    }

  

    // Send data to ML service for RAG processing in the required format
    const response = await axios.post(`${mlApiUrl}/api/chatbot/process-jira-data`, {
      jira_data: transformedData
    }, {
      timeout: 60000 // 60 second timeout for larger datasets
    });

    console.log('ML service RAG processing response:', response.data);
    
    // Log processing statistics
    if (response.data.processed_items) {
      console.log(`✅ Successfully processed ${response.data.processed_items} items for RAG embedding`);
      console.log(`📊 Processing time: ${response.data.processing_time || 'N/A'} seconds`);
      console.log(`🎯 Collection: ${response.data.collection_name || 'jira_issues_collection'}`);
    }

  } catch (error: any) {
    console.error('❌ Error processing JIRA data for RAG:', error.message);
    if (error.response) {
      console.error('ML service error details:', error.response.data);
    }
    // Don't throw error to avoid failing the import - RAG is optional
    console.log('⚠️ RAG processing failed, but JIRA import will continue');
  }
}

// Define the extended request type
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

router.post('/jira-imports', upload.single('file'), async (req: MulterRequest, res: Response): Promise<void> => {
  if (!req.file) {
    console.error('No file uploaded');
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  console.log('File received:', req.file.originalname);

  const { projectId, projectName, sprint, startDate, endDate, importedBy } = req.body;
  console.log('Import metadata:', { projectId, projectName, sprint, startDate, endDate, importedBy });

  // 1. Create the master report document
  const masterReport = new JiraSprint({
    projectId,
    projectName,
    sprint,
    startDate,
    endDate,
    importedAt: new Date(),
    importedBy,
    fileName: req.file.originalname
  });
  await masterReport.save();
  console.log('Master report created:', masterReport._id);

  const results: any[] = [];
  const errors: any[] = [];

  fs.createReadStream(req.file.path)
    .pipe(parse({ 
      columns: true, 
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true
    }))
    .on('data', (row: any) => {
      try {
        console.log('Parsed row:', row);
        
        // Helper function to safely parse dates
        const parseDate = (dateString: string): Date | null => {
          if (!dateString || dateString.trim() === '') return null;
          const parsed = new Date(dateString);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        // Helper function to get safe string value
        const getSafeString = (value: any): string => {
          return value && typeof value === 'string' ? value.trim() : '';
        };

        const doc = new JiraSprintIssues({
          masterReportId: masterReport._id,
          issueKey: getSafeString(row['Issue Key']) || 'UNKNOWN',
          summary: getSafeString(row['Summary']) || 'No Summary',
          issueType: getSafeString(row['Issue Type']) || 'Unknown',
          status: getSafeString(row['Status']) || 'Unknown',
          priority: getSafeString(row['Priority']) || 'Unknown',
          assignee: getSafeString(row['Assignee']) || 'Unassigned',
          reporter: getSafeString(row['Reporter']) || 'Unknown',
          created: parseDate(row['Created']) || new Date(),
          updated: parseDate(row['Updated']) || new Date(),
          resolution: getSafeString(row['Resolution']) || 'Unresolved',
          description: getSafeString(row['Description']) || 'No description provided',
          raw: row
        });
        results.push(doc);
        console.log('Created JiraSprintIssues doc for issueKey:', row['Issue Key']);
      } catch (err: any) {
        console.error('Error creating JiraSprintIssues doc:', err);
        errors.push({ row, error: err.message });
      }
    })
    .on('end', async () => {
      try {
        console.log('Total rows parsed:', results.length);
              await JiraSprintIssues.insertMany(results);
      console.log('Inserted all JiraSprintIssues docs');
        masterReport.issueCount = results.length;
        await masterReport.save();
        console.log('Updated master report with issueCount');
        
        // Process JIRA data for RAG embedding
        try {
          console.log('Starting RAG embedding process...');
          await processJiraDataForRAG(masterReport, results);
          console.log('RAG embedding completed successfully');
        } catch (ragError: any) {
          console.error('RAG embedding failed:', ragError);
          // Don't fail the import if RAG fails
        }
        
        fs.unlinkSync(req.file!.path);
        res.json({ success: true, inserted: results.length, errors });
      } catch (err: any) {
        console.error('Error during insertMany or masterReport update:', err);
        res.status(500).json({ error: err.message });
      }
    })
    .on('error', (err: any) => {
      console.error('Stream error:', err);
      res.status(500).json({ error: err.message });
    });
});

// GET /jira-imports/recent - fetch 10 most recent import batches
router.get('/jira-imports/recent', async (req: Request, res: Response) => {
  try {
    const recent = await JiraSprint.find()
      .sort({ importedAt: -1 })
      .limit(10)
      .lean();
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent imports' });
  }
});

// GET /jira-imports/:reportId - fetch specific report details
router.get('/jira-imports/:reportId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const report = await JiraSprint.findById(reportId).lean();
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /jira-imports/:reportId/data - fetch all data for a specific report
router.get('/jira-imports/:reportId/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const { page = 1, limit = 100, status, priority, assignee, startDate, endDate } = req.query;
    
    // Build filter object
    const filter: any = { masterReportId: new mongoose.Types.ObjectId(reportId) };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
    
    // Note: Date filtering is now handled at the report level, not issue level
    // The startDate and endDate parameters are for filtering reports, not individual issues
    // Individual issues within a report are not filtered by date
    
    console.log('Data endpoint - Query params:', { page, limit, status, priority, assignee, startDate, endDate });
    console.log('Data endpoint - Filter used:', JSON.stringify(filter));
    console.log('Data endpoint - Note: Date filtering applied at report level, not issue level');
    
    const total = await JiraSprintIssues.countDocuments(filter);
    console.log('Data endpoint - Records found:', total);
    
    let data;
    let paginationInfo;
    
    // Handle "Show All" option (limit = -1)
    if (Number(limit) === -1) {
      data = await JiraSprintIssues.find(filter)
        .sort({ created: -1 })
        .lean();
      paginationInfo = {
        page: 1,
        limit: total,
        total,
        pages: 1
      };
      console.log('Data endpoint - Show All: returning all', data.length, 'records');
    } else {
      const skip = (Number(page) - 1) * Number(limit);
      data = await JiraSprintIssues.find(filter)
        .sort({ created: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
      paginationInfo = {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      };
      console.log('Data endpoint - Records returned:', data.length);
      console.log('Data endpoint - Pagination:', { page: Number(page), limit: Number(limit), skip, total });
    }
    
    res.json({
      data,
      pagination: paginationInfo
    });
  } catch (err) {
    console.error('Error in data endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// GET /jira-imports/:reportId/stats - fetch statistics for a report
router.get('/jira-imports/:reportId/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const { status, priority, assignee, startDate, endDate } = req.query;
    
    // Build filter object - same as data endpoint
    const filter: any = { masterReportId: new mongoose.Types.ObjectId(reportId) };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = { $regex: assignee, $options: 'i' };
    
    // Note: Date filtering is now handled at the report level, not issue level
    // The startDate and endDate parameters are for filtering reports, not individual issues
    // Individual issues within a report are not filtered by date
    
    console.log('Stats filter used:', JSON.stringify(filter));
    console.log('Stats endpoint - Note: Date filtering applied at report level, not issue level');
    
    const stats = await JiraSprintIssues.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIssues: { $sum: 1 },
          byStatus: { $push: '$status' },
          byPriority: { $push: '$priority' },
          byType: { $push: '$issueType' }
        }
      }
    ]);
    
    if (stats.length === 0) {
      res.json({
        totalIssues: 0,
        statusBreakdown: {},
        priorityBreakdown: {},
        typeBreakdown: {}
      });
      return;
    }
    
    const stat = stats[0];
    
    // Calculate breakdowns
    const statusBreakdown = stat.byStatus.reduce((acc: any, status: string) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const priorityBreakdown = stat.byPriority.reduce((acc: any, priority: string) => {
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});
    
    const typeBreakdown = stat.byType.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalIssues: stat.totalIssues,
      statusBreakdown,
      priorityBreakdown,
      typeBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report statistics' });
  }
});

// GET /jira-imports/project/:projectId/issues - get all issues for a project across all reports
router.get('/jira-imports/project/:projectId/issues', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, limit = 10000 } = req.query;

    console.log('=== PROJECT ISSUES ENDPOINT START ===');
    console.log(`Project ID: ${projectId}`);
    console.log('Query params:', { startDate, endDate, limit });
    console.log('Request URL:', req.url);

    // Build report filter - filter reports by their startDate and endDate
    const reportFilter: any = {
      $or: [
        { projectId: projectId },
        { projectName: projectId }
      ]
    };

    // Add date filtering to reports if provided
    if (startDate || endDate) {
      if (startDate) {
        const startDateObj = new Date(startDate as string);
        reportFilter.startDate = { $gte: startDateObj };
        console.log('Added report startDate filter:', startDateObj);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (reportFilter.startDate) {
          reportFilter.startDate.$lte = endDateObj;
        } else {
          reportFilter.startDate = { $lte: endDateObj };
        }
        console.log('Added report endDate filter:', endDateObj);
      }
    }

    console.log('Report filter:', JSON.stringify(reportFilter, null, 2));

    // Find all reports for this project with date filtering
    console.log('Searching for reports with date filtering...');
    const reports = await JiraSprint.find(reportFilter).sort({ createdAt: -1 });

    console.log(`Found ${reports.length} reports for project ${projectId} after date filtering`);
    if (reports.length > 0) {
      console.log('Report IDs found:', reports.map(r => ({ 
        id: r._id, 
        projectId: r.projectId, 
        projectName: r.projectName, 
        sprint: r.sprint,
        startDate: r.startDate,
        endDate: r.endDate
      })));
    }

    if (!reports.length) {
      console.log('No reports found after date filtering - returning empty response');
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'No reports found for this project in the specified date range'
      });
      return;
    }

    // Build query for issues - no date filtering on issues, only on reports
    const issueQuery: any = {
      masterReportId: { $in: reports.map(r => r._id) }
    };

    console.log('Issue query (no date filtering on issues):', JSON.stringify(issueQuery, null, 2));

    // Fetch all issues for the filtered reports
    console.log('Executing database query with limit:', 1000);
    const startTime = Date.now();
    const issues = await JiraSprintIssues.find(issueQuery)
      .limit(Number(1000))
      .sort({ created: -1 });
    const queryTime = Date.now() - startTime;

    console.log(`Database query completed in ${queryTime}ms`);
    console.log(`Found ${issues.length} total issues for project ${projectId}`);

    if (issues.length > 0) {
      console.log('Sample issue keys:', issues.slice(0, 5).map(i => i.issueKey));
      console.log('Issue date range:', {
        earliest: issues[issues.length - 1]?.created,
        latest: issues[0]?.created
      });
    }

    // Remove duplicates based on issue key/id
    console.log('Starting deduplication process...');
    const uniqueIssues: any[] = [];
    const seenKeys = new Set<string>();
    const duplicateCount = { total: 0, byKey: {} as any };

    issues.forEach((issue, index) => {
      const key = issue.issueKey || issue.id || (issue._id as string).toString();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueIssues.push(issue);
      } else {
        duplicateCount.total++;
        duplicateCount.byKey[key] = (duplicateCount.byKey[key] || 0) + 1;
        if (index < 10) { // Log first 10 duplicates for debugging
          console.log(`Duplicate found at index ${index}:`, key);
        }
      }
    });

    console.log(`Deduplication complete:`);
    console.log(`- Original issues: ${issues.length}`);
    console.log(`- Unique issues: ${uniqueIssues.length}`);
    console.log(`- Duplicates removed: ${duplicateCount.total}`);
    if (duplicateCount.total > 0) {
      console.log('Duplicate keys:', Object.keys(duplicateCount.byKey).slice(0, 10));
    }

    const response = {
      success: true,
      data: uniqueIssues,
      total: uniqueIssues.length,
      reportsCount: reports.length,
      message: `Found ${uniqueIssues.length} unique issues across ${reports.length} reports in the specified date range`
    };

    console.log('Response summary:', {
      success: response.success,
      totalIssues: response.total,
      reportsCount: response.reportsCount,
      message: response.message
    });
    console.log('=== PROJECT ISSUES ENDPOINT END ===');

    res.json(response);

  } catch (error: any) {
    console.error('=== PROJECT ISSUES ENDPOINT ERROR ===');
    console.error('Error fetching project issues:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request query:', req.query);
    console.error('=== END ERROR LOG ===');
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project issues',
      error: error.message
    });
  }
});

// GET /jira-imports/:reportId/all-data - fetch all data for a specific report without filtering
router.get('/jira-imports/:reportId/all-data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    
    // Simple filter - only by masterReportId, no other filters
    const filter = { masterReportId: new mongoose.Types.ObjectId(reportId) };
    
    console.log('All data filter used:', JSON.stringify(filter));
    const data = await JiraSprintIssues.find(filter)
      .sort({ created: -1 })
      .lean();
    const total = await JiraSprintIssues.countDocuments(filter);
    console.log('Total records found (no filters):', total);
    
    res.json({
      data,
      total,
      message: `Found ${total} total records for report ${reportId}`
    });
  } catch (err) {
    console.error('Error fetching all report data:', err);
    res.status(500).json({ error: 'Failed to fetch all report data' });
  }
});

// GET /jira-imports/project/:projectId/sprint-velocity - get sprint velocity data for a project
router.get('/jira-imports/project/:projectId/sprint-velocity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('=== SPRINT VELOCITY ENDPOINT START ===');
    console.log(`Project ID: ${projectId}`);
    console.log('Query params:', { startDate, endDate });

    // Build report filter - filter reports by their startDate and endDate
    const reportFilter: any = {
      $or: [
        { projectId: projectId },
        { projectName: projectId }
      ]
    };

    // Add date filtering to reports if provided
    if (startDate || endDate) {
      if (startDate) {
        const startDateObj = new Date(startDate as string);
        reportFilter.startDate = { $gte: startDateObj };
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (reportFilter.startDate) {
          reportFilter.startDate.$lte = endDateObj;
        } else {
          reportFilter.startDate = { $lte: endDateObj };
        }
      }
    }

    console.log('Report filter:', JSON.stringify(reportFilter, null, 2));

    // Find all reports for this project with date filtering
    const reports = await JiraSprint.find(reportFilter).sort({ startDate: 1 });

    console.log(`Found ${reports.length} reports for project ${projectId}`);

    if (!reports.length) {
      res.json({
        success: true,
        data: [],
        message: 'No reports found for this project in the specified date range'
      });
      return;
    }

    // Get sprint velocity data for each report
    const sprintVelocityData = [];

    for (const report of reports) {
      // Get issues for this report
      const issues = await JiraSprintIssues.find({ masterReportId: report._id });
      
      // Calculate velocity metrics
      const totalIssues = issues.length;
      const completedIssues = issues.filter(issue => 
        issue.status.toLowerCase().includes('done') || 
        issue.status.toLowerCase().includes('closed') ||
        issue.status.toLowerCase().includes('resolved')
      ).length;
      
      // For now, we'll use issue count as a proxy for story points
      // In a real implementation, you'd want to extract story points from the raw data
      const plannedPoints = totalIssues; // Assuming 1 point per issue for now
      const completedPoints = completedIssues;
      
      // Calculate story points from raw data if available
      let actualPlannedPoints = plannedPoints;
      let actualCompletedPoints = completedPoints;
      
      if (issues.length > 0 && issues[0].raw) {
        // Try to extract story points from raw data
        const storyPointsData = issues.map(issue => {
          const raw = issue.raw;
          // Common JIRA field names for story points
          const storyPoints = raw?.customfield_10016 || 
                            raw?.customfield_10020 || 
                            raw?.Story_Points || 
                            raw?.storyPoints ||
                            raw?.StoryPoints ||
                            1; // Default to 1 if not found
          return {
            issueKey: issue.issueKey,
            storyPoints: typeof storyPoints === 'number' ? storyPoints : 1,
            status: issue.status
          };
        });
        
        actualPlannedPoints = storyPointsData.reduce((sum, item) => sum + item.storyPoints, 0);
        actualCompletedPoints = storyPointsData
          .filter(item => 
            item.status.toLowerCase().includes('done') || 
            item.status.toLowerCase().includes('closed') ||
            item.status.toLowerCase().includes('resolved')
          )
          .reduce((sum, item) => sum + item.storyPoints, 0);
      }

      sprintVelocityData.push({
        sprint: report.sprint,
        startDate: report.startDate,
        endDate: report.endDate,
        planned: actualPlannedPoints,
        completed: actualCompletedPoints,
        totalIssues,
        completedIssues,
        goalMet: actualCompletedPoints >= actualPlannedPoints * 0.8, // 80% threshold
        reportId: report._id
      });
    }

    // Sort by start date
    sprintVelocityData.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    console.log('Sprint velocity data calculated:', sprintVelocityData.length, 'sprints');

    res.json({
      success: true,
      data: sprintVelocityData,
      total: sprintVelocityData.length,
      message: `Found velocity data for ${sprintVelocityData.length} sprints`
    });

  } catch (error: any) {
    console.error('=== SPRINT VELOCITY ENDPOINT ERROR ===');
    console.error('Error fetching sprint velocity:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sprint velocity data',
      error: error.message
    });
  }
});

// GET /jira-imports/project/:projectId/burndown - get burndown analysis data for a project
router.get('/jira-imports/project/:projectId/burndown', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('=== BURNDOWN ANALYSIS ENDPOINT START ===');
    console.log(`Project ID: ${projectId}`);
    console.log('Query params:', { startDate, endDate });

    // Build report filter - filter reports by their startDate and endDate
    const reportFilter: any = {
      $or: [
        { projectId: projectId },
        { projectName: projectId }
      ]
    };

    // Add date filtering to reports if provided
    if (startDate || endDate) {
      if (startDate) {
        const startDateObj = new Date(startDate as string);
        reportFilter.startDate = { $gte: startDateObj };
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (reportFilter.startDate) {
          reportFilter.startDate.$lte = endDateObj;
        } else {
          reportFilter.startDate = { $lte: endDateObj };
        }
      }
    }

    console.log('Report filter:', JSON.stringify(reportFilter, null, 2));

    // Find all reports for this project with date filtering
    const reports = await JiraSprint.find(reportFilter).sort({ startDate: 1 });

    console.log(`Found ${reports.length} reports for project ${projectId}`);

    if (!reports.length) {
      res.json({
        success: true,
        data: [],
        message: 'No reports found for this project in the specified date range'
      });
      return;
    }

    // Get burndown data for the most recent sprint
    const latestReport = reports[reports.length - 1];
    const issues = await JiraSprintIssues.find({ masterReportId: latestReport._id });
    
    // Calculate story points from raw data if available
    let totalStoryPoints = issues.length; // Default to issue count
    let completedStoryPoints = 0;
    
    if (issues.length > 0 && issues[0].raw) {
      // Try to extract story points from raw data
      const storyPointsData = issues.map(issue => {
        const raw = issue.raw;
        // Common JIRA field names for story points
        const storyPoints = raw?.customfield_10016 || 
                          raw?.customfield_10020 || 
                          raw?.Story_Points || 
                          raw?.storyPoints ||
                          raw?.StoryPoints ||
                          1; // Default to 1 if not found
        return {
          issueKey: issue.issueKey,
          storyPoints: typeof storyPoints === 'number' ? storyPoints : 1,
          status: issue.status,
          created: issue.created,
          updated: issue.updated
        };
      });
      
      totalStoryPoints = storyPointsData.reduce((sum, item) => sum + item.storyPoints, 0);
      completedStoryPoints = storyPointsData
        .filter(item => 
          item.status.toLowerCase().includes('done') || 
          item.status.toLowerCase().includes('closed') ||
          item.status.toLowerCase().includes('resolved')
        )
        .reduce((sum, item) => sum + item.storyPoints, 0);
    } else {
      // Use issue count as proxy
      completedStoryPoints = issues.filter(issue => 
        issue.status.toLowerCase().includes('done') || 
        issue.status.toLowerCase().includes('closed') ||
        issue.status.toLowerCase().includes('resolved')
      ).length;
    }

    // Calculate sprint duration (assuming 2 weeks = 10 working days)
    const sprintStartDate = new Date(latestReport.startDate);
    const sprintEndDate = new Date(latestReport.endDate);
    const sprintDuration = Math.ceil((sprintEndDate.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const sprintDurationDays = Math.min(sprintDuration, 10); // Cap at 10 days for visualization

    // Generate burndown data points
    const burndownData = [];
    const remainingStoryPoints = totalStoryPoints - completedStoryPoints;
    let totalWorkAdded = 0;
    
    for (let day = 1; day <= sprintDurationDays; day++) {
      // Calculate ideal burndown
      const idealRemaining = totalStoryPoints - (totalStoryPoints / (sprintDurationDays - 1)) * (day - 1);
      
      // Calculate actual remaining (simplified - in real implementation you'd track daily progress)
      const progressRatio = day / sprintDurationDays;
      const actualRemaining = Math.max(0, totalStoryPoints - (completedStoryPoints * progressRatio));
      
      // Simulate work added (scope changes)
      const workAdded = day === 3 ? Math.round(totalStoryPoints * 0.1) : 0; // Add 10% scope on day 3
      totalWorkAdded += workAdded;
      
      burndownData.push({
        day,
        remaining: Math.round(actualRemaining),
        workAdded,
        ideal: Math.round(idealRemaining),
        completed: Math.round(completedStoryPoints * progressRatio)
      });
    }

    // Calculate metrics
    const absoluteVariance = remainingStoryPoints - (totalStoryPoints / sprintDurationDays * (sprintDurationDays - 1));
    const percentageVariance = ((absoluteVariance / totalStoryPoints) * 100).toFixed(2);
    
    const workCompleted = completedStoryPoints;
    const currentBurnRate = workCompleted / sprintDurationDays;
    
    const daysNeeded = currentBurnRate > 0 ? remainingStoryPoints / currentBurnRate : 0;
    const projectedCompletionDay = sprintDurationDays + daysNeeded;
    const daysOverUnder = projectedCompletionDay - sprintDurationDays;
    
    let completionProbability = 0;
    if (daysOverUnder <= 0) {
      completionProbability = Math.min(100, 100 - Math.abs(daysOverUnder) * 5);
    } else {
      completionProbability = Math.max(0, 100 - daysOverUnder * 10);
    }
    
    const daysRemaining = sprintDurationDays - sprintDurationDays;
    const variancePenalty = Math.min(50, Math.abs(Number(percentageVariance)) * 2);
    const timePressurePenalty = daysRemaining < sprintDurationDays * 0.3 ? Math.max(0, (1 - daysRemaining / sprintDurationDays) * 20) : 0;
    const healthScore = 100 - variancePenalty - timePressurePenalty;
    
    const scopeChange = totalWorkAdded;
    const scopeChangePercentage = ((scopeChange / totalStoryPoints) * 100).toFixed(2);
    const timingMultiplier = (sprintDurationDays / sprintDurationDays) * 2;
    const scopeImpactScore = (Number(scopeChangePercentage) * timingMultiplier).toFixed(2);
    
    const dailyWork = burndownData.map((d, i, arr) => i === 0 ? 0 : arr[i - 1].remaining - d.remaining);
    const avgDailyWork = dailyWork.reduce((a, b) => a + b, 0) / (dailyWork.length - 1);
    const workVariance = dailyWork.slice(1).reduce((acc, w) => acc + Math.pow(w - avgDailyWork, 2), 0) / (dailyWork.length - 1);
    
    let pattern = 'Consistent';
    if (workVariance < avgDailyWork * 0.1) pattern = 'Consistent';
    else if (Math.max(...dailyWork) > avgDailyWork * 2) pattern = 'Bursty';
    else if (dailyWork[dailyWork.length - 1] > dailyWork[1]) pattern = 'Accelerating';
    else if (dailyWork[dailyWork.length - 1] < dailyWork[1]) pattern = 'Decelerating';

    const response = {
      success: true,
      data: {
        burndownData,
        metrics: {
          absoluteVariance: Math.round(absoluteVariance),
          percentageVariance,
          currentBurnRate: currentBurnRate.toFixed(2),
          projectedCompletionDay: Math.round(projectedCompletionDay),
          daysOverUnder: Math.round(daysOverUnder),
          completionProbability,
          healthScore: healthScore.toFixed(2),
          scopeImpactScore,
          pattern,
          totalStoryPoints,
          completedStoryPoints,
          remainingStoryPoints,
          sprintDuration: sprintDurationDays
        },
        sprint: latestReport.sprint,
        startDate: latestReport.startDate,
        endDate: latestReport.endDate
      },
      message: `Burndown analysis for ${latestReport.sprint}`
    };

    console.log('Burndown analysis calculated:', response.data.metrics);

    res.json(response);

  } catch (error: any) {
    console.error('=== BURNDOWN ANALYSIS ENDPOINT ERROR ===');
    console.error('Error fetching burndown data:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch burndown data',
      error: error.message
    });
  }
});

// GET /jira-imports/project/:projectId/quality-metrics - get defect density and quality metrics for a project
router.get('/jira-imports/project/:projectId/quality-metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('=== QUALITY METRICS ENDPOINT START ===');
    console.log(`Project ID: ${projectId}`);
    console.log('Query params:', { startDate, endDate });

    // Build report filter - filter reports by their startDate and endDate
    const reportFilter: any = {
      $or: [
        { projectId: projectId },
        { projectName: projectId }
      ]
    };

    // Add date filtering to reports if provided
    if (startDate || endDate) {
      if (startDate) {
        const startDateObj = new Date(startDate as string);
        reportFilter.startDate = { $gte: startDateObj };
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        if (reportFilter.startDate) {
          reportFilter.startDate.$lte = endDateObj;
        } else {
          reportFilter.startDate = { $lte: endDateObj };
        }
      }
    }

    console.log('Report filter:', JSON.stringify(reportFilter, null, 2));

    // Find all reports for this project with date filtering
    const reports = await JiraSprint.find(reportFilter).sort({ startDate: 1 });

    console.log(`Found ${reports.length} reports for project ${projectId}`);

    if (!reports.length) {
      res.json({
        success: true,
        data: {
          defectData: [],
          qualityMetrics: null
        },
        message: 'No reports found for this project in the specified date range'
      });
      return;
    }

    // Get all issues for all reports
    const allIssues = await JiraSprintIssues.find({
      masterReportId: { $in: reports.map(r => r._id) }
    });

    console.log(`Found ${allIssues.length} total issues for quality analysis`);

    if (allIssues.length === 0) {
      res.json({
        success: true,
        data: {
          defectData: [],
          qualityMetrics: null
        },
        message: 'No issues found for quality analysis'
      });
      return;
    }

    // Calculate story points from raw data if available
    let totalStoryPoints = allIssues.length; // Default to issue count
    
    if (allIssues.length > 0 && allIssues[0].raw) {
      totalStoryPoints = allIssues.reduce((sum, issue) => {
        const raw = issue.raw;
        const storyPoints = raw?.customfield_10016 || 
                          raw?.customfield_10020 || 
                          raw?.Story_Points || 
                          raw?.storyPoints ||
                          raw?.StoryPoints ||
                          1;
        return sum + (typeof storyPoints === 'number' ? storyPoints : 1);
      }, 0);
    }

    // Categorize issues by type and priority
    const defects = allIssues.filter(issue => 
      issue.issueType?.toLowerCase().includes('bug') ||
      issue.issueType?.toLowerCase().includes('defect') ||
      issue.issueType?.toLowerCase().includes('issue')
    );

    const nonDefects = allIssues.filter(issue => 
      !issue.issueType?.toLowerCase().includes('bug') &&
      !issue.issueType?.toLowerCase().includes('defect') &&
      !issue.issueType?.toLowerCase().includes('issue')
    );

    // Calculate defect data by period (monthly)
    const defectData = [];
    const monthlyData = new Map();

    defects.forEach(defect => {
      const createdDate = new Date(defect.created);
      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          period: monthKey,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0,
          resolved: 0,
          created: 0,
          resolutionTimes: []
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.created++;

      // Categorize by priority
      const priority = defect.priority?.toLowerCase() || 'medium';
      if (priority.includes('critical') || priority.includes('highest') || priority.includes('blocker')) {
        monthData.critical++;
      } else if (priority.includes('high')) {
        monthData.high++;
      } else if (priority.includes('medium')) {
        monthData.medium++;
      } else {
        monthData.low++;
      }

      monthData.total++;

      // Check if resolved
      if (defect.status?.toLowerCase().includes('done') || 
          defect.status?.toLowerCase().includes('closed') ||
          defect.status?.toLowerCase().includes('resolved')) {
        monthData.resolved++;
        
        // Calculate resolution time
        if (defect.updated && defect.created) {
          const createdDate = new Date(defect.created);
          const resolvedDate = new Date(defect.updated);
          const resolutionTime = Math.ceil((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          monthData.resolutionTimes.push(resolutionTime);
        }
      }
    });

    // Convert to array and calculate additional metrics
    for (const [monthKey, monthData] of monthlyData) {
      const avgResolutionTime = monthData.resolutionTimes.length > 0 
        ? monthData.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / monthData.resolutionTimes.length 
        : 0;

      const resolutionRate = monthData.total > 0 ? (monthData.resolved / monthData.total) * 100 : 0;
      const defectDensity = totalStoryPoints > 0 ? monthData.total / totalStoryPoints : 0;
      const escapeRate = monthData.total > 0 ? ((monthData.total - monthData.resolved) / monthData.total) * 100 : 0;
      const criticalRatio = monthData.total > 0 ? (monthData.critical / monthData.total) * 100 : 0;

      // Calculate quality score
      const baseQualityScore = 100;
      const densityPenalty = Math.min(30, defectDensity * 15);
      const escapePenalty = Math.min(25, escapeRate * 0.5);
      const resolutionPenalty = Math.min(20, Math.max(0, (avgResolutionTime - 5) * 2));
      const criticalPenalty = Math.min(25, criticalRatio * 0.8);
      
      const qualityScore = Math.max(0, baseQualityScore - densityPenalty - escapePenalty - resolutionPenalty - criticalPenalty);

      defectData.push({
        period: monthKey,
        critical: monthData.critical,
        high: monthData.high,
        medium: monthData.medium,
        low: monthData.low,
        total: monthData.total,
        resolved: monthData.resolved,
        qualityScore: Math.round(qualityScore),
        resolutionRate: Math.round(resolutionRate),
        defectDensity: Math.round(defectDensity * 100) / 100,
        escapeRate: Math.round(escapeRate),
        avgResolutionTime: Math.round(avgResolutionTime),
        criticalRatio: Math.round(criticalRatio)
      });
    }

    // Sort by period
    defectData.sort((a, b) => a.period.localeCompare(b.period));

    // Calculate overall quality metrics
    const totalDefects = defects.length;
    const totalResolved = defects.filter(d => 
      d.status?.toLowerCase().includes('done') || 
      d.status?.toLowerCase().includes('closed') ||
      d.status?.toLowerCase().includes('resolved')
    ).length;

    const criticalDefects = defects.filter(d => {
      const priority = d.priority?.toLowerCase() || 'medium';
      return priority.includes('critical') || priority.includes('highest') || priority.includes('blocker');
    }).length;

    const overallDefectDensity = totalStoryPoints > 0 ? totalDefects / totalStoryPoints : 0;
    const overallEscapeRate = totalDefects > 0 ? ((totalDefects - totalResolved) / totalDefects) * 100 : 0;
    const overallCriticalRatio = totalDefects > 0 ? (criticalDefects / totalDefects) * 100 : 0;

    // Calculate average resolution time
    const resolutionTimes = defects
      .filter(d => d.updated && d.created && 
        (d.status?.toLowerCase().includes('done') || 
         d.status?.toLowerCase().includes('closed') ||
         d.status?.toLowerCase().includes('resolved')))
      .map(d => {
        const createdDate = new Date(d.created);
        const resolvedDate = new Date(d.updated);
        return Math.ceil((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length 
      : 0;

    // Calculate overall quality score
    const baseQualityScore = 100;
    const densityPenalty = Math.min(30, overallDefectDensity * 15);
    const escapePenalty = Math.min(25, overallEscapeRate * 0.5);
    const resolutionPenalty = Math.min(20, Math.max(0, (avgResolutionTime - 5) * 2));
    const criticalPenalty = Math.min(25, overallCriticalRatio * 0.8);
    
    const overallQualityScore = Math.max(0, baseQualityScore - densityPenalty - escapePenalty - resolutionPenalty - criticalPenalty);

    // Quality gates assessment
    const qualityGates = {
      defectDensity: {
        status: overallDefectDensity <= 0.1 ? 'Pass' : 'Fail',
        score: overallDefectDensity <= 0.1 ? 100 : 0
      },
      escapeRate: {
        status: overallEscapeRate <= 5 ? 'Pass' : 'Fail',
        score: overallEscapeRate <= 5 ? 100 : 0
      },
      criticalDefect: {
        status: overallCriticalRatio <= 10 ? 'Pass' : 'Fail',
        score: overallCriticalRatio <= 10 ? 100 : 0
      },
      resolutionTime: {
        status: avgResolutionTime <= 7 ? 'Pass' : 'Fail',
        score: avgResolutionTime <= 7 ? 100 : 0
      }
    };

    const overallGateScore = Object.values(qualityGates).reduce((sum: number, gate: any) => sum + gate.score, 0) / 4;

    // Calculate quality impact on velocity
    const qualityImpact = totalDefects > 0 ? ((totalDefects * 0.5) / totalStoryPoints) * 100 : 0;

    // Calculate prevention effectiveness (simplified - based on issue types)
    const requirementsDefects = defects.filter(d => 
      d.issueType?.toLowerCase().includes('story') || 
      d.issueType?.toLowerCase().includes('epic')
    ).length;

    const designDefects = defects.filter(d => 
      d.issueType?.toLowerCase().includes('task') || 
      d.issueType?.toLowerCase().includes('subtask')
    ).length;

    const codingDefects = defects.filter(d => 
      d.issueType?.toLowerCase().includes('bug') || 
      d.issueType?.toLowerCase().includes('defect')
    ).length;

    const testingDefects = defects.filter(d => 
      d.issueType?.toLowerCase().includes('test') || 
      d.issueType?.toLowerCase().includes('qa')
    ).length;

    const preventionEffectiveness = {
      requirements: totalDefects > 0 ? (1 - (requirementsDefects / totalDefects)) * 100 : 100,
      design: totalDefects > 0 ? (1 - (designDefects / totalDefects)) * 100 : 100,
      coding: totalDefects > 0 ? (1 - (codingDefects / totalDefects)) * 100 : 100,
      testing: totalDefects > 0 ? (1 - (testingDefects / totalDefects)) * 100 : 100
    };

    const qualityMetrics = {
      overallQualityScore: Math.round(overallQualityScore),
      defectDensity: Math.round(overallDefectDensity * 100) / 100,
      escapeRate: Math.round(overallEscapeRate),
      avgResolutionTime: Math.round(avgResolutionTime),
      criticalDefectRatio: Math.round(overallCriticalRatio),
      qualityGates,
      overallGateScore: Math.round(overallGateScore),
      qualityImpact: Math.round(qualityImpact),
      preventionEffectiveness
    };

    const response = {
      success: true,
      data: {
        defectData,
        qualityMetrics
      },
      message: `Quality metrics analysis for project ${projectId}`
    };

    console.log('Quality metrics calculated:', {
      totalDefects,
      totalStoryPoints,
      overallQualityScore,
      overallGateScore
    });

    res.json(response);

  } catch (error: any) {
    console.error('=== QUALITY METRICS ENDPOINT ERROR ===');
    console.error('Error fetching quality metrics:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quality metrics',
      error: error.message
    });
  }
});

export default router; 