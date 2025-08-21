import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Avatar,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  MoreVert,
  Timeline,
  People,
  Assessment,
  CompareArrows,
  Lightbulb,
  Flag,
  Star,
  AttachMoney,
  Speed,
  Security,
  Cloud,
  Code,
  BugReport,
  Build,
  Group,
  Refresh,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Sector,
} from 'recharts';
import SprintVelocityTrend from './SprintVelocityTrend';
import BurndownAnalysis from './BurndownAnalysis';
import DefectDensityQuality from './DefectDensityQuality';

// Enhanced Project Portfolio Data
const projectPortfolio = [
  {
    name: 'Digital Transformation',
    status: 'on-track',
    progress: 75,
    team: 'Core Team A',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    risks: 2,
    quality: 92,
  },
  {
    name: 'Cloud Migration',
    status: 'at-risk',
    progress: 45,
    team: 'Infrastructure Team',
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    risks: 4,
    quality: 88,
  },
  {
    name: 'Security Enhancement',
    status: 'trouble',
    progress: 30,
    team: 'Security Team',
    startDate: '2024-03-01',
    endDate: '2024-09-30',
    risks: 6,
    quality: 85,
  },
];

// Enhanced Milestone Data with more details
const milestoneData = [
  {
    project: 'Digital Transformation',
    milestone: 'Phase 1 Completion',
    date: '2024-03-15',
    status: 'completed',
    impact: 'high',
    owner: 'John Smith',
    description: 'Core system modernization completed',
    deliverables: [
      'API Gateway Implementation',
      'Microservices Architecture',
      'Database Migration'
    ],
    metrics: {
      completion: 100,
      quality: 95,
      onTime: true
    },
    dependencies: ['Cloud Infrastructure', 'Security Framework']
  },
  {
    project: 'Cloud Migration',
    milestone: 'Infrastructure Setup',
    date: '2024-04-01',
    status: 'in-progress',
    impact: 'medium',
    owner: 'Sarah Johnson',
    description: 'Cloud infrastructure deployment and configuration',
    deliverables: [
      'Kubernetes Cluster Setup',
      'CI/CD Pipeline',
      'Monitoring Stack'
    ],
    metrics: {
      completion: 75,
      quality: 88,
      onTime: true
    },
    dependencies: ['Network Configuration', 'Security Policies']
  },
  {
    project: 'Security Enhancement',
    milestone: 'Security Audit',
    date: '2024-04-15',
    status: 'upcoming',
    impact: 'high',
    owner: 'Mike Brown',
    description: 'Comprehensive security assessment and compliance review',
    deliverables: [
      'Vulnerability Assessment',
      'Compliance Report',
      'Security Recommendations'
    ],
    metrics: {
      completion: 30,
      quality: 92,
      onTime: true
    },
    dependencies: ['Access Control System', 'Logging Infrastructure']
  }
];

// Enhanced Resource Utilization Data
const resourceData = [
  { team: 'Development', allocated: 85, available: 15, capacity: 100, utilization: 85 },
  { team: 'QA', allocated: 70, available: 30, capacity: 100, utilization: 70 },
  { team: 'DevOps', allocated: 90, available: 10, capacity: 100, utilization: 90 },
  { team: 'Security', allocated: 60, available: 40, capacity: 100, utilization: 60 },
];

// Enhanced Risk Data
const riskData = [
  { category: 'Technical', severity: 8, probability: 7, impact: 9, mitigation: 'In Progress' },
  { category: 'Resource', severity: 6, probability: 8, impact: 7, mitigation: 'Planned' },
  { category: 'Schedule', severity: 7, probability: 6, impact: 8, mitigation: 'Completed' },
  { category: 'Budget', severity: 5, probability: 5, impact: 6, mitigation: 'In Progress' },
];

// Enhanced Trend Data
const trendData = [
  { month: 'Jan', quality: 85, delivery: 90, velocity: 75, efficiency: 88 },
  { month: 'Feb', quality: 88, delivery: 92, velocity: 78, efficiency: 90 },
  { month: 'Mar', quality: 90, delivery: 95, velocity: 82, efficiency: 92 },
  { month: 'Apr', quality: 92, delivery: 93, velocity: 85, efficiency: 91 },
  { month: 'May', quality: 95, delivery: 96, velocity: 88, efficiency: 94 },
  { month: 'Jun', quality: 94, delivery: 97, velocity: 90, efficiency: 95 },
];

// Enhanced Benchmark Data
const benchmarkData = [
  { metric: 'Code Quality', current: 92, industry: 85, target: 95, trend: 'up' },
  { metric: 'Delivery Time', current: 88, industry: 82, target: 90, trend: 'up' },
  { metric: 'Team Velocity', current: 85, industry: 80, target: 88, trend: 'up' },
  { metric: 'Customer Satisfaction', current: 90, industry: 87, target: 93, trend: 'up' },
];

// Enhanced AI Recommendations
const aiRecommendations = [
  {
    title: 'Resource Reallocation',
    description: 'Consider redistributing QA resources to address bottleneck in Security team',
    priority: 'high',
    impact: 'Immediate',
    effort: 'Medium',
  },
  {
    title: 'Risk Mitigation',
    description: 'Implement additional security measures for Cloud Migration project',
    priority: 'medium',
    impact: 'Short-term',
    effort: 'High',
  },
  {
    title: 'Process Optimization',
    description: 'Streamline deployment process to improve delivery time',
    priority: 'low',
    impact: 'Long-term',
    effort: 'Low',
  },
];

// Team Performance Data
const teamPerformanceData = [
  { name: 'Core Team A', velocity: 85, quality: 92, collaboration: 88 },
  { name: 'Infrastructure Team', velocity: 78, quality: 88, collaboration: 85 },
  { name: 'Security Team', velocity: 82, quality: 90, collaboration: 87 },
];

// Quality Metrics Data
const qualityMetricsData = [
  { name: 'Code Coverage', value: 85 },
  { name: 'Test Pass Rate', value: 92 },
  { name: 'Bug Resolution', value: 88 },
  { name: 'Code Review', value: 90 },
];

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850'];

// Add filter options
const projectGroups = {
  all: 'All Projects',
  groupA: 'Projects A',
  groupB: 'Projects B',
} as const;

const timeRanges = {
  last6Months: 'Last 6 Months',
  last3Months: 'Last 3 Months',
  currentMonth: 'Current Month',
  currentWeek: 'Current Week',
} as const;

// Add new data structures for quality metrics
const qualityMetrics = {
  projectScores: [
    { name: 'Digital Transformation', score: 92, defects: 12, density: 0.8, planningGaps: 2, executionGaps: 5, testGaps: 5 },
    { name: 'Cloud Migration', score: 88, defects: 18, density: 1.2, planningGaps: 4, executionGaps: 8, testGaps: 6 },
    { name: 'Security Enhancement', score: 85, defects: 15, density: 1.0, planningGaps: 3, executionGaps: 7, testGaps: 5 }
  ],
  defectTrends: [
    { month: 'Jan', critical: 5, major: 8, minor: 12 },
    { month: 'Feb', critical: 3, major: 6, minor: 10 },
    { month: 'Mar', critical: 4, major: 7, minor: 9 },
    { month: 'Apr', critical: 2, major: 5, minor: 8 },
    { month: 'May', critical: 1, major: 4, minor: 7 },
    { month: 'Jun', critical: 2, major: 3, minor: 6 }
  ]
};

// Add data for cross-project visibility
const crossProjectData = {
  projects: [
    { name: 'Digital Transformation', progress: 75, risk: 'medium', team: ['John Smith', 'Sarah Johnson', 'Mike Brown'] },
    { name: 'Cloud Migration', progress: 45, risk: 'high', team: ['Alice White', 'Bob Green', 'Carol Blue'] },
    { name: 'Security Enhancement', progress: 30, risk: 'low', team: ['David Black', 'Eve Red', 'Frank Yellow'] }
  ],
  riskMatrix: [
    { category: 'Technical', probability: 0.7, impact: 0.8, risk: 'high' },
    { category: 'Resource', probability: 0.5, impact: 0.6, risk: 'medium' },
    { category: 'Schedule', probability: 0.3, impact: 0.4, risk: 'low' }
  ]
};

// Add data for integrations and complexity
const integrationData = {
  totalIntegrations: 15,
  projectComplexity: [
    { name: 'Digital Transformation', score: 85, integrations: 6, status: 'success' },
    { name: 'Cloud Migration', score: 78, integrations: 5, status: 'in-progress' },
    { name: 'Security Enhancement', score: 82, integrations: 4, status: 'failing' }
  ]
};

// Add data for test and QA metrics
const testMetrics = {
  projects: [
    { name: 'Digital Transformation', planned: 150, executed: 140, coverage: 92, regressions: 3 },
    { name: 'Cloud Migration', planned: 120, executed: 110, coverage: 88, regressions: 5 },
    { name: 'Security Enhancement', planned: 100, executed: 95, coverage: 85, regressions: 4 }
  ]
};

// Add data for sprint and planning quality
const sprintMetrics = {
  burnDown: [
    { sprint: 'Sprint 1', remaining: 100, completed: 0 },
    { sprint: 'Sprint 2', remaining: 75, completed: 25 },
    { sprint: 'Sprint 3', remaining: 50, completed: 50 },
    { sprint: 'Sprint 4', remaining: 25, completed: 75 },
    { sprint: 'Sprint 5', remaining: 0, completed: 100 }
  ],
  velocity: [
    { team: 'Team A', current: 85, previous: 80, target: 90 },
    { team: 'Team B', current: 78, previous: 75, target: 85 },
    { team: 'Team C', current: 82, previous: 80, target: 88 }
  ],
  planningAccuracy: [
    { project: 'Digital Transformation', estimated: 100, actual: 95, accuracy: 95 },
    { project: 'Cloud Migration', estimated: 80, actual: 85, accuracy: 94 },
    { project: 'Security Enhancement', estimated: 60, actual: 58, accuracy: 97 }
  ]
};

// Project interface
interface Project {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  projectId?: string; // For JIRA imports
  projectName?: string; // For JIRA imports
  // Optional fields for display
  progress?: number;
  team?: string;
  risks?: number;
  quality?: number;
}

// API response interface
interface ApiResponse {
  success: boolean;
  data: Project[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#E3F2FD',
  'In Progress': '#FF9D00',
  'In Review': '#0066CC',
  'Done': '#36B37E',
  'Blocked': '#E34850',
  'Other': '#BDBDBD',
};
const STATUS_LABEL_COLORS: Record<string, string> = {
  'To Do': '#1473E6', // Adobe Blue for label
  'In Progress': '#FF9D00', // Adobe Warning Orange
  'In Review': '#0066CC', // Adobe Info Blue
  'Done': '#36B37E', // Adobe Success Green
  'Blocked': '#E34850', // Adobe Error Red
  'Other': '#6B6B6B', // Adobe Secondary Text
};
const STATUS_LABELS = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];

const normalizeStatus = (status: string) => {
  if (!status) return 'Other';
  const s = status.trim().toLowerCase();
  if (s === 'to do' || s === 'todo') return 'To Do';
  if (s === 'in progress') return 'In Progress';
  if (s === 'in review') return 'In Review';
  if (s === 'done') return 'Done';
  if (s === 'blocked') return 'Blocked';
  return 'Other';
};

