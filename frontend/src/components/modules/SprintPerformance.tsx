import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
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

const sprintData = [
  { sprint: 'Sprint 1', velocity: 30, quality: 85 },
  { sprint: 'Sprint 2', velocity: 35, quality: 88 },
  { sprint: 'Sprint 3', velocity: 32, quality: 90 },
  { sprint: 'Sprint 4', velocity: 38, quality: 92 },
  { sprint: 'Sprint 5', velocity: 40, quality: 95 },
];

const teamMetrics = [
  {
    team: 'Frontend Team',
    velocity: 85,
    quality: 92,
    status: 'success',
  },
  {
    team: 'Backend Team',
    velocity: 78,
    quality: 88,
    status: 'warning',
  },
  {
    team: 'QA Team',
    velocity: 90,
    quality: 95,
    status: 'success',
  },
];

const SprintPerformance: React.FC = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <CheckCircle />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Sprint & Team Performance
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sprint Velocity & Quality Trend
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sprintData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="velocity"
                    stroke="#1473E6"
                    name="Velocity"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="quality"
                    stroke="#36B37E"
                    name="Quality Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Team Performance
            </Typography>
            <List>
              {teamMetrics.map((team) => (
                <ListItem key={team.team}>
                  <ListItemIcon>{getStatusIcon(team.status)}</ListItemIcon>
                  <ListItemText
                    primary={team.team}
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Velocity: {team.velocity}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={team.velocity}
                          sx={{ mt: 0.5 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Quality: {team.quality}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={team.quality}
                          sx={{ mt: 0.5 }}
                        />
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

export default SprintPerformance; 