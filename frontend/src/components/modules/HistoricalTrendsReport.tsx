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
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  ExpandMore,
  Analytics,
  ShowChart,
  Timeline as TimelineIcon,
  Group,
  Task,
  Psychology,
  TrendingUp as TrendingUpIcon,
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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface HistoricalTrendsReportProps {
  data: any;
}

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850', '#0066CC', '#BDBDBD', '#8B5CF6', '#10B981'];

const HistoricalTrendsReport: React.FC<HistoricalTrendsReportProps> = ({ data }) => {
  // Extract data from the new structure
  const executive_summary = data.metrics?.executive_summary || {};
  const sprint_analysis = data.metrics?.sprint_analysis || [];
  const task_type_analysis = data.metrics?.task_type_analysis || [];
  const team_performance = data.metrics?.team_performance || [];
  const predictive_analytics = data.metrics?.predictive_analytics || {};
  const risk_forecasting = data.metrics?.risk_forecasting || {};
  const capacity_planning = data.metrics?.capacity_planning || {};
  const recommendations = data.recommendations || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'outstanding':
      case 'improving':
      case 'optimal':
        return 'success';
      case 'good':
      case 'stable':
        return 'warning';
      case 'needs_attention':
      case 'needs_improvement':
      case 'needs_support':
      case 'declining':
      case 'low':
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'outstanding':
        return <CheckCircle color="success" />;
      case 'good':
        return <CheckCircle color="warning" />;
      case 'needs_attention':
      case 'needs_improvement':
      case 'needs_support':
        return <Warning color="error" />;
      case 'improving':
        return <TrendingUp color="success" />;
      case 'declining':
        return <TrendingDown color="error" />;
      case 'stable':
        return <TrendingFlat color="warning" />;
      default:
        return <Assessment />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUpIcon color="success" />;
      case 'declining':
        return <TrendingDown color="error" />;
      case 'stable':
        return <TrendingFlat color="warning" />;
      default:
        return <TimelineIcon />;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📈 Historical Trends and Predictive Analytics Report
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
            {/* Sprint Completion Trends Line Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Sprint Completion Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sprint_analysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Completion Rate']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="completion_rate" 
                    stroke="#36B37E" 
                    strokeWidth={3}
                    name="Completion Rate (%)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="flow_efficiency" 
                    stroke="#1473E6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Flow Efficiency (%)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grid>

            {/* Task Type Performance Bar Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Task Type Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={task_type_analysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="task_type" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Rate']} />
                  <Legend />
                  <Bar 
                    dataKey="completion_rate" 
                    fill="#36B37E"
                    name="Completion Rate (%)"
                  />
                  <Bar 
                    dataKey="blocked_rate" 
                    fill="#E34850"
                    name="Blockage Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            {/* Team Performance Area Chart */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Team Performance Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={team_performance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="assignee" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Rate']} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="completion_rate" 
                    stackId="1"
                    stroke="#36B37E" 
                    fill="#36B37E"
                    name="Completion Rate (%)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="blocked_rate" 
                    stackId="1"
                    stroke="#E34850" 
                    fill="#E34850"
                    name="Blockage Rate (%)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sprint Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📅 Sprint Analysis
          </Typography>
          <Grid container spacing={2}>
            {sprint_analysis.map((sprint: any, index: number) => (
              <Grid item xs={12} md={6} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {sprint.sprint}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(sprint.health_status)}
                        label={sprint.health_status.replace('_', ' ')}
                        color={getStatusColor(sprint.health_status) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Tasks
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {sprint.metrics.total}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Completed
                        </Typography>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {sprint.metrics.completed} ({sprint.completion_rate}%)
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Blocked
                        </Typography>
                        <Typography variant="h6" color="error.main" fontWeight="bold">
                          {sprint.metrics.blocked} ({sprint.blocked_rate}%)
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Flow Efficiency
                        </Typography>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          {sprint.flow_efficiency}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      {Object.keys(predictive_analytics).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              🔮 Predictive Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Completion Trend Analysis
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getTrendIcon(predictive_analytics.trend_direction)}
                    <Typography variant="h6" fontWeight="bold">
                      {predictive_analytics.trend_direction.toUpperCase()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Recent Sprints: {predictive_analytics.recent_completion}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Older Sprints: {predictive_analytics.older_completion}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Change: {predictive_analytics.completion_trend > 0 ? '+' : ''}{predictive_analytics.completion_trend} percentage points
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Prediction
                  </Typography>
                  <Typography variant="body1">
                    {predictive_analytics.prediction}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Risk Forecasting */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            ⚠️ Risk Forecasting
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'error.main', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="error" gutterBottom>
                  High Blockage Pattern
                </Typography>
                <Typography variant="h6" color="error" fontWeight="bold">
                  {risk_forecasting.high_blockage_count} sprints affected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sprints with &gt;15% blockage rate
                </Typography>
                {risk_forecasting.high_blockage_sprints && risk_forecasting.high_blockage_sprints.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Affected: {risk_forecasting.high_blockage_sprints.join(', ')}
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'warning.main', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                  Low Completion Pattern
                </Typography>
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  {risk_forecasting.low_completion_count} sprints affected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sprints with &lt;60% completion rate
                </Typography>
                {risk_forecasting.low_completion_sprints && risk_forecasting.low_completion_sprints.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Affected: {risk_forecasting.low_completion_sprints.join(', ')}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Capacity Planning */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📊 Capacity Planning
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Average Sprint Velocity
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {capacity_planning.average_velocity} tasks/sprint
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Predicted Capacity: {capacity_planning.predicted_capacity_min} - {capacity_planning.predicted_capacity_max} tasks/sprint
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Capacity Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(capacity_planning.capacity_status)}
                  <Typography variant="h6" fontWeight="bold">
                    {capacity_planning.capacity_status.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    switch (capacity_planning.capacity_status) {
                      case 'low':
                        return 'Consider team expansion or process improvement';
                      case 'high':
                        return 'Consider taking on additional work';
                      case 'optimal':
                        return 'Current capacity is well-balanced';
                      default:
                        return 'Capacity status unknown';
                    }
                  })()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            👥 Team Performance
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team Member</TableCell>
                  <TableCell align="center">Total Tasks</TableCell>
                  <TableCell align="center">Completion Rate</TableCell>
                  <TableCell align="center">Blockage Rate</TableCell>
                  <TableCell align="center">Velocity</TableCell>
                  <TableCell align="center">Performance</TableCell>
                  <TableCell align="center">Issues</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team_performance.map((member: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{member.assignee}</TableCell>
                    <TableCell align="center">{member.metrics.total}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${member.completion_rate}%`}
                        size="small"
                        color={member.completion_rate >= 80 ? 'success' : member.completion_rate >= 65 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${member.blocked_rate}%`}
                        size="small"
                        color={member.blocked_rate > 20 ? 'error' : member.blocked_rate > 10 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="center">{member.velocity}</TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={getStatusIcon(member.performance_status)}
                        label={member.performance_status.replace('_', ' ')}
                        color={getStatusColor(member.performance_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {member.issues.map((issue: string, idx: number) => (
                        <Chip
                          key={idx}
                          label={issue.replace('_', ' ')}
                          size="small"
                          color="error"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            💡 Strategic Recommendations
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
    </Box>
  );
};

export default HistoricalTrendsReport;
