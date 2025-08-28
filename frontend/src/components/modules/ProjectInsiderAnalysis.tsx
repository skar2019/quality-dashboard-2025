import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  Clear as ClearIcon,
  Assessment as AssessmentIcon,
  Chat as ChatIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import chatbotService, { ChatRequest, StructuredChatResponse } from '@/services/chatbot.service';
import SummaryReportChat from './SummaryReportChat';
import TaskListMessage from './TaskListMessage';
import DeepAnalysis from '../DeepAnalysis';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
  structuredData?: StructuredChatResponse;
}

const ProjectInsiderAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your Project Insider Analysis assistant. I can help you analyze project data, answer questions about your projects, and provide insights from your JIRA reports. What would you like to know?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const [availableProjects, setAvailableProjects] = useState<Array<{id: string, name: string}>>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const summaryReportRef = useRef<any>(null);
  const deepAnalysisRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check connection status on component mount and periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await chatbotService.getStatus();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    // Initial connection check
    checkConnection();
    
    // Periodic connection check every 5 minutes to keep the service warm
    const interval = setInterval(checkConnection, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch projects from MongoDB on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/projects`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Projects API response:', data);
          
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
          
          console.log('Formatted projects for dropdown:', formattedProjects);
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
        await chatbotService.getStatus();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to warm up ML service:', error);
        // Continue anyway, the main request might still work
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the request payload matching the backend API
      const requestPayload: ChatRequest = {
        message: userMessage.text,
        ...(selectedSprint && { sprint: selectedSprint }),
        ...(selectedProject && { project: selectedProject }),
      };

      console.log('Sending structured data request:', requestPayload);
      console.log('Active filters:', {
        project: selectedProject || 'None',
        sprint: selectedSprint || 'None',
        query: userMessage.text
      });
      
      // Use the new structured data endpoint
      const structuredData = await chatbotService.getStructuredData(requestPayload);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessage.id 
            ? { 
                ...msg, 
                text: structuredData.message_type === 'text' ? structuredData.text_response || 'No response' : 'Task data retrieved',
                isLoading: false,
                structuredData: structuredData
              }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Chat error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to get response. Please try again.';
      let errorResponseText = 'Sorry, I encountered an error. Please try again.';
      
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
            ? { ...msg, text: errorResponseText, isLoading: false }
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
        text: 'Hello! I\'m your Project Insider Analysis assistant. I can help you analyze project data, answer questions about your projects, and provide insights from your JIRA reports. What would you like to know?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setError(null);
    setSelectedSprint('');
    setSelectedProject('');
  };

  const handleSuggestedQuestion = (question: string) => {
    if (activeTab === 0) {
      // Project Analysis tab
      setInputText(question);
      
      // Auto-set sprint filter based on question content
      if (question.includes('Sprint-1')) {
        setSelectedSprint('sprint-1');
      } else if (question.includes('Sprint-2')) {
        setSelectedSprint('sprint-2');
      } else if (question.includes('Sprint-3')) {
        setSelectedSprint('sprint-3');
      }
      
      // Automatically send the message after a short delay to allow state updates
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    } else if (activeTab === 1) {
      // Summary Report tab - pass to SummaryReportChat component
      if (summaryReportRef.current) {
        summaryReportRef.current.handleSuggestedQuestion(question);
      }
    } else if (activeTab === 2) {
      // Deep Analysis tab - pass to DeepAnalysis component
      if (deepAnalysisRef.current) {
        deepAnalysisRef.current.handleSuggestedQuestion(question);
      }
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      const status = await chatbotService.getStatus();
      console.log('Connection test successful:', status);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const projectAnalysisQuestions =  [
    'What are the high priority tasks(Story, Task, Bug)?',
    'What are the high priority bugs?',

    'What are the low priority tasks(Story, Task, Bug)?',
    'What are the low priority bugs?',

    'What are the completed tasks(Story, Task, Bug)?',
    'What are the completed bugs?',

    'What are the in-process tasks(Story, Task, Bug)?',
    'What are the in-process bugs?',
  ]

  const projectAnalysisQuestionsBackup = [
    'What tasks are currently in progress?',
    'What are the high priority tasks?',

    'Show tasks by type (Bug, Story, Task)',
    'Show tasks by status (To Do, In Progress, Done)',

    'Analyze task completion trends',
    'Who is working on what tasks?',
    'What are the blocked tasks?',
    'What is the sprint velocity for each sprint?',
    'Show tasks that are overdue',
    'What are the most time-consuming tasks?',
    
    'What are the risk items in the project?',
    
    'Show me all tasks in Sprint-1',
    'Show bugs in Sprint-2',
  ];

  const summaryReportQuestions = [
    'Executive Summary Reports',
    'Historical Trends and Predictive Analytics Reports',
    'Bottleneck and Process Analysis Reports',
    'Sprint Velocity & Burn-Down Report'
  ];

  const getCurrentQuestions = () => {
    return activeTab === 0 ? projectAnalysisQuestions : activeTab === 1 ? summaryReportQuestions : summaryReportQuestions;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 80px)', py: 1, px: 1 }}>
      <Grid container spacing={1} sx={{ height: '100%' }}>
        {/* Main Chat Area */}
        <Grid item xs={12} lg={10} xl={9} sx={{ height: '100%' }}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              backgroundColor: '#fff5f5', // Light red background
            }}
          >
            {/* Tabs Header */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 64,
                    textTransform: 'none',
                    fontWeight: 600,
                  },
                  '& .Mui-selected': {
                    color: 'primary.main',
                  },
                }}
              >
                <Tab 
                  icon={<ChatIcon />} 
                  label="Task Analysis" 
                  iconPosition="start"
                  sx={{ flexDirection: 'row', gap: 1, fontSize: '15px' }}
                />
                <Tab 
                  icon={<AssessmentIcon />} 
                  label="Summary Report" 
                  iconPosition="start"
                  sx={{ flexDirection: 'row', gap: 1, fontSize: '15px' }}
                />
                <Tab 
                  icon={<PsychologyIcon />} 
                  label="Deep Analysis" 
                  iconPosition="start"
                  sx={{ flexDirection: 'row', gap: 1, fontSize: '15px' }}
                />
              </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 ? (
              <>
                {/* Header */}
                <Box sx={{ 
                  p: 1.5, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '60px',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                      <BotIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Task Analysis
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        AI Assistant
                      </Typography>
                    </Box>
                    <Chip 
                      label={connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'checking' ? 'Checking...' : 'Disconnected'}
                      size="small" 
                      color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'checking' ? 'warning' : 'error'}
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                    {connectionStatus === 'disconnected' && (
                      <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                        Service may take a moment to start up on first use
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="Refresh">
                      <IconButton 
                        onClick={() => window.location.reload()} 
                        size="small" 
                        color="primary"
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'primary.light',
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
                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      maxWidth: '100%',
                    }}
                  >
                    {message.sender === 'bot' && (
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <BotIcon fontSize="small" />
                      </Avatar>
                    )}
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        backgroundColor: message.sender === 'user' ? 'primary.main' : 'grey.50',
                        color: message.sender === 'user' ? 'white' : 'text.primary',
                        borderRadius: 2,
                        minWidth: 200,
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="body2">Thinking...</Typography>
                        </Box>
                      ) : (
                        <>
                          {message.structuredData && message.structuredData.message_type === 'task_list' ? (
                            <TaskListMessage
                              tasks={message.structuredData.tasks || []}
                              projectSummaries={message.structuredData.project_summaries || []}
                              statistics={message.structuredData.statistics || {
                                total_tasks: 0,
                                completed_tasks: 0,
                                in_progress_tasks: 0,
                                high_priority_tasks: 0,
                                bugs: 0
                              }}
                              queryTime={message.structuredData.query_time}
                            />
                          ) : (
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                              {message.text}
                            </Typography>
                          )}
                        </>
                      )}
                    </Paper>
                    {message.sender === 'user' && (
                      <Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}>
                        <PersonIcon fontSize="small" sx={{ color: 'black' }} />
                      </Avatar>
                    )}
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Error Display */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mx: 2, mb: 2 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={() => {
                      setError(null);
                      // Retry the last message if possible
                      if (messages.length > 0) {
                        const lastUserMessage = messages.filter((msg: Message) => msg.sender === 'user').pop();
                        if (lastUserMessage) {
                          setInputText(lastUserMessage.text);
                        }
                      }
                    }}
                  >
                    Retry
                  </Button>
                }
              >
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
                      onChange={(e: SelectChangeEvent) => setSelectedProject(e.target.value)}
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
                      disabled={isLoading}
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
              {/* Active Filters Indicator */}
              {(selectedProject || selectedSprint) && (
                <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    Active filters:
                  </Typography>
                  {selectedProject && (
                    <Chip
                      label={`Project: ${selectedProject}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onDelete={() => setSelectedProject('')}
                    />
                  )}
                  {selectedSprint && (
                    <Chip
                      label={`Sprint: ${selectedSprint.replace('-', ' ').toUpperCase()}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      onDelete={() => setSelectedSprint('')}
                    />
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your projects, sprint data, quality metrics, or any project-related questions..."
                  variant="outlined"
                  size="small"
                  disabled={isLoading}
                />
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                  color="primary"
                  sx={{ alignSelf: 'flex-end' }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </>
        ) : activeTab === 1 ? (
          <SummaryReportChat 
            ref={summaryReportRef}
          />
        ) : (
          <DeepAnalysis 
            ref={deepAnalysisRef}
            sprintFilter={selectedSprint}
            projectFilter={selectedProject}
          />
        )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={2} xl={3} sx={{ height: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          {/* Quick Actions */}
          <Card elevation={2} sx={{ borderRadius: 2, flex: 1 }}>
            <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ 
                  color: activeTab === 0 ? 'primary.main' : activeTab === 1 ? 'success.main' : '#9C27B0' 
                }}>
                  {activeTab === 0 ? 'Capabilities' : 'Report Types'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'auto' }}>
                  {getCurrentQuestions().slice(0, 12).map((question, index) => (
                    <Chip
                      key={index}
                      label={question}
                      variant="outlined"
                      onClick={() => handleSuggestedQuestion(question)}
                      sx={{ 
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 'auto',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-out',
                        willChange: 'transform, background-color, color',
                        '&:hover': {
                          backgroundColor: activeTab === 0 ? 'primary.50' : activeTab === 1 ? 'success.50' : '#E1BEE7',
                          borderColor: activeTab === 0 ? 'primary.main' : activeTab === 1 ? 'success.main' : '#9C27B0',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          '& .MuiChip-label': {
                            fontWeight: 600,
                            color: activeTab === 0 ? 'primary.main' : activeTab === 1 ? 'success.main' : '#4A148C',
                          },
                        },
                        '& .MuiChip-label': {
                          whiteSpace: 'normal',
                          lineHeight: 1.2,
                          fontSize: '15px',
                          padding: '4px 8px',
                          fontWeight: 500,
                          textRendering: 'optimizeLegibility',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                        },
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card elevation={2} sx={{ borderRadius: 2, flex: 0.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: activeTab === 0 ? 'primary.main' : '#9C27B0' }}>
                  {activeTab === 0 ? 'Capabilities' : 'Report Types'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {activeTab === 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                        Analyze project data
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                        Sprint insights
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                        Quality analysis
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          backgroundColor: activeTab === 1 ? 'success.main' : '#9C27B0' 
                        }} />
                        Status Summary Reports
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          backgroundColor: activeTab === 1 ? 'success.main' : '#9C27B0' 
                        }} />
                        Bottleneck Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          backgroundColor: activeTab === 1 ? 'success.main' : '#9C27B0' 
                        }} />
                        Executive Summaries
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '15px'
                      }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          backgroundColor: activeTab === 1 ? 'success.main' : '#9C27B0' 
                        }} />
                        Predictive Analytics
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card elevation={2} sx={{ borderRadius: 2, flex: 0.5 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ 
                  color: activeTab === 0 ? 'primary.main' : activeTab === 1 ? 'success.main' : '#9C27B0' 
                }}>
                  {activeTab === 0 ? 'Data Sources' : 'Analytics Features'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {activeTab === 0 ? (
                    <>
                      <Chip 
                        label="JIRA Reports" 
                        color="primary" 
                        size="small" 
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Chip 
                        label="Project Metrics" 
                        color="secondary" 
                        size="small" 
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Chip 
                        label="Sprint Data" 
                        color="info" 
                        size="small" 
                        sx={{ alignSelf: 'flex-start' }}
                      />
                    </>
                  ) : (
                    <>
                      <Chip 
                        label="RAG-Powered Analysis" 
                        sx={{ 
                          alignSelf: 'flex-start',
                          backgroundColor: activeTab === 1 ? 'success.main' : '#9C27B0',
                          color: 'white'
                        }}
                        size="small" 
                      />
                      <Chip 
                        label="Color-Coded Status" 
                        sx={{ 
                          alignSelf: 'flex-start',
                          backgroundColor: activeTab === 1 ? 'warning.main' : '#FF9800',
                          color: 'white'
                        }}
                        size="small" 
                      />
                      <Chip 
                        label="Predictive Insights" 
                        sx={{ 
                          alignSelf: 'flex-start',
                          backgroundColor: activeTab === 1 ? 'info.main' : '#2196F3',
                          color: 'white'
                        }}
                        size="small" 
                      />
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
      

    </Container>
  );
};

export default ProjectInsiderAnalysis; 