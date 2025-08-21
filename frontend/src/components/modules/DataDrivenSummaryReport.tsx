import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import summaryReportService, { SummaryReportRequest } from '../../services/summaryReport.service';

interface PortfolioMetrics {
  totalProjects: number;
  onTrackProjects: number;
  issuesProjects: number;
  criticalProjects: number;
  averageCompletion: number;
  averageQuality: number;
  averageVelocity: number;
  highRiskProjects: number;
  mediumRiskProjects: number;
  lowRiskProjects: number;
}

interface ProjectData {
  projectId: string;
  projectName: string;
  status: string;
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  sprintVelocity: number;
  qualityScore: number;
  riskLevel: string;
  lastUpdated: string;
}

interface SummaryData {
  portfolioMetrics: PortfolioMetrics;
  projects: ProjectData[];
  recommendations: string[];
  generatedAt: string;
}

const DataDrivenSummaryReport: React.FC = () => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const request: SummaryReportRequest = {
        ...(selectedSprint && { sprint: selectedSprint }),
        ...(selectedProject && { project: selectedProject }),
        includeMetrics: true,
      };

      const summaryData = await summaryReportService.getSummaryData(request);
      setData(summaryData);
    } catch (err: any) {
      console.error('Error fetching summary data:', err);
      setError(err.message || 'Failed to fetch summary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSprint, selectedProject]);

  const handleProjectChange = (e: SelectChangeEvent) => {
    const newProject = e.target.value;
    setSelectedProject(newProject);
    if (newProject === "") {
      setSelectedSprint("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'success';
      case 'slight-issues': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track': return <CheckCircleIcon color="success" />;
      case 'slight-issues': return <WarningIcon color="warning" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <ScheduleIcon />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No data available. Please try refreshing or adjusting your filters.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            Data-Driven Summary Report
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh Data
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Sprint Filter</InputLabel>
              <Select
                value={selectedSprint}
                label="Sprint Filter"
                onChange={(e) => setSelectedSprint(e.target.value)}
              >
                <MenuItem value="">All Sprints</MenuItem>
                <MenuItem value="sprint-1">Sprint-1</MenuItem>
                <MenuItem value="sprint-2">Sprint-2</MenuItem>
                <MenuItem value="sprint-3">Sprint-3</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Project Filter</InputLabel>
              <Select
                value={selectedProject}
                label="Project Filter"
                onChange={handleProjectChange}
              >
                <MenuItem value="">All Projects</MenuItem>
                <MenuItem value="Adani">Adani</MenuItem>
                <MenuItem value="Mobile App">Mobile App</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Portfolio Metrics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Portfolio Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Projects
                </Typography>
                <Typography variant="h4">
                  {data.portfolioMetrics.totalProjects}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  On Track
                </Typography>
                <Typography variant="h4" color="success.main">
                  {data.portfolioMetrics.onTrackProjects}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  With Issues
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {data.portfolioMetrics.issuesProjects}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Critical
                </Typography>
                <Typography variant="h4" color="error.main">
                  {data.portfolioMetrics.criticalProjects}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Average Completion
            </Typography>
            <Box display="flex" alignItems="center">
              <LinearProgress
                variant="determinate"
                value={data.portfolioMetrics.averageCompletion}
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <Typography variant="body2">
                {data.portfolioMetrics.averageCompletion.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Average Quality Score
            </Typography>
            <Box display="flex" alignItems="center">
              <LinearProgress
                variant="determinate"
                value={data.portfolioMetrics.averageQuality}
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <Typography variant="body2">
                {data.portfolioMetrics.averageQuality.toFixed(1)}/100
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Average Velocity
            </Typography>
            <Typography variant="h6">
              {data.portfolioMetrics.averageVelocity.toFixed(1)} tasks/sprint
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Project Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Project Details
        </Typography>
        <Grid container spacing={2}>
          {data.projects.map((project) => (
            <Grid item xs={12} md={6} key={project.projectId}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {project.projectName}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(project.status)}
                      <Chip
                        label={project.status}
                        color={getStatusColor(project.status) as any}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Completion
                      </Typography>
                      <Typography variant="h6">
                        {project.completionPercentage}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={project.completionPercentage}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Quality Score
                      </Typography>
                      <Typography variant="h6">
                        {project.qualityScore}/100
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={project.qualityScore}
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Total Tasks
                        </Typography>
                        <Typography variant="body1">
                          {project.totalTasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Completed
                        </Typography>
                        <Typography variant="body1">
                          {project.completedTasks}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Velocity
                        </Typography>
                        <Typography variant="body1">
                          {project.sprintVelocity}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box mt={2}>
                    <Chip
                      label={`Risk: ${project.riskLevel}`}
                      color={getRiskColor(project.riskLevel) as any}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recommendations */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recommendations
        </Typography>
        <List>
          {data.recommendations.map((recommendation, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <AssessmentIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={recommendation} />
            </ListItem>
          ))}
        </List>
        <Typography variant="caption" color="textSecondary">
          Generated at: {formatDate(data.generatedAt)}
        </Typography>
      </Paper>
    </Box>
  );
};

export default DataDrivenSummaryReport;
