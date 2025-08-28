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

interface SprintVelocityData {
  sprint: string;
  startDate: string;
  endDate: string;
  planned: number;
  completed: number;
  totalIssues: number;
  completedIssues: number;
  goalMet: boolean;
  reportId: string;
}

interface SprintVelocityTrendProps {
  selectedProject?: string;
  selectedTimeRange?: string;
  projects?: any[];
}

// --- Calculations ---
function getMovingAverage(data: number[], n: number) {
  return data.map((_, i, arr) =>
    i < n - 1 ? null : +(arr.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n).toFixed(2)
  );
}

function getStdDev(arr: number[], mean: number) {
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

const SprintVelocityTrend: React.FC<SprintVelocityTrendProps> = ({ 
  selectedProject, 
  selectedTimeRange,
  projects = []
}) => {
  const [velocityData, setVelocityData] = useState<SprintVelocityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

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

  const fetchVelocityData = async () => {
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
    setVelocityData([]);
    setMetrics(null);

    try {
      const { startDate, endDate } = getDateRange();
      console.log('Fetching sprint velocity for project:', projectToAnalyze);
      console.log('Date range:', { startDate, endDate });

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/jira-imports/project/${encodeURIComponent(projectToAnalyze)}/sprint-velocity?${params.toString()}`, {
        credentials: 'include'
      });

      const result = await response.json();
      console.log('Sprint velocity API response:', result);

      if (!result.success) {
        setError(result.message || 'Failed to fetch sprint velocity data');
        setLoading(false);
        return;
      }

      const data = result.data || [];
      console.log('Sprint velocity data:', data);

      if (!data.length) {
        setError('No sprint velocity data found for this project and time range.');
        setLoading(false);
        return;
      }

      setVelocityData(data);

      // Calculate metrics
      const completedArr = data.map((d: SprintVelocityData) => d.completed);
      const plannedArr = data.map((d: SprintVelocityData) => d.planned);
      const movingAvg = getMovingAverage(completedArr, 3);

      const meanVelocity = +(completedArr.reduce((a: number, b: number) => a + b, 0) / completedArr.length).toFixed(2);
      const stdDev = getStdDev(completedArr, meanVelocity);
      const lowerBound = +(meanVelocity - stdDev * 0.8).toFixed(2);
      const upperBound = +(meanVelocity + stdDev * 0.8).toFixed(2);

      const velocityTrend = completedArr.length > 1
        ? +(((completedArr[completedArr.length - 1] - completedArr[completedArr.length - 2]) / completedArr[completedArr.length - 2]) * 100).toFixed(2)
        : 0;

      const commitmentRatio = plannedArr.length > 0
        ? +((completedArr[completedArr.length - 1] / plannedArr[plannedArr.length - 1]) * 100).toFixed(2)
        : 0;

      const consistencyScore = meanVelocity
        ? +((stdDev / meanVelocity) * 100).toFixed(2)
        : 0;

      const recentTrend = completedArr[completedArr.length - 1] - completedArr[completedArr.length - 2];
      const previousTrend = completedArr[completedArr.length - 2] - completedArr[completedArr.length - 3];
      const acceleration = +(recentTrend - previousTrend).toFixed(2);

      const last = data[data.length - 1];
      const commitmentScore = Math.min(100, (last.completed / last.planned) * 100);
      const goalScore = last.goalMet ? 100 : 50;
      const sprintHealth = +(commitmentScore * 0.7 + goalScore * 0.3).toFixed(2);

      setMetrics({
        velocityTrend,
        commitmentRatio,
        consistencyScore,
        acceleration,
        lowerBound,
        upperBound,
        movingAvg: movingAvg[movingAvg.length - 1] || '-',
        sprintHealth,
        meanVelocity,
        stdDev
      });

    } catch (err) {
      console.error('Error fetching sprint velocity data:', err);
      setError('Failed to fetch sprint velocity data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data if we have a selected project OR if we have projects but no selected project (auto-select first)
    if (selectedProject || projects.length > 0) {
      fetchVelocityData();
    }
  }, [selectedProject, selectedTimeRange, projects]);

  // Prepare chart data
  const chartData = velocityData.map((d: SprintVelocityData, i: number) => {
    const completedArr = velocityData.map((item: SprintVelocityData) => item.completed);
    const movingAvg = getMovingAverage(completedArr, 3);
    const meanVelocity = +(completedArr.reduce((a: number, b: number) => a + b, 0) / completedArr.length).toFixed(2);
    const stdDev = getStdDev(completedArr, meanVelocity);
    const lowerBound = +(meanVelocity - stdDev * 0.8).toFixed(2);
    const upperBound = +(meanVelocity + stdDev * 0.8).toFixed(2);

    return {
      sprint: d.sprint,
      planned: d.planned,
      completed: d.completed,
      movingAvg: movingAvg[i],
      lowerBound,
      upperBound,
    };
  });

  if (!selectedProject && projects.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sprint Velocity Trend
        </Typography>
        <Alert severity="info">
          Please select a project to view sprint velocity data.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Sprint Velocity Trend
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

      {velocityData.length > 0 && !loading && !error && (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sprint" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: any) => {
                  if (name === 'completed') return [value, 'Actual Velocity'];
                  if (name === 'planned') return [value, 'Planned Velocity'];
                  if (name === 'movingAvg') return [value, 'Moving Average'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value: any) => {
                  if (value === 'completed') return 'Actual Velocity';
                  if (value === 'planned') return 'Planned Velocity';
                  if (value === 'movingAvg') return 'Moving Average';
                  return value;
                }}
              />
              {/* Confidence Interval */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke={undefined}
                fill="rgba(33,150,243,0.1)"
                activeDot={false}
                dot={false}
                isAnimationActive={false}
                baseLine={0}
                name="Confidence Interval"
              />
              {/* Actual Velocity */}
              <Line type="monotone" dataKey="completed" stroke="#1473E6" strokeWidth={3} dot />
              {/* Planned Velocity */}
              <Line type="monotone" dataKey="planned" stroke="#36B37E" strokeDasharray="6 3" strokeWidth={2} dot />
              {/* Moving Average */}
              <Line type="monotone" dataKey="movingAvg" stroke="#E34850" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          {metrics && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Velocity Trend:</strong> {metrics.velocityTrend}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Commitment Ratio:</strong> {metrics.commitmentRatio}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Consistency Score:</strong> {metrics.consistencyScore}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Velocity Acceleration:</strong> {metrics.acceleration}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Predictive Range:</strong> {metrics.lowerBound} - {metrics.upperBound}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Moving Average:</strong> {metrics.movingAvg}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Sprint Health Score:</strong> {metrics.sprintHealth}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Mean Velocity:</strong> {metrics.meanVelocity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Standard Deviation:</strong> {metrics.stdDev}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </>
      )}

      {velocityData.length === 0 && !loading && !error && (
        <Alert severity="info">
          No sprint velocity data found for this project.
        </Alert>
      )}
    </Paper>
  );
};

export default SprintVelocityTrend; 