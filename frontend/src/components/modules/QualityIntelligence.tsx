import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const defectData = [
  { name: 'Planning', value: 30 },
  { name: 'Development', value: 45 },
  { name: 'Testing', value: 25 },
];

const teamData = [
  { name: 'Team A', defects: 15, resolved: 12 },
  { name: 'Team B', defects: 20, resolved: 18 },
  { name: 'Team C', defects: 25, resolved: 20 },
  { name: 'Team D', defects: 18, resolved: 15 },
];

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850'];

const QualityIntelligence: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Quality Intelligence Center
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Defect Analysis" />
        <Tab label="Team Performance" />
        <Tab label="Issue Patterns" />
      </Tabs>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Defect Distribution by Phase
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#1473E6"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {defectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Team Performance Overview
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="defects" fill="#1473E6" name="Total Defects" />
                  <Bar dataKey="resolved" fill="#36B37E" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recurring Issues Analysis
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Issue Pattern Analysis Chart
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QualityIntelligence; 