import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';

interface DefectData {
  period: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  resolved: number;
  qualityScore: number;
  resolutionRate: number;
  defectDensity: number;
  escapeRate: number;
  avgResolutionTime: number;
  criticalRatio: number;
}

interface QualityMetrics {
  overallQualityScore: number;
  defectDensity: number;
  escapeRate: number;
  avgResolutionTime: number;
  criticalDefectRatio: number;
  qualityGates: {
    defectDensity: { status: string; score: number };
    escapeRate: { status: string; score: number };
    criticalDefect: { status: string; score: number };
    resolutionTime: { status: string; score: number };
  };
  overallGateScore: number;
  qualityImpact: number;
  preventionEffectiveness: {
    requirements: number;
    design: number;
    coding: number;
    testing: number;
  };
}

interface DefectDensityQualityProps {
  selectedProject?: string;
  selectedTimeRange?: string;
  projects?: any[];
}

const DefectDensityQuality: React.FC<DefectDensityQualityProps> = ({ 
  selectedProject, 
  selectedTimeRange,
  projects = []
}) => {
  const [defectData, setDefectData] = useState<DefectData[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get date range based on selected time range
  const getDateRange = () => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (selectedTimeRange) {
      case 'last6Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'currentMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'currentWeek':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      default:
        // Default to last 6 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const fetchQualityData = useCallback(async () => {
    // If no project is selected, try to use the first project from the list
    let projectToAnalyze = selectedProject;
    
    if (!projectToAnalyze && projects.length > 0) {
      const firstProject = projects[0];
      projectToAnalyze = firstProject.projectId || firstProject._id || firstProject.id;
    }
    
    if (!projectToAnalyze) {
      setError('No project selected');
      return;
    }

    setLoading(true);
    setError(null);
    setDefectData([]);
    setQualityMetrics(null);

    try {
      const { startDate, endDate } = getDateRange();
      console.log('Fetching quality data for project:', projectToAnalyze);
      console.log('Date range:', { startDate, endDate });

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/jira-imports/project/${encodeURIComponent(projectToAnalyze)}/quality-metrics?${params.toString()}`, {
        credentials: 'include'
      });

      const result = await response.json();
      console.log('Quality metrics API response:', result);

      if (!result.success) {
        setError(result.message || 'Failed to fetch quality metrics data');
        setLoading(false);
        return;
      }

      const data = result.data;
      console.log('Quality data:', data);

      if (!data || !data.defectData || data.defectData.length === 0) {
        setError('No quality metrics data found for this project and time range.');
        setLoading(false);
        return;
      }

      setDefectData(data.defectData);
      setQualityMetrics(data.qualityMetrics);

    } catch (err) {
      console.error('Error fetching quality metrics data:', err);
      setError('Failed to fetch quality metrics data.');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, projects, selectedTimeRange]);

  useEffect(() => {
    // Fetch data if we have a selected project OR if we have projects but no selected project (auto-select first)
    if (selectedProject || projects.length > 0) {
      fetchQualityData();
    }
  }, [selectedProject, selectedTimeRange, projects, fetchQualityData]);

  const getGateStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!selectedProject && projects.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Defect Density & Quality Metrics
        </Typography>
        <Alert severity="info">
          Please select a project to view quality metrics data.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Defect Density & Quality Metrics
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {defectData.length > 0 && !loading && !error && (
        <>
          {/* Main Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={defectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" label={{ value: 'Defect Count', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Quality Score (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                formatter={(value: any, name: any) => {
                  if (name === 'qualityScore') return [value, 'Quality Score (%)'];
                  if (name === 'resolutionRate') return [value, 'Resolution Rate (%)'];
                  if (name === 'critical') return [value, 'Critical Defects'];
                  if (name === 'high') return [value, 'High Priority'];
                  if (name === 'medium') return [value, 'Medium Priority'];
                  if (name === 'low') return [value, 'Low Priority'];
                  return [value, name];
                }}
              />
              <Legend />
              {/* Stacked Bar Chart for Defects */}
              <Bar yAxisId="left" dataKey="critical" stackId="a" fill="#E34850" name="Critical" />
              <Bar yAxisId="left" dataKey="high" stackId="a" fill="#FF9D00" name="High" />
              <Bar yAxisId="left" dataKey="medium" stackId="a" fill="#FFD700" name="Medium" />
              <Bar yAxisId="left" dataKey="low" stackId="a" fill="#36B37E" name="Low" />
              {/* Quality Score Trend Line */}
              <Line yAxisId="right" type="monotone" dataKey="qualityScore" stroke="#1473E6" strokeWidth={3} dot name="Quality Score" />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Quality Metrics Summary */}
          {qualityMetrics && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quality Metrics Summary
              </Typography>
              
              <Grid container spacing={3}>
                {/* Overall Quality Score */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: qualityMetrics.overallQualityScore >= 80 ? '#e8f5e8' : qualityMetrics.overallQualityScore >= 60 ? '#fff3e0' : '#ffebee' }}>
                    <Typography variant="h4" color={qualityMetrics.overallQualityScore >= 80 ? 'success.main' : qualityMetrics.overallQualityScore >= 60 ? 'warning.main' : 'error.main'}>
                      {qualityMetrics.overallQualityScore.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overall Quality Score
                    </Typography>
                  </Paper>
                </Grid>

                {/* Defect Density */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={qualityMetrics.defectDensity <= 0.1 ? 'success.main' : qualityMetrics.defectDensity <= 0.2 ? 'warning.main' : 'error.main'}>
                      {qualityMetrics.defectDensity.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Defect Density
                    </Typography>
                  </Paper>
                </Grid>

                {/* Escape Rate */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={qualityMetrics.escapeRate <= 5 ? 'success.main' : qualityMetrics.escapeRate <= 10 ? 'warning.main' : 'error.main'}>
                      {qualityMetrics.escapeRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Defect Escape Rate
                    </Typography>
                  </Paper>
                </Grid>

                {/* Resolution Time */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={qualityMetrics.avgResolutionTime <= 7 ? 'success.main' : qualityMetrics.avgResolutionTime <= 14 ? 'warning.main' : 'error.main'}>
                      {qualityMetrics.avgResolutionTime.toFixed(1)}d
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Resolution Time
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Quality Gates */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quality Gates Assessment
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Defect Density Gate (≤0.1)</Typography>
                      <Chip 
                        label={qualityMetrics.qualityGates.defectDensity.status} 
                        color={getGateStatusColor(qualityMetrics.qualityGates.defectDensity.status)}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Escape Rate Gate (≤5%)</Typography>
                      <Chip 
                        label={qualityMetrics.qualityGates.escapeRate.status} 
                        color={getGateStatusColor(qualityMetrics.qualityGates.escapeRate.status)}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Critical Defect Gate (≤10%)</Typography>
                      <Chip 
                        label={qualityMetrics.qualityGates.criticalDefect.status} 
                        color={getGateStatusColor(qualityMetrics.qualityGates.criticalDefect.status)}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">Resolution Time Gate (≤7d)</Typography>
                      <Chip 
                        label={qualityMetrics.qualityGates.resolutionTime.status} 
                        color={getGateStatusColor(qualityMetrics.qualityGates.resolutionTime.status)}
                        size="small"
                      />
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color={qualityMetrics.overallGateScore >= 75 ? 'success.main' : qualityMetrics.overallGateScore >= 50 ? 'warning.main' : 'error.main'}>
                    Overall Gate Score: {qualityMetrics.overallGateScore.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>

              {/* Prevention Effectiveness */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Defect Prevention Effectiveness
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main">
                        {qualityMetrics.preventionEffectiveness.requirements.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requirements
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main">
                        {qualityMetrics.preventionEffectiveness.design.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Design
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main">
                        {qualityMetrics.preventionEffectiveness.coding.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coding
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color="primary.main">
                        {qualityMetrics.preventionEffectiveness.testing.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Testing
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </>
      )}

      {defectData.length === 0 && !loading && !error && (
        <Alert severity="info">
          No quality metrics data found for this project.
        </Alert>
      )}
    </Paper>
  );
};

export default DefectDensityQuality; 