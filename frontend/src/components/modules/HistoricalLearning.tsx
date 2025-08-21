import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const projectData = [
  {
    name: 'Project Alpha',
    status: 'success',
    completion: 95,
    lessons: ['Improved code review process', 'Better sprint planning'],
  },
  {
    name: 'Project Beta',
    status: 'warning',
    completion: 85,
    lessons: ['Need better documentation', 'Communication gaps identified'],
  },
  {
    name: 'Project Gamma',
    status: 'error',
    completion: 70,
    lessons: ['Resource allocation issues', 'Scope creep management needed'],
  },
];

const timelineData = [
  {
    date: '2024-01',
    event: 'Project Alpha Launch',
    status: 'success',
  },
  {
    date: '2024-02',
    event: 'Beta Phase Issues',
    status: 'warning',
  },
  {
    date: '2024-03',
    event: 'Process Improvement',
    status: 'success',
  },
  {
    date: '2024-04',
    event: 'New Quality Metrics',
    status: 'success',
  },
];

const HistoricalLearning: React.FC = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Historical Learning
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8} component="div">
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Project Comparison
            </Typography>
            <Box sx={{ mt: 2 }}>
              {projectData.map((project) => (
                <Card key={project.name} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getStatusIcon(project.status)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {project.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Completion: {project.completion}%
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Key Lessons:
                    </Typography>
                    <ul>
                      {project.lessons.map((lesson, index) => (
                        <li key={index}>
                          <Typography variant="body2">{lesson}</Typography>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} component="div">
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Project Timeline
            </Typography>
            <Timeline>
              {timelineData.map((item, index) => (
                <TimelineItem key={index}>
                  <TimelineSeparator>
                    <TimelineDot color={item.status === 'success' ? 'success' : 'warning'}>
                      {getStatusIcon(item.status)}
                    </TimelineDot>
                    {index < timelineData.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle2">{item.date}</Typography>
                    <Typography variant="body2">{item.event}</Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HistoricalLearning; 