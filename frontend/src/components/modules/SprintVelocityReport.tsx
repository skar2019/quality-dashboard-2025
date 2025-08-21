import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  CheckCircle,
  Warning,
  Error,
  Speed,
  Timeline,
  Assessment,
  Lightbulb,
} from '@mui/icons-material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface SprintVelocityReportProps {
  data: any;
}

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850', '#0066CC', '#BDBDBD', '#8B5CF6', '#10B981'];

const SprintVelocityReport: React.FC<SprintVelocityReportProps> = ({ data }) => {
  // Extract data from the new structure
  const executive_summary = data.metrics?.executive_summary || {};
  const sprint_velocity_data = data.metrics?.sprint_velocity_data || [];
  const velocity_trends = data.metrics?.velocity_trends || {};
  const burndown_data = data.metrics?.burndown_data || [];
  const capacity_insights = data.metrics?.capacity_insights || {};
  const recommendations = data.recommendations || [];
  const process_improvements = data.metrics?.process_improvements || [
    "Implement velocity-based capacity planning",
    "Regular velocity trend analysis", 
    "Automated burn-down chart generation",
    "Sprint goal setting based on historical velocity",
    "Team velocity coaching and training"
  ];

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'warning';
      case 'needs_attention':
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle color="success" />;
      case 'good':
        return <CheckCircle color="warning" />;
      case 'needs_attention':
      case 'poor':
        return <Error color="error" />;
      default:
        return <Assessment />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp color="success" />;
      case 'declining':
        return <TrendingDown color="error" />;
      case 'stable':
        return <TrendingFlat color="info" />;
      default:
        return <Timeline />;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📊 Sprint Velocity & Burn-Down Report
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Generated on {new Date(data.generatedAt).toLocaleString()}
      </Typography>

      {/* Executive Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📊 Executive Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {executive_summary.total_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Projects
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {executive_summary.total_tasks}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Tasks
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {executive_summary.total_sprints}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Sprints
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {executive_summary.average_tasks_per_sprint}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Tasks/Sprint
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📊 Visual Analytics
          </Typography>
          <Grid container spacing={3}>
            {/* Sprint Completion Status Pie Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Sprint Completion Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sprint_velocity_data.map((sprint: any) => ({
                      name: sprint.sprint,
                      value: sprint.completion_rate,
                      color: sprint.health_status === 'excellent' ? '#36B37E' : 
                             sprint.health_status === 'good' ? '#FF9D00' : '#E34850'
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sprint_velocity_data.map((sprint: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={sprint.health_status === 'excellent' ? '#36B37E' : 
                              sprint.health_status === 'good' ? '#FF9D00' : '#E34850'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Completion Rate']} />
                </PieChart>
              </ResponsiveContainer>
            </Grid>

            {/* Sprint Velocity Bar Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Sprint Velocity Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sprint_velocity_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [value, 'Tasks Completed']} />
                  <Legend />
                  <Bar dataKey="velocity" fill="#1473E6" name="Completed Tasks" />
                  <Bar dataKey="planned" fill="#BDBDBD" name="Planned Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            {/* Velocity Trends Line Chart */}
            {velocity_trends && Object.keys(velocity_trends).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Velocity Trends Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sprint_velocity_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sprint" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [value, 'Tasks']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="velocity" 
                      stroke="#1473E6" 
                      strokeWidth={3}
                      name="Actual Velocity" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="planned" 
                      stroke="#BDBDBD" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Planned Velocity" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
            )}

            {/* Burn-Down Bar Chart */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Burn-Down Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={burndown_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip formatter={(value: any, name: any) => [
                    name === 'completed' ? `${value} tasks completed` : 
                    name === 'remaining' ? `${value} tasks remaining` : 
                    name === 'blocked_tasks' ? `${value} blocked tasks` : value, 
                    name === 'completed' ? 'Completed' : 
                    name === 'remaining' ? 'Remaining' : 
                    name === 'blocked_tasks' ? 'Blocked' : name
                  ]} />
                  <Legend />
                  <Bar dataKey="completed" fill="#36B37E" name="Completed" />
                  <Bar dataKey="remaining" fill="#FF9D00" name="Remaining" />
                  <Bar dataKey="blocked_tasks" fill="#E34850" name="Blocked" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sprint Velocity Data */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🏃 Sprint Velocity Analysis
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sprint</TableCell>
                  <TableCell align="center">Planned</TableCell>
                  <TableCell align="center">Completed</TableCell>
                  <TableCell align="center">Velocity</TableCell>
                  <TableCell align="center">Completion Rate</TableCell>
                  <TableCell align="center">Health</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
                             <TableBody>
                 {sprint_velocity_data.map((sprint: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography fontWeight="bold">{sprint.sprint}</Typography>
                    </TableCell>
                    <TableCell align="center">{sprint.planned}</TableCell>
                    <TableCell align="center">{sprint.velocity}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <Speed sx={{ mr: 1 }} />
                        {sprint.velocity}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <LinearProgress
                          variant="determinate"
                          value={sprint.completion_rate}
                          sx={{ width: 60, mr: 1 }}
                        />
                        {sprint.completion_rate}%
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={getHealthIcon(sprint.health_status)}
                        label={sprint.health_status.replace('_', ' ')}
                        color={getHealthColor(sprint.health_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={sprint.trend_status.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Velocity Trends */}
      {velocity_trends && Object.keys(velocity_trends).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              📈 Velocity Trends Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" mb={2}>
                  {getTrendIcon(velocity_trends.trend_direction)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {velocity_trends.trend_direction.charAt(0).toUpperCase() + 
                     velocity_trends.trend_direction.slice(1)} Velocity
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Recent: {velocity_trends.recent_sprint} ({velocity_trends.recent_velocity} tasks)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Previous: {velocity_trends.previous_sprint} ({velocity_trends.previous_velocity} tasks)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Change: {velocity_trends.velocity_change > 0 ? '+' : ''}{velocity_trends.velocity_change} tasks
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Velocity: {velocity_trends.average_velocity} tasks/sprint
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Consistency: {velocity_trends.consistency}%
                </Typography>
                <Chip
                  label={`${velocity_trends.consistency_status} consistency`}
                  color={velocity_trends.consistency_status === 'high' ? 'success' : 
                         velocity_trends.consistency_status === 'moderate' ? 'warning' : 'error'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Burn-Down Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📉 Burn-Down Analysis
          </Typography>
          <Grid container spacing={2}>
            {burndown_data.map((sprint: any, index: number) => (
              <Grid item xs={12} md={4} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {sprint.sprint}
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Planned: {sprint.planned} | Completed: {sprint.completed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Remaining: {sprint.remaining} | Burn Rate: {sprint.burn_rate}%
                      </Typography>
                    </Box>
                    <Chip
                      icon={getHealthIcon(sprint.burn_health)}
                      label={sprint.burn_health}
                      color={getHealthColor(sprint.burn_health) as any}
                      size="small"
                    />
                    {sprint.blocked_tasks > 0 && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                        ⚠️ {sprint.blocked_tasks} blocked tasks ({sprint.blockage_rate}%)
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Capacity Planning */}
      {capacity_insights && Object.keys(capacity_insights).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              📊 Capacity Planning Insights
            </Typography>
            
            {/* Capacity Planning Chart */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Velocity Distribution & Capacity Planning
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      name: 'Min Velocity',
                      value: capacity_insights.minimum_velocity,
                      fill: '#E34850'
                    },
                    {
                      name: 'Avg Velocity',
                      value: capacity_insights.average_velocity,
                      fill: '#1473E6'
                    },
                    {
                      name: 'Max Velocity',
                      value: capacity_insights.maximum_velocity,
                      fill: '#36B37E'
                    },
                    {
                      name: 'Recommended',
                      value: capacity_insights.recommended_capacity,
                      fill: '#FF9D00'
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [value, 'Tasks per Sprint']} />
                    <Bar dataKey="value" fill="#1473E6" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Capacity Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Average Velocity
                    </Typography>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {capacity_insights.average_velocity}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Recommended Capacity
                    </Typography>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {capacity_insights.recommended_capacity}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Velocity Range
                    </Typography>
                    <Typography variant="h6" color="text.primary" fontWeight="bold">
                      {capacity_insights.velocity_range}
                    </Typography>
                  </Box>
                  {capacity_insights.predicted_next_sprint && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Predicted Next Sprint
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {capacity_insights.predicted_next_sprint}
                      </Typography>
                    </Box>
                  )}
                  <Chip
                    label={`${capacity_insights.capacity_status} capacity`}
                    color={capacity_insights.capacity_status === 'normal' ? 'success' : 
                           capacity_insights.capacity_status === 'low' ? 'error' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            💡 Recommendations
          </Typography>
          <List>
            {recommendations.map((recommendation: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <Lightbulb color="primary" />
                </ListItemIcon>
                <ListItemText primary={recommendation} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Process Improvements */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🔧 Process Improvements
          </Typography>
          <List>
            {process_improvements.map((improvement: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <Assessment color="info" />
                </ListItemIcon>
                <ListItemText primary={improvement} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SprintVelocityReport;
