import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import TaskStatusDashboard from './TaskStatusDashboard';
import { parseTaskData, Task } from '../../utils/taskParser';

const TaskDashboardDemo: React.FC = () => {
  const [rawTaskData, setRawTaskData] = useState<string>('');
  const [parsedTasks, setParsedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample task data from the user's response
  const sampleTaskData = `Here are the tasks that are currently in progress:

Adani:
* Fix payment gateway bug (adani-2)
* Resolve login timeout issue (adani-6)
* Add support for OAuth (adani-9)
* Resolve database connection error (adani-13)
* Fix password reset bug (adani-16)
* Fix checkout page error (adani-19)

Digital Transformation:
* Implement API gateway #3 (digital-transformation-sprint-1-3)
* Configure load balancing #7 (digital-transformation-sprint-1-7)

Legacy Migration:
* Test migration process #1 (legacy-migration-sprint-1-1)
* Update documentation #6 (legacy-migration-sprint-1-6)
* Decommission old system #9 (legacy-migration-sprint-1-9)

Quality Dashboard:
* Set up data collection #4 (quality-dashboard-sprint-1-4)

Mobile App:
* Add social media integration #5 (mobile-app-sprint-1-5)

Retrieved Tasks:
Task ID: adani-2
Title: Fix payment gateway bug
Description: Payment fails for transactions over 500.
Status: In Progress
Priority: High
Assignee: alice.jones
Reporter: bob.wilson
Issue Type: Bug
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: adani-6
Title: Resolve login timeout issue
Description: Users are logged out after 30 minutes of inactivity.
Status: In Progress
Priority: High
Assignee: alice.jones
Reporter: mary.brown
Issue Type: Bug
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: adani-9
Title: Add support for OAuth
Description: Integrate OAuth 2.0 for third-party logins.
Status: In Progress
Priority: High
Assignee: sarah.lee
Reporter: mary.brown
Issue Type: Story
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: adani-13
Title: Resolve database connection error
Description: Database connection fails under high load.
Status: In Progress
Priority: High
Assignee: alice.jones
Reporter: bob.wilson
Issue Type: Bug
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: adani-16
Title: Fix password reset bug
Description: Password reset emails not being sent.
Status: In Progress
Priority: High
Assignee: sarah.lee
Reporter: bob.wilson
Issue Type: Bug
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: adani-19
Title: Fix checkout page error
Description: Checkout fails for certain payment methods.
Status: In Progress
Priority: High
Assignee: john.doe
Reporter: bob.wilson
Issue Type: Bug
Resolution: Unresolved
Project: Adani
Sprint: sprint-1
---
Task ID: digital-transformation-sprint-1-3
Title: Implement API gateway #3
Description: Integration work for Digital Transformation with external systems.
Status: In Progress
Priority: High
Assignee: bob.wilson
Reporter: dave.smith
Issue Type: Bug
Resolution: Done
Project: Digital Transformation
Sprint: sprint-1
---
Task ID: digital-transformation-sprint-1-7
Title: Configure load balancing #7
Description: Critical component that needs to be developed for Digital Transformation success.
Status: In Progress
Priority: Low
Assignee: dave.smith
Reporter: john.doe
Issue Type: Improvement
Resolution: Done
Project: Digital Transformation
Sprint: sprint-1
---
Task ID: legacy-migration-sprint-1-1
Title: Test migration process #1
Description: Security update needed for Legacy Migration.
Status: In Progress
Priority: Low
Assignee: dave.smith
Reporter: dave.smith
Issue Type: Bug
Resolution: Unresolved
Project: Legacy Migration
Sprint: sprint-1
---
Task ID: legacy-migration-sprint-1-6
Title: Update documentation #6
Description: Enhancement to improve user experience in Legacy Migration.
Status: In Progress
Priority: Medium
Assignee: john.doe
Reporter: alice.jones
Issue Type: Improvement
Resolution: Unresolved
Project: Legacy Migration
Sprint: sprint-1
---
Task ID: legacy-migration-sprint-1-9
Title: Decommission old system #9
Description: Performance optimization for Legacy Migration system.
Status: In Progress
Priority: High
Assignee: alice.jones
Reporter: bob.wilson
Issue Type: Story
Resolution: Unresolved
Project: Legacy Migration
Sprint: sprint-1
---
Task ID: quality-dashboard-sprint-1-4
Title: Set up data collection #4
Description: Enhancement to improve user experience in Quality Dashboard.
Status: In Progress
Priority: Medium
Assignee: dave.smith
Reporter: sarah.johnson
Issue Type: Bug
Resolution: Unresolved
Project: Quality Dashboard
Sprint: sprint-1
---
Task ID: mobile-app-sprint-1-5
Title: Add social media integration #5
Description: This task involves implementing key functionality for the Mobile App project.
Status: In Progress
Priority: Medium
Assignee: john.doe
Reporter: dave.smith
Issue Type: Story
Resolution: Done
Project: Mobile App
Sprint: sprint-1
---
Task ID: mobile-app-sprint-1-6
Title: Implement payment integration #6
Description: Documentation update for Mobile App features.
Status: In Progress
Priority: Medium
Assignee: sarah.johnson
Reporter: john.doe
Issue Type: Epic
Resolution: Unresolved
Project: Mobile App
Sprint: sprint-1
---

Total tasks retrieved: 14`;

  useEffect(() => {
    // Load sample data by default
    setRawTaskData(sampleTaskData);
  }, []);

  const handleParseData = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tasks = parseTaskData(rawTaskData);
      setParsedTasks(tasks);
      
      if (tasks.length === 0) {
        setError('No tasks were parsed from the provided data. Please check the format.');
      }
    } catch (err: any) {
      setError(`Error parsing task data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setRawTaskData(sampleTaskData);
    setError(null);
  };

  const handleClear = () => {
    setRawTaskData('');
    setParsedTasks([]);
    setError(null);
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)' }}>
        <Typography variant="h4" color="white" gutterBottom>
          Task Dashboard Demo
        </Typography>
        <Typography variant="subtitle1" color="white" sx={{ opacity: 0.9 }}>
          Beautiful visualization of task data with modern UI components
        </Typography>
      </Paper>

      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Task Data Input
        </Typography>
        
        <Box display="flex" gap={2} mb={2}>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={handleParseData}
            disabled={!rawTaskData.trim() || isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Parse & Display'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={handleLoadSample}
          >
            Load Sample Data
          </Button>
          <Button
            variant="outlined"
            onClick={handleClear}
          >
            Clear
          </Button>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={8}
          variant="outlined"
          label="Paste your task data here"
          value={rawTaskData}
          onChange={(e) => setRawTaskData(e.target.value)}
          placeholder="Paste your task data in the format shown below..."
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {parsedTasks.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Successfully parsed {parsedTasks.length} tasks from the data!
          </Alert>
        )}
      </Paper>

      {/* Statistics Cards */}
      {parsedTasks.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Parsing Results
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`${parsedTasks.length} Total Tasks`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`${new Set(parsedTasks.map(t => t.project)).size} Projects`} 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              label={`${parsedTasks.filter(t => t.priority.toLowerCase() === 'high').length} High Priority`} 
              color="error" 
              variant="outlined"
            />
            <Chip 
              label={`${parsedTasks.filter(t => t.issueType.toLowerCase() === 'bug').length} Bugs`} 
              color="warning" 
              variant="outlined"
            />
            <Chip 
              label={`${parsedTasks.filter(t => t.resolution.toLowerCase() === 'done').length} Completed`} 
              color="success" 
              variant="outlined"
            />
          </Box>
        </Paper>
      )}

      {/* Beautiful Dashboard */}
      {parsedTasks.length > 0 && (
        <TaskStatusDashboard 
          tasks={parsedTasks}
          title="Beautiful Task Status Dashboard"
        />
      )}

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Use
        </Typography>
        <Typography variant="body2" paragraph>
          This demo shows how to transform raw task data into a beautiful, interactive dashboard:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2">
            Paste your task data in the text area above
          </Typography>
          <Typography component="li" variant="body2">
            Click "Parse & Display" to convert the data into a structured format
          </Typography>
          <Typography component="li" variant="body2">
            View the beautiful dashboard with statistics, progress bars, and organized task lists
          </Typography>
          <Typography component="li" variant="body2">
            Expand project sections to see detailed task information
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <strong>Features:</strong> Color-coded priorities, progress indicators, assignee avatars, 
          issue type icons, expandable project sections, and responsive design.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TaskDashboardDemo;
