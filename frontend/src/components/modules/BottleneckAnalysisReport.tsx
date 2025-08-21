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
  Block,
  Schedule,
  Person,
  Build,
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

interface BottleneckAnalysisReportProps {
  data: any;
}

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850', '#0066CC', '#BDBDBD', '#8B5CF6', '#10B981'];

const BottleneckAnalysisReport: React.FC<BottleneckAnalysisReportProps> = ({ data }) => {
  // Extract data from the new structure
  const executive_summary = data.metrics?.executive_summary || {};
  const project_analysis = data.metrics?.project_analysis || [];
  const recommendations = data.recommendations || [];
  const process_improvements = data.metrics?.process_improvements || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'critical':
        return <Error color="error" />;
      default:
        return <Assessment />;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        🔍 Bottleneck and Process Analysis Report
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
                <Typography variant="h4" color="error" fontWeight="bold">
                  {executive_summary.total_blocked}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Blocked Tasks
                </Typography>
                <Typography variant="caption" color="error">
                  ({executive_summary.blockage_rate}%)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning" fontWeight="bold">
                  {executive_summary.total_overdue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue Tasks
                </Typography>
                <Typography variant="caption" color="warning">
                  ({executive_summary.overdue_rate}%)
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Portfolio Status */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(executive_summary.portfolio_status)}
            <Typography variant="h6" fontWeight="bold">
              Portfolio Status: {executive_summary.portfolio_status.toUpperCase()}
            </Typography>
            <Chip
              label={executive_summary.portfolio_status}
              color={getStatusColor(executive_summary.portfolio_status) as any}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📊 Visual Analytics
          </Typography>
          <Grid container spacing={3}>
            {/* Task Status Distribution Pie Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Task Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Done', value: project_analysis.reduce((sum: number, p: any) => sum + p.task_distribution.done, 0), fill: '#36B37E' },
                      { name: 'In Progress', value: project_analysis.reduce((sum: number, p: any) => sum + p.task_distribution.in_progress, 0), fill: '#FF9D00' },
                      { name: 'Blocked', value: project_analysis.reduce((sum: number, p: any) => sum + p.task_distribution.blocked, 0), fill: '#E34850' },
                      { name: 'To Do', value: project_analysis.reduce((sum: number, p: any) => sum + p.task_distribution.todo, 0), fill: '#BDBDBD' },
                      { name: 'Overdue', value: project_analysis.reduce((sum: number, p: any) => sum + p.task_distribution.overdue, 0), fill: '#8B5CF6' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Done', fill: '#36B37E' },
                      { name: 'In Progress', fill: '#FF9D00' },
                      { name: 'Blocked', fill: '#E34850' },
                      { name: 'To Do', fill: '#BDBDBD' },
                      { name: 'Overdue', fill: '#8B5CF6' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Tasks']} />
                </PieChart>
              </ResponsiveContainer>
            </Grid>

            {/* Bottleneck Status Bar Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Project Bottleneck Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={project_analysis.map((project: any) => ({
                  name: project.project_id,
                  blockage_rate: project.bottleneck_analysis.blockage_rate,
                  status: project.bottleneck_analysis.status
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Blockage Rate']} />
                  <Bar 
                    dataKey="blockage_rate" 
                    fill="#E34850"
                    name="Blockage Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            {/* Flow Efficiency Line Chart */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Process Flow Efficiency by Project
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={project_analysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project_id" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Efficiency']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="process_flow.flow_efficiency" 
                    stroke="#36B37E" 
                    strokeWidth={3}
                    name="Flow Efficiency (%)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="process_flow.bottleneck_impact" 
                    stroke="#E34850" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Bottleneck Impact (%)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Project Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📋 Detailed Project Analysis
          </Typography>
          
          {project_analysis.map((project: any, index: number) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="h6" fontWeight="bold">
                    {project.project_id}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(project.bottleneck_analysis.status)}
                    label={`${project.bottleneck_analysis.blockage_rate}% blocked`}
                    color={getStatusColor(project.bottleneck_analysis.status) as any}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {project.total_tasks} total tasks
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Task Distribution */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Task Distribution
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Done</Typography>
                        <Typography variant="body2">{project.task_distribution.done} ({((project.task_distribution.done / project.total_tasks) * 100).toFixed(1)}%)</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(project.task_distribution.done / project.total_tasks) * 100} 
                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">In Progress</Typography>
                        <Typography variant="body2">{project.task_distribution.in_progress} ({((project.task_distribution.in_progress / project.total_tasks) * 100).toFixed(1)}%)</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(project.task_distribution.in_progress / project.total_tasks) * 100} 
                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                        color="warning"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Blocked</Typography>
                        <Typography variant="body2">{project.task_distribution.blocked} ({((project.task_distribution.blocked / project.total_tasks) * 100).toFixed(1)}%)</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(project.task_distribution.blocked / project.total_tasks) * 100} 
                        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.200' }}
                        color="error"
                      />
                    </Box>
                  </Grid>

                  {/* Bottleneck Analysis */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Bottleneck Analysis
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Flow Efficiency
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {project.process_flow.flow_efficiency}%
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Bottleneck Impact
                      </Typography>
                      <Typography variant="h5" color="error" fontWeight="bold">
                        {project.process_flow.bottleneck_impact}%
                      </Typography>
                    </Box>
                    
                    {/* Blocked Reasons */}
                    {Object.keys(project.bottleneck_analysis.blocked_reasons).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Common Blockage Reasons:
                        </Typography>
                        {Object.entries(project.bottleneck_analysis.blocked_reasons)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 3)
                          .map(([reason, count], idx) => (
                            <Chip
                              key={idx}
                              label={`${reason}: ${count}`}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                      </Box>
                    )}
                  </Grid>

                  {/* Resource Allocation */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Resource Allocation
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Assignee</TableCell>
                            <TableCell align="center">Total</TableCell>
                            <TableCell align="center">Done</TableCell>
                            <TableCell align="center">In Progress</TableCell>
                            <TableCell align="center">Blocked</TableCell>
                            <TableCell align="center">Blockage Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(project.resource_allocation).map(([assignee, data]: [string, any]) => (
                            <TableRow key={assignee}>
                              <TableCell>{assignee}</TableCell>
                              <TableCell align="center">{data.total}</TableCell>
                              <TableCell align="center">{data.done}</TableCell>
                              <TableCell align="center">{data.in_progress}</TableCell>
                              <TableCell align="center">{data.blocked}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${((data.blocked / data.total) * 100).toFixed(1)}%`}
                                  size="small"
                                  color={data.blocked / data.total > 0.3 ? 'error' : data.blocked / data.total > 0.1 ? 'warning' : 'success'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

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
                  <Build color="info" />
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

export default BottleneckAnalysisReport;
