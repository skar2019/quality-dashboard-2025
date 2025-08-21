import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Warning,
  Error,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const predictionData = [
  { week: 'Week 1', actual: 85, predicted: 87 },
  { week: 'Week 2', actual: 88, predicted: 86 },
  { week: 'Week 3', actual: 90, predicted: 89 },
  { week: 'Week 4', actual: 92, predicted: 91 },
  { week: 'Week 5', actual: 95, predicted: 93 },
];

const riskAlerts = [
  {
    id: 1,
    severity: 'high',
    title: 'Resource Bottleneck',
    description: 'Team capacity may be insufficient for upcoming sprint',
    trend: 'up',
  },
  {
    id: 2,
    severity: 'medium',
    title: 'Technical Debt',
    description: 'Accumulating technical debt in core modules',
    trend: 'up',
  },
  {
    id: 3,
    severity: 'low',
    title: 'Documentation Gap',
    description: 'API documentation needs updating',
    trend: 'down',
  },
];

const PredictiveQuality: React.FC = () => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp color="error" />
    ) : (
      <TrendingDown color="success" />
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Predictive Quality Engine
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quality Trend Prediction
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#1473E6"
                    name="Actual Quality"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#36B37E"
                    name="Predicted Quality"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Risk Alerts
            </Typography>
            <List>
              {riskAlerts.map((alert) => (
                <ListItem key={alert.id}>
                  <ListItemIcon>
                    {getTrendIcon(alert.trend)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{alert.title}</Typography>
                        <Chip
                          label={alert.severity.toUpperCase()}
                          color={getSeverityColor(alert.severity)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={alert.description}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resource Optimization Suggestions
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Resource Allocation</AlertTitle>
              Consider redistributing team members to address the current bottleneck in the frontend team.
            </Alert>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Skill Gap Analysis</AlertTitle>
              Additional training needed in automated testing for the backend team.
            </Alert>
            <Alert severity="success">
              <AlertTitle>Process Improvement</AlertTitle>
              Code review process optimization has shown positive results in quality metrics.
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PredictiveQuality; 