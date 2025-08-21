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
  Business,
  AttachMoney,
  Schedule,
  Security,
  Star,
  Flag,
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

interface ExecutiveSummaryReportProps {
  data: any;
}

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850', '#0066CC', '#BDBDBD', '#8B5CF6', '#10B981'];

const ExecutiveSummaryReport: React.FC<ExecutiveSummaryReportProps> = ({ data }) => {
  // Extract data from the new structure
  const executive_overview = data.metrics?.executive_overview || {};
  const portfolio_health = data.metrics?.portfolio_health || {};
  const critical_risk_assessment = data.metrics?.critical_risk_assessment || {};
  const strategic_insights = data.metrics?.strategic_insights || [];
  const executive_decisions = data.metrics?.executive_decisions || {};
  const financial_impact = data.metrics?.financial_impact || {};
  const next_steps_timeline = data.metrics?.next_steps_timeline || {};
  const recommendations = data.recommendations || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'low':
        return 'success';
      case 'good':
      case 'moderate':
        return 'warning';
      case 'fair':
      case 'poor':
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle color="success" />;
      case 'good':
        return <CheckCircle color="warning" />;
      case 'fair':
      case 'poor':
        return <Warning color="error" />;
      case 'low':
        return <CheckCircle color="success" />;
      case 'moderate':
        return <Warning color="warning" />;
      case 'high':
        return <Error color="error" />;
      default:
        return <Assessment />;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📈 Executive Summary Report for Leadership
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Generated on {new Date(data.generatedAt).toLocaleString()}
      </Typography>

      {/* Executive Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🎯 Executive Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {executive_overview.total_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Projects
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {executive_overview.on_track_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  On-Track ({executive_overview.on_track_percentage}%)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {executive_overview.issues_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  With Issues ({executive_overview.issues_percentage}%)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  {executive_overview.critical_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical ({executive_overview.critical_percentage}%)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Portfolio Health Assessment */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🏥 Portfolio Health Assessment
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Overall Health Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {portfolio_health.health_score}/100
                  </Typography>
                  <Chip
                    icon={getStatusIcon(portfolio_health.health_status)}
                    label={portfolio_health.health_status.toUpperCase()}
                    color={getStatusColor(portfolio_health.health_status) as any}
                    size="medium"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={portfolio_health.health_score} 
                  sx={{ height: 10, borderRadius: 5 }}
                  color={portfolio_health.health_score >= 80 ? 'success' : portfolio_health.health_score >= 60 ? 'warning' : 'error'}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {portfolio_health.average_completion}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Completion
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {portfolio_health.average_quality}/100
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Quality
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {portfolio_health.average_velocity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Velocity
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {executive_overview.total_projects}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Projects
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
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
            {/* Project Status Distribution Pie Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Project Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'On-Track', value: executive_overview.on_track_projects, fill: '#36B37E' },
                      { name: 'With Issues', value: executive_overview.issues_projects, fill: '#FF9D00' },
                      { name: 'Critical', value: executive_overview.critical_projects, fill: '#E34850' }
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
                      { name: 'On-Track', fill: '#36B37E' },
                      { name: 'With Issues', fill: '#FF9D00' },
                      { name: 'Critical', fill: '#E34850' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Projects']} />
                </PieChart>
              </ResponsiveContainer>
            </Grid>

            {/* Portfolio Health Metrics Bar Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Portfolio Health Metrics
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  {
                    name: 'Completion',
                    value: portfolio_health.average_completion,
                    target: 80,
                    color: portfolio_health.average_completion >= 80 ? '#36B37E' : portfolio_health.average_completion >= 60 ? '#FF9D00' : '#E34850'
                  },
                  {
                    name: 'Quality',
                    value: portfolio_health.average_quality,
                    target: 85,
                    color: portfolio_health.average_quality >= 85 ? '#36B37E' : portfolio_health.average_quality >= 70 ? '#FF9D00' : '#E34850'
                  },
                  {
                    name: 'Velocity',
                    value: portfolio_health.average_velocity,
                    target: 8,
                    color: portfolio_health.average_velocity >= 8 ? '#36B37E' : portfolio_health.average_velocity >= 5 ? '#FF9D00' : '#E34850'
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [value, 'Score']} />
                  <Bar 
                    dataKey="value" 
                    fill="#1473E6"
                    name="Current Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Critical Risk Assessment */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            ⚠️ Critical Risk Assessment
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: critical_risk_assessment.risk_level === 'high' ? 'error.main' : critical_risk_assessment.risk_level === 'medium' ? 'warning.main' : 'success.main', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Portfolio Risk Level
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getStatusIcon(critical_risk_assessment.risk_level)}
                  <Typography variant="h5" fontWeight="bold">
                    {critical_risk_assessment.risk_level.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {critical_risk_assessment.critical_project_count} critical projects identified
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Risk Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {critical_risk_assessment.has_critical_projects 
                    ? `Portfolio has ${critical_risk_assessment.critical_project_count} critical projects requiring immediate attention`
                    : "No critical projects identified - Portfolio is in good health"
                  }
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Critical Projects Table */}
          {critical_risk_assessment.has_critical_projects && critical_risk_assessment.critical_projects.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Critical Projects Details
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell align="center">Completion</TableCell>
                      <TableCell align="center">Quality</TableCell>
                      <TableCell align="center">Velocity</TableCell>
                      <TableCell align="center">Risk Factors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {critical_risk_assessment.critical_projects.map((project: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{project.project_name}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${project.completion_percentage}%`}
                            size="small"
                            color={project.completion_percentage < 30 ? 'error' : project.completion_percentage < 50 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${project.quality_score}/100`}
                            size="small"
                            color={project.quality_score < 60 ? 'error' : project.quality_score < 70 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="center">{project.sprint_velocity}</TableCell>
                        <TableCell align="center">
                          {project.risk_factors.map((factor: string, idx: number) => (
                            <Chip
                              key={idx}
                              label={factor.replace(/_/g, ' ')}
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
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            💡 Strategic Insights
          </Typography>
          <List>
            {strategic_insights.map((insight: string, index: number) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <Lightbulb color="primary" />
                </ListItemIcon>
                <ListItemText primary={insight} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Executive Decisions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            🎯 Executive Decisions Required
          </Typography>
          <Grid container spacing={2}>
            {executive_decisions.immediate_decisions && executive_decisions.immediate_decisions.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'error.main', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="error" gutterBottom>
                    🚨 Immediate Decisions
                  </Typography>
                  <List dense>
                    {executive_decisions.immediate_decisions.map((decision: string, index: number) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <Flag color="error" />
                        </ListItemIcon>
                        <ListItemText primary={decision} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>
            )}
            
            {executive_decisions.quality_decisions && executive_decisions.quality_decisions.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'warning.main', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                    🔧 Quality Decisions
                  </Typography>
                  <List dense>
                    {executive_decisions.quality_decisions.map((decision: string, index: number) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <Star color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={decision} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>
            )}
            
            {executive_decisions.resource_decisions && executive_decisions.resource_decisions.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'info.main', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="info.main" gutterBottom>
                    👥 Resource Decisions
                  </Typography>
                  <List dense>
                    {executive_decisions.resource_decisions.map((decision: string, index: number) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <Group color="info" />
                        </ListItemIcon>
                        <ListItemText primary={decision} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>
            )}
            
            {executive_decisions.monitoring_decisions && executive_decisions.monitoring_decisions.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                    📊 Monitoring Decisions
                  </Typography>
                  <List dense>
                    {executive_decisions.monitoring_decisions.map((decision: string, index: number) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <Assessment color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={decision} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Impact */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            💰 Financial Impact Assessment
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Portfolio Risk Value
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  ${financial_impact.estimated_portfolio_risk_value}M
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estimated financial risk exposure
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: getStatusColor(financial_impact.financial_risk_status) + '.main', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Financial Risk Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(financial_impact.financial_risk_status)}
                  <Typography variant="h5" fontWeight="bold">
                    {financial_impact.financial_risk_status.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {financial_impact.financial_risk_status === 'high' && 'Immediate attention required'}
                  {financial_impact.financial_risk_status === 'moderate' && 'Monitor closely'}
                  {financial_impact.financial_risk_status === 'low' && 'Portfolio financially stable'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Next Steps Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📅 Next Steps and Timeline
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Schedule color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  This Week
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {next_steps_timeline.this_week}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Timeline color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Next Week
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {next_steps_timeline.next_week}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Business color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  This Month
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {next_steps_timeline.this_month}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <TrendingUp color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Next Quarter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {next_steps_timeline.next_quarter}
                </Typography>
              </Box>
            </Grid>
          </Grid>
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

export default ExecutiveSummaryReport;
