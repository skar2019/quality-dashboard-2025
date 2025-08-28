import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  CircularProgress,
  Alert
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ResponsiveContainer } from 'recharts';

interface BurndownData {
  day: number;
  remaining: number;
  workAdded: number;
  ideal: number;
  completed: number;
}

interface BurndownMetrics {
  absoluteVariance: number;
  percentageVariance: string;
  currentBurnRate: string;
  projectedCompletionDay: number;
  daysOverUnder: number;
  completionProbability: number;
  healthScore: string;
  scopeImpactScore: string;
  pattern: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  sprintDuration: number;
}

interface BurndownResponse {
  burndownData: BurndownData[];
  metrics: BurndownMetrics;
  sprint: string;
  startDate: string;
  endDate: string;
}

interface BurndownAnalysisProps {
  selectedProject?: string;
  selectedTimeRange?: string;
  projects?: any[];
}

const BurndownAnalysis: React.FC<BurndownAnalysisProps> = ({ 
  selectedProject, 
  selectedTimeRange,
  projects = []
}) => {
  const [burndownData, setBurndownData] = useState<BurndownResponse | null>(null);
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

  const fetchBurndownData = async () => {
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
    setBurndownData(null);

    try {
      const { startDate, endDate } = getDateRange();
      console.log('Fetching burndown data for project:', projectToAnalyze);
      console.log('Date range:', { startDate, endDate });

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/jira-imports/project/${encodeURIComponent(projectToAnalyze)}/burndown?${params.toString()}`, {
        credentials: 'include'
      });

      const result = await response.json();
      console.log('Burndown API response:', result);

      if (!result.success) {
        setError(result.message || 'Failed to fetch burndown data');
        setLoading(false);
        return;
      }

      const data = result.data;
      console.log('Burndown data:', data);

      if (!data || !data.burndownData || data.burndownData.length === 0) {
        setError('No burndown data found for this project and time range.');
        setLoading(false);
        return;
      }

      setBurndownData(data);

    } catch (err) {
      console.error('Error fetching burndown data:', err);
      setError('Failed to fetch burndown data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data if we have a selected project OR if we have projects but no selected project (auto-select first)
    if (selectedProject || projects.length > 0) {
      fetchBurndownData();
    }
  }, [selectedProject, selectedTimeRange, projects]);

  // Prepare chart data with projected completion line
  const chartData = burndownData?.burndownData.map((d, i, arr) => ({
    ...d,
    projected: i === arr.length - 1 ? d.remaining : null,
  })) || [];

  if (!selectedProject && projects.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Burndown Analysis
        </Typography>
        <Alert severity="info">
          Please select a project to view burndown analysis data.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Burndown Analysis
        {burndownData && (
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            {burndownData.sprint} ({new Date(burndownData.startDate).toLocaleDateString()} - {new Date(burndownData.endDate).toLocaleDateString()})
          </Typography>
        )}
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

      {burndownData && !loading && !error && (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }} />
              <YAxis label={{ value: 'Story Points Remaining', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: any, name: any) => {
                  if (name === 'ideal') return [value, 'Ideal Burndown'];
                  if (name === 'remaining') return [value, 'Actual Burndown'];
                  if (name === 'projected') return [value, 'Projected Completion'];
                  if (name === 'workAdded') return [value, 'Work Added'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value: any) => {
                  if (value === 'ideal') return 'Ideal Burndown';
                  if (value === 'remaining') return 'Actual Burndown';
                  if (value === 'projected') return 'Projected Completion';
                  if (value === 'workAdded') return 'Work Added';
                  return value;
                }}
              />
              {/* Ideal Burndown */}
              <Line type="linear" dataKey="ideal" stroke="#6B6B6B" strokeWidth={2} dot={false} name="Ideal Burndown" />
              {/* Actual Burndown */}
              <Line type="monotone" dataKey="remaining" stroke="#1473E6" strokeWidth={3} dot name="Actual Burndown" />
              {/* Projected Completion */}
              <Line type="linear" dataKey="projected" stroke="#E34850" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Projected Completion" />
              {/* Work Added */}
              <Area type="stepAfter" dataKey="workAdded" stroke="#FF9D00" fill="rgba(255,157,0,0.2)" name="Work Added" />
            </LineChart>
          </ResponsiveContainer>

          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Absolute Variance:</strong> {burndownData.metrics.absoluteVariance}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Percentage Variance:</strong> {burndownData.metrics.percentageVariance}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Current Burn Rate:</strong> {burndownData.metrics.currentBurnRate}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Projected Completion Day:</strong> {burndownData.metrics.projectedCompletionDay}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Days Over/Under:</strong> {burndownData.metrics.daysOverUnder}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Completion Probability:</strong> {burndownData.metrics.completionProbability}%
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Sprint Health Score:</strong> {burndownData.metrics.healthScore}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Scope Impact Score:</strong> {burndownData.metrics.scopeImpactScore}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Work Pattern:</strong> {burndownData.metrics.pattern}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      )}

      {!burndownData && !loading && !error && (
        <Alert severity="info">
          No burndown analysis data found for this project.
        </Alert>
      )}
    </Paper>
  );
};

export default BurndownAnalysis; 