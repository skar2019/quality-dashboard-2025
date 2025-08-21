import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Description,
  Code,
  BugReport,
  CheckCircle,
} from '@mui/icons-material';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

const documentMetrics = [
  {
    name: 'Requirements',
    coverage: 85,
    quality: 90,
    complexity: 75,
  },
  {
    name: 'Design Docs',
    coverage: 80,
    quality: 85,
    complexity: 70,
  },
  {
    name: 'Test Cases',
    coverage: 95,
    quality: 92,
    complexity: 80,
  },
  {
    name: 'API Docs',
    coverage: 88,
    quality: 87,
    complexity: 65,
  },
];

const testCoverage = [
  {
    module: 'Frontend Components',
    coverage: 92,
    status: 'success',
  },
  {
    module: 'API Endpoints',
    coverage: 88,
    status: 'warning',
  },
  {
    module: 'Database Operations',
    coverage: 95,
    status: 'success',
  },
  {
    module: 'Integration Tests',
    coverage: 85,
    status: 'warning',
  },
];

const DocumentIntelligence: React.FC = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <BugReport color="warning" />;
      default:
        return <CheckCircle />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Document Intelligence
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Document Analysis
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={documentMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Coverage"
                    dataKey="coverage"
                    stroke="#1473E6"
                    fill="#1473E6"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Quality"
                    dataKey="quality"
                    stroke="#36B37E"
                    fill="#36B37E"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Test Coverage Analysis
            </Typography>
            <List>
              {testCoverage.map((item) => (
                <ListItem key={item.module}>
                  <ListItemIcon>{getStatusIcon(item.status)}</ListItemIcon>
                  <ListItemText
                    primary={item.module}
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Coverage: {item.coverage}%
                        </Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mt: 1 }}>
                          <CircularProgress
                            variant="determinate"
                            value={item.coverage}
                            size={40}
                          />
                          <Box
                            sx={{
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" component="div" color="text.secondary">
                              {item.coverage}%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentIntelligence; 