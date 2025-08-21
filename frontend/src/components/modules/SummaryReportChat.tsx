import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Divider,
  Tooltip,
  Badge,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Send as SendIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import summaryReportService, { 
  SummaryReportResponse, 
  ProjectStatus, 
  SummaryReportRequest 
} from '../../services/summaryReport.service';
import SprintVelocityReport from './SprintVelocityReport';
import BottleneckAnalysisReport from './BottleneckAnalysisReport';
import HistoricalTrendsReport from './HistoricalTrendsReport';
import ExecutiveSummaryReport from './ExecutiveSummaryReport';

interface SummaryMessage {
  id: string;
  type: 'user' | 'bot' | 'summary';
  content: string | SummaryReportResponse;
  timestamp: Date;
  isLoading?: boolean;
}

const SummaryReportChat = React.forwardRef<any, {}>((props, ref) => {
  const [messages, setMessages] = useState<SummaryMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your RAG-powered Summary Report assistant. I can generate comprehensive reports including status summaries, bottleneck analysis, executive summaries, and predictive analytics. Use the quick actions below or ask for specific report types.',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<Array<{id: string, name: string}>>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  
  // Handle project selection change
  const handleProjectChange = (e: SelectChangeEvent) => {
    const newProject = e.target.value;
    setSelectedProject(newProject);
    
    // If "All Projects" is selected, clear sprint selection
    if (newProject === "") {
      setSelectedSprint("");
    }
  };
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSuggestedQuestion: (question: string) => {
      setInputText(question);
      
      // Auto-set sprint filter based on question content
      if (question.includes('Sprint-1')) {
        setSelectedSprint('sprint-1');
      } else if (question.includes('Sprint-2')) {
        setSelectedSprint('sprint-2');
      } else if (question.includes('Sprint-3')) {
        setSelectedSprint('sprint-3');
      }
      
      // Auto-set project filter based on question content
      if (availableProjects.length > 0) {
        const matchingProject = availableProjects.find(project => 
          question.toLowerCase().includes(project.name.toLowerCase())
        );
        if (matchingProject) {
          setSelectedProject(matchingProject.name);
        }
      }
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await summaryReportService.getStatus();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
  }, []);

  // Fetch projects from MongoDB on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const response = await fetch('/api/projects', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Summary Report - Projects API response:', data);
          
          // Handle different possible API response structures
          let projectsArray = [];
          if (Array.isArray(data)) {
            projectsArray = data;
          } else if (data && Array.isArray(data.data)) {
            projectsArray = data.data;
          } else if (data && Array.isArray(data.projects)) {
            projectsArray = data.projects;
          } else {
            console.warn('API response does not contain a valid projects array:', data);
            projectsArray = [];
          }
          
          // Format projects for dropdown
          const formattedProjects = projectsArray.map((project: any) => ({
            id: project.id || project._id || project.projectId,
            name: project.name || project.title || project.projectName || `Project ${project.id || project._id}`
          }));
          
          console.log('Summary Report - Formatted projects for dropdown:', formattedProjects);
          setAvailableProjects(formattedProjects);
        } else {
          console.error('Failed to fetch projects from API');
          // Fallback to empty array if API fails
          setAvailableProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setAvailableProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Warm up the ML service on first interaction
    if (connectionStatus === 'checking' || connectionStatus === 'disconnected') {
      try {
        await summaryReportService.getStatus();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to warm up ML service:', error);
        // Continue anyway, the main request might still work
      }
    }

    const userMessage: SummaryMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const botMessage: SummaryMessage = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Detect report type from user message
      const message = inputText.trim().toLowerCase();
      let reportType: string | undefined;
      
      if (message.includes('bottleneck') || message.includes('process analysis')) {
        reportType = 'bottleneck';
      } else if (message.includes('executive') || message.includes('leadership')) {
        reportType = 'executive';
      } else if (message.includes('historical') || message.includes('trends')) {
        reportType = 'historical';
      } else if (message.includes('predictive') || message.includes('forecast')) {
        reportType = 'predictive';
      } else if (message.includes('sprint velocity') || message.includes('burn-down') || message.includes('burndown') || message.includes('velocity')) {
        reportType = 'sprint_velocity';
      } else if (message.includes('status') || message.includes('overview')) {
        reportType = 'status';
      }
      
      // Also detect project-specific queries
      let detectedProject: string | undefined;
      if (availableProjects.length > 0) {
        const matchingProject = availableProjects.find(project => 
          message.toLowerCase().includes(project.name.toLowerCase())
        );
        if (matchingProject) {
          detectedProject = matchingProject.name;
        }
      }
      
      const request: SummaryReportRequest = {
        message: inputText.trim(),
        ...(selectedSprint && { sprint: selectedSprint }),
        ...(detectedProject && { project: detectedProject }),
        ...(selectedProject && !detectedProject && { project: selectedProject }),
        ...(reportType && { reportType }),
        includeMetrics: true,
      };

      const summaryData = await summaryReportService.getSummaryReport(request);
      
      // Check if the response contains structured data (summary report) or just text
      if (summaryData.projectStatuses && summaryData.projectStatuses.length > 0) {
        // It's a structured summary report
        const summaryMessage: SummaryMessage = {
          id: (Date.now() + 2).toString(),
          type: 'summary',
          content: summaryData,
          timestamp: new Date(),
        };

        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessage.id 
              ? { ...msg, content: 'Here\'s your summary report:', isLoading: false }
              : msg
          ).concat(summaryMessage)
        );
      } else {
        // It's a regular chat response
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessage.id 
              ? { ...msg, content: summaryData.summary || 'I can help you with summary reports. Try asking for a "summary report" or "project status overview".', isLoading: false }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Summary report error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to get summary report. Please try again.';
      let errorResponseText = 'Sorry, I encountered an error generating the summary report. Please try again.';
      
      if (err.message) {
        if (err.message.includes('timeout') || err.message.includes('ECONNABORTED')) {
          errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
          errorResponseText = 'Sorry, the request timed out. Please try again with a simpler question or check your connection.';
        } else if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection failed. Please check your internet connection and try again.';
          errorResponseText = 'Sorry, I cannot connect to the server. Please check your connection and try again.';
        } else if (err.message.includes('Server error')) {
          errorMessage = 'Server error occurred. Please try again in a moment.';
          errorResponseText = 'Sorry, there was a server error. Please try again in a moment.';
        } else if (err.message.includes('No response from server')) {
          errorMessage = 'No response from server. Please try again.';
          errorResponseText = 'Sorry, the server is not responding. Please try again.';
        }
      }
      
      setError(errorMessage);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessage.id 
            ? { ...msg, content: errorResponseText, isLoading: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: 'Hello! I\'m your RAG-powered Summary Report assistant. I can generate comprehensive reports including status summaries, bottleneck analysis, executive summaries, and predictive analytics. Use the quick actions below or ask for specific report types.',
        timestamp: new Date(),
      },
    ]);
    setError(null);
    setSelectedSprint('');
    setSelectedProject('');
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
    
    // Auto-set sprint filter based on question content
    if (question.includes('Sprint-1')) {
      setSelectedSprint('sprint-1');
    } else if (question.includes('Sprint-2')) {
      setSelectedSprint('sprint-2');
    } else if (question.includes('Sprint-3')) {
      setSelectedSprint('sprint-3');
    }
    
    // Auto-set project filter based on question content
    if (availableProjects.length > 0) {
      const matchingProject = availableProjects.find(project => 
        question.toLowerCase().includes(project.name.toLowerCase())
      );
      if (matchingProject) {
        setSelectedProject(matchingProject.name);
      }
    } else if (question.includes('Project')) {
      // If it mentions "Project Analysis" but no specific project, keep current selection
      // This allows for general project analysis
    }
    
    // Automatically send the message after a short delay to allow state updates
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const renderProjectStatusCard = (project: ProjectStatus) => (
    <Card key={project.projectId} elevation={2} sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              {project.projectName}
            </Typography>
            <Chip
              label={summaryReportService.getStatusLabel(project.status)}
              size="small"
              sx={{
                backgroundColor: summaryReportService.getStatusColor(project.status),
                color: 'white',
                fontWeight: 'bold',
                mt: 1,
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {project.completionPercentage}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Complete
            </Typography>
          </Box>
        </Box>

        <LinearProgress
          variant="determinate"
          value={project.completionPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              backgroundColor: summaryReportService.getStatusColor(project.status),
            },
            mb: 2,
          }}
        />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
              <Typography variant="body2" color="text.secondary">
                {project.completedTasks}/{project.totalTasks} Tasks
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon sx={{ color: 'warning.main', fontSize: 16 }} />
              <Typography variant="body2" color="text.secondary">
                {project.overdueTasks} Overdue
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockIcon sx={{ color: 'error.main', fontSize: 16 }} />
              <Typography variant="body2" color="text.secondary">
                {project.blockedTasks} Blocked
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ color: 'info.main', fontSize: 16 }} />
              <Typography variant="body2" color="text.secondary">
                {project.sprintVelocity} Velocity
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Quality Score:
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {project.qualityScore}/100
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Risk Level:
          </Typography>
          <Chip
            label={project.riskLevel.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: summaryReportService.getRiskLevelColor(project.riskLevel),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {project.summary}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderSummaryReport = (summaryData: SummaryReportResponse) => {
    // Check if we have structured report data
    if (summaryData.reportData) {
      if (summaryData.reportData.reportType === 'sprint_velocity_burndown') {
        return <SprintVelocityReport data={summaryData.reportData} />;
      } else if (summaryData.reportData.reportType === 'bottleneck_analysis') {
        return <BottleneckAnalysisReport data={summaryData.reportData} />;
      } else if (summaryData.reportData.reportType === 'historical_trends') {
        return <HistoricalTrendsReport data={summaryData.reportData} />;
      } else if (summaryData.reportData.reportType === 'executive_summary') {
        return <ExecutiveSummaryReport data={summaryData.reportData} />;
      }
    }

    // Default rendering for other report types
    return (
      <Box sx={{ mt: 2 }}>
        {/* Overall Status */}
        <Card elevation={3} sx={{ mb: 3, borderRadius: 2, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: summaryReportService.getStatusColor(summaryData.overallStatus),
                width: 48,
                height: 48
              }}>
                {summaryData.overallStatus === 'on-track' && <CheckCircleIcon />}
                {summaryData.overallStatus === 'slight-issues' && <WarningIcon />}
                {summaryData.overallStatus === 'critical' && <ErrorIcon />}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  Overall Project Status
                </Typography>
                <Chip
                  label={summaryReportService.getStatusLabel(summaryData.overallStatus)}
                  size="medium"
                  sx={{
                    backgroundColor: summaryReportService.getStatusColor(summaryData.overallStatus),
                    color: 'white',
                    fontWeight: 'bold',
                    mt: 1,
                  }}
                />
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {summaryData.onTrackProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    On Track
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {summaryData.issuesProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Slight Issues
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {summaryData.criticalProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {summaryData.totalProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Projects
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Project Status Cards */}
        <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 2 }}>
          Project Details
        </Typography>
        
        {summaryData.projectStatuses.map(renderProjectStatusCard)}

        {/* Summary Text */}
        <Card elevation={1} sx={{ mt: 3, borderRadius: 2, backgroundColor: 'grey.50' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
              {summaryData.summary}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Generated at: {new Date(summaryData.generatedAt).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  };



  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '8px 8px 0 0',
        minHeight: '60px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36 }}>
            <AssessmentIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              Summary Reports
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI-Powered Project Analytics
            </Typography>
          </Box>
          <Chip 
            label={connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'checking' ? 'Checking...' : 'Disconnected'}
            size="small" 
            color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'checking' ? 'warning' : 'error'}
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton 
              onClick={() => window.location.reload()} 
              size="small" 
              color="success"
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'success.light',
                  color: 'white'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0,
      }}>
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                maxWidth: message.type === 'summary' ? '100%' : '70%',
              }}
            >
              {message.type === 'bot' && (
                <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                  <AssessmentIcon fontSize="small" />
                </Avatar>
              )}
              
              {message.type === 'summary' ? (
                <Box sx={{ width: '100%' }}>
                  {renderSummaryReport(message.content as SummaryReportResponse)}
                </Box>
              ) : (
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: message.type === 'user' ? 'success.main' : 'grey.50',
                    color: message.type === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                    minWidth: 200,
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.isLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">Generating summary report...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content as string}
                    </Typography>
                  )}
                </Paper>
              )}
              
              {message.type === 'user' && (
                <Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}>
                  <TrendingUpIcon fontSize="small" sx={{ color: 'black' }} />
                </Avatar>
              )}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters Area */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', backgroundColor: 'grey.50', minHeight: '80px' }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>
                Project {projectsLoading && <CircularProgress size={12} sx={{ ml: 1 }} />}
              </InputLabel>
              <Select
                value={selectedProject}
                label="Project"
                onChange={handleProjectChange}
                disabled={isLoading || projectsLoading}
              >
                <MenuItem value="">All Projects</MenuItem>
                {projectsLoading ? (
                  <MenuItem disabled>Loading projects...</MenuItem>
                ) : availableProjects.length > 0 ? (
                  availableProjects.map((project) => (
                    <MenuItem key={project.id} value={project.name}>
                      {project.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No projects available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Sprint</InputLabel>
              <Select
                value={selectedSprint}
                label="Sprint"
                onChange={(e: SelectChangeEvent) => setSelectedSprint(e.target.value)}
                disabled={isLoading || selectedProject === ""}
              >
                <MenuItem value="">All Sprints</MenuItem>
                {Array.from({ length: 20 }, (_, i) => (
                  <MenuItem key={i + 1} value={`sprint-${i + 1}`}>
                    Sprint-{i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>



      {/* Input Area */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', minHeight: '70px' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for RAG status reports, bottleneck analysis, executive summaries, predictive analytics, or specific project insights..."
            variant="outlined"
            size="small"
            disabled={isLoading}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            color="success"
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
});

export default SummaryReportChat;