// Custom label for PieChart
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0 ? (
    <text
      x={x}
      y={y}
      fill={STATUS_LABEL_COLORS[name] || STATUS_LABEL_COLORS['Other']}
      fontSize={15}
      fontWeight={700}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ textShadow: '0 1px 2px #fff' }}
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const ExecutiveOverview: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['quality', 'delivery', 'velocity']);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('last6Months');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the correct endpoint for all projects
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      // Handle both paginated and non-paginated responses
      const projectsArray = Array.isArray(data) ? data : (data.data || []);
      setProjects(projectsArray);

      // Always auto-select and analyze the first project on load
      if (projectsArray.length > 0) {
        const firstProject = projectsArray[0];
        const firstProjectId = firstProject.projectId || firstProject._id || firstProject.id;
        setSelectedProject(firstProjectId);
        setAutoSelecting(true);
        setTimeout(() => {
          handleAnalyse(firstProjectId);
          setAutoSelecting(false);
          setAutoSelected(true);
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate project options for dropdown
  const getProjectOptions = () => {
    console.log('Dropdown projects:', projects);
    if (!Array.isArray(projects) || projects.length === 0) {
      return [{ value: '', label: 'No projects available' }];
    }

    const options: { value: string; label: string }[] = [];
    const seen = new Set();

    projects.forEach((project: any) => {
      const value = project?.projectId || project?._id || project?.id;
      const label = project?.projectName || project?.name || `Project ${value}`;
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({ value, label });
    });

    return options;
  };

  // Filter projects based on selected project
  const getFilteredProjects = () => {
    if (!Array.isArray(projects)) {
      return [];
    }
    
    if (selectedProject === 'all') {
      return projects;
    }
    return projects.filter(project => project._id === selectedProject);
  };

  // Calculate dynamic metrics based on projects
  const getDynamicMetrics = () => {
    const filteredProjects = getFilteredProjects();
    const totalProjects = filteredProjects.length;
    const activeTeams = new Set(filteredProjects.map(p => p.team)).size;
    const avgQuality = filteredProjects.length > 0 
      ? Math.round(filteredProjects.reduce((sum, p) => sum + (p.quality || 0), 0) / filteredProjects.length)
      : 0;

    return [
      { title: 'Total Projects', value: totalProjects.toString(), icon: <Code />, color: '#1473E6' },
      { title: 'Active Teams', value: activeTeams.toString(), icon: <Group />, color: '#36B37E' },
      { title: 'Quality Score', value: `${avgQuality}%`, icon: <BugReport />, color: '#0066CC' },
    ];
  };

  const handleRefresh = () => {
    fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger analysis when time range changes
  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      handleAnalyse();
    }
  }, [selectedTimeRange]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'on-track':
        return 'success';
      case 'at-risk':
      case 'pending':
        return 'warning';
      case 'trouble':
      case 'inactive':
      case 'completed':
        return 'error';
      default:
        return 'primary';
    }
  };

  const handleProjectChange = (event: SelectChangeEvent) => {
    setSelectedProject(event.target.value);
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setSelectedTimeRange(event.target.value);
  };

  // Filter data based on selected time range
  const getFilteredData = (data: any[]) => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));

    return data.filter(item => {
      const itemDate = new Date(item.date || item.month);
      switch (selectedTimeRange) {
        case 'last6Months':
          return itemDate >= sixMonthsAgo;
        case 'last3Months':
          return itemDate >= threeMonthsAgo;
        case 'currentMonth':
          return itemDate >= monthStart;
        case 'currentWeek':
          return itemDate >= weekStart;
        default:
          return true;
      }
    });
  };

  // Helper to get date range based on selectedTimeRange
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    switch (selectedTimeRange) {
      case 'last6Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'currentMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'currentWeek':
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        break;
      default:
        startDate = new Date(2000, 0, 1); // fallback: very early date
    }
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const handleAnalyse = async (projectId?: string) => {
    setStatusLoading(true);
    setStatusError(null);
    setStatusData([]);
    try {
      const projectToAnalyze = projectId || selectedProject;
      console.log('Analyzing project:', projectToAnalyze);
      
      // Calculate date range
      const { startDate, endDate } = getDateRange();
      console.log('Date range:', { startDate, endDate });
      
      // Fetch all issues for the project using the new endpoint
      const params = new URLSearchParams();
      params.append('limit', '10000');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/jira-imports/project/${encodeURIComponent(projectToAnalyze)}/issues?${params.toString()}`, {
        credentials: 'include'
      });
      const result = await response.json();
      
      console.log('API response:', result);
      
      if (!result.success) {
        setStatusError(result.message || 'Failed to fetch project issues');
        setStatusLoading(false);
        return;
      }
      
      const allIssues = result.data || [];
      console.log('Total issues found:', allIssues.length);
      
      if (!allIssues.length) {
        setStatusError('No issues found for this project and time range.');
        setStatusLoading(false);
        return;
      }
      
      // Calculate status distribution
      const statusCounts: Record<string, number> = {};
      let total = 0;
      let otherCount = 0;
      
      allIssues.forEach((issue: any) => {
        const label = normalizeStatus(issue.status);
        if (STATUS_LABELS.includes(label)) {
          statusCounts[label] = (statusCounts[label] || 0) + 1;
        } else {
          otherCount += 1;
        }
        total += 1;
      });
      
      if (otherCount > 0) statusCounts['Other'] = otherCount;
      
      console.log('Status distribution:', statusCounts);
      console.log('Total issues processed:', total);
      
      // Prepare data for PieChart
      const chartData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      })).filter(d => d.value > 0);
      
      setStatusData(chartData);
    } catch (err) {
      console.error('Error in handleAnalyse:', err);
      setStatusError('Failed to fetch status distribution.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Executive Overview Logo */}
          <Box
            sx={{
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg, #1473E6 0%, #0D5BB8 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(20, 115, 230, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '80%',
                height: '80%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
              }
            }}
          >
            {/* Dashboard Icon */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                {/* Dashboard Grid */}
                <rect x="4" y="4" width="8" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="14" y="4" width="8" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="24" y="4" width="4" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="4" y="14" width="8" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="14" y="14" width="8" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="24" y="14" width="4" height="8" rx="1" fill="white" opacity="0.9" />
                <rect x="4" y="24" width="8" height="4" rx="1" fill="white" opacity="0.9" />
                <rect x="14" y="24" width="8" height="4" rx="1" fill="white" opacity="0.9" />
                <rect x="24" y="24" width="4" height="4" rx="1" fill="white" opacity="0.9" />
                
                {/* Chart Lines */}
                <path d="M6 10L8 8L10 10L12 6" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M16 10L18 8L20 10L22 6" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M6 20L8 18L10 20L12 16" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M16 20L18 18L20 20L22 16" stroke="white" strokeWidth="1.5" fill="none" />
                
                {/* Data Points */}
                <circle cx="8" cy="8" r="1" fill="white" opacity="0.8" />
                <circle cx="18" cy="8" r="1" fill="white" opacity="0.8" />
                <circle cx="8" cy="18" r="1" fill="white" opacity="0.8" />
                <circle cx="18" cy="18" r="1" fill="white" opacity="0.8" />
              </svg>
            </Box>
          </Box>
          
          {/* Title with gradient text */}
          <Box>
            <Typography 
              variant="h4" 
              sx={{
                background: 'linear-gradient(135deg, #1473E6 0%, #0D5BB8 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                mb: 0.5
              }}
            >
              Executive Overview
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '1rem'
              }}
            >
              Strategic Project Portfolio Dashboard
              {autoSelecting && (
                <span style={{ marginLeft: '10px', color: '#1473E6', fontWeight: 'bold' }}>
                  • Auto-loading first project...
                </span>
              )}
            </Typography>
          </Box>
        </Box>
        
        <IconButton 
          onClick={handleRefresh} 
          disabled={loading}
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            '&:disabled': { bgcolor: 'grey.300' }
          }}
        >
          <Refresh />
        </IconButton>
      </Box>

      {/* Auto-selection Success Message */}
      {autoSelected && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setAutoSelected(false)}
        >
          First project automatically loaded! You can now select different projects or time ranges to analyze.
        </Alert>
      )}

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'flex-end', xs: 'stretch' },
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Select Project
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={selectedProject}
                onChange={handleProjectChange}
                displayEmpty
                disabled={loading}
              >
                {getProjectOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {loading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Loading projects...
              </Typography>
            )}
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Time Range
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={selectedTimeRange}
                onChange={handleTimeRangeChange}
                displayEmpty
              >
                {Object.entries(timeRanges).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ minWidth: { xs: '100%', md: 120 }, mt: { xs: 2, md: 0 } }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ height: 40, fontWeight: 600, fontSize: 16 }}
              onClick={(e) => {
                e.preventDefault();
                handleAnalyse();
              }}
              disabled={loading}
            >
              Analyse
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Issue Status Distribution Chart */}
      {statusLoading && (
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      )}
      {statusError && (
        <Box sx={{ my: 4 }}>
          <Alert severity="error">{statusError}</Alert>
        </Box>
      )}
      {statusData.length > 0 && !statusLoading && !statusError && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Issue Status Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                label={renderCustomizedLabel}
                isAnimationActive
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || STATUS_COLORS['Other']} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any, name: any, props: any) => {
                  const total = statusData.reduce((sum, d) => sum + d.value, 0);
                  const percent = total ? ((value / total) * 100).toFixed(0) : 0;
                  return [`${value} (${percent}%)`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, justifyContent: 'center' }}>
            {statusData.map((entry) => (
              <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: STATUS_COLORS[entry.name] || STATUS_COLORS['Other'], borderRadius: '50%', border: '1px solid #ccc' }} />
                <Typography variant="body2" fontWeight={600} color={STATUS_LABEL_COLORS[entry.name] || STATUS_LABEL_COLORS['Other']}>
                  {entry.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
      {statusData.length === 0 && !statusLoading && !statusError && (
        <Box sx={{ my: 4 }}>
          <Alert severity="info">No issue status data found for this project.</Alert>
        </Box>
      )}

      {/* Sprint Velocity Trend and Burndown Analysis - Side by Side */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SprintVelocityTrend 
            selectedProject={selectedProject}
            selectedTimeRange={selectedTimeRange}
            projects={projects}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <BurndownAnalysis 
            selectedProject={selectedProject}
            selectedTimeRange={selectedTimeRange}
            projects={projects}
          />
        </Grid>
      </Grid>

      {/* Defect Density & Quality Metrics */}
      <DefectDensityQuality 
        selectedProject={selectedProject}
        selectedTimeRange={selectedTimeRange}
        projects={projects}
      />

    </Box>
  );
};

export default ExecutiveOverview; 