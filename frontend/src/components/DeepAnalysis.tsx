import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import deepAnalysisService, {
  DeepAnalysisRequest,
  DeepAnalysisResponse,
  DeepAnalysisInsight,
  DeepAnalysisMetrics
} from '../services/deep-analysis.service';

interface DeepAnalysisProps {
  sprintFilter?: string;
  projectFilter?: string;
}

interface DeepAnalysisMessage {
  id: string;
  type: 'user' | 'bot' | 'analysis';
  content: string | DeepAnalysisResponse;
  timestamp: Date;
  isLoading?: boolean;
}

const DeepAnalysis = forwardRef<any, DeepAnalysisProps>(({ sprintFilter, projectFilter }, ref) => {
  const [messages, setMessages] = useState<DeepAnalysisMessage[]>([
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
  const [selectedSprint, setSelectedSprint] = useState<string>(sprintFilter || '');
  const [selectedProject, setSelectedProject] = useState<string>(projectFilter || '');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSuggestedQuestion: (question: string) => {
      // Auto-set sprint filter based on question content
      if (question.includes('Sprint-1')) {
        setSelectedSprint('sprint-1');
      } else if (question.includes('Sprint-2')) {
        setSelectedSprint('sprint-2');
      } else if (question.includes('Sprint-3')) {
        setSelectedSprint('sprint-3');
      }
      
      // Set input text only - don't auto-send
      setInputText(question);
    }
  }));

  useEffect(() => {
    if (sprintFilter) {
      setSelectedSprint(sprintFilter);
    }
    if (projectFilter) {
      setSelectedProject(projectFilter);
    }
  }, [sprintFilter, projectFilter]);

  const handleSendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: DeepAnalysisMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const botMessage: DeepAnalysisMessage = {
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
      const request: DeepAnalysisRequest = {
        message: text.trim(),
        sprint: selectedSprint || undefined,
        project: selectedProject || undefined,
        analysisType: 'comprehensive', // Default to comprehensive
        includeRecommendations: true,
        includePredictions: true
      };

      const response = await deepAnalysisService.generateDeepAnalysis(request);
      
      // Create analysis message
      const analysisMessage: DeepAnalysisMessage = {
        id: (Date.now() + 2).toString(),
        type: 'analysis',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessage.id 
            ? { ...msg, content: 'Here\'s your summary report:', isLoading: false }
            : msg
        ).concat(analysisMessage)
      );
    } catch (err: any) {
      console.error('Summary report error:', err);
      
      let errorMessage = 'Failed to generate summary report. Please try again.';
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
    
    const handleSendMessage = () => {
      handleSendMessageWithText(inputText);
    };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving':
        return <TrendingUpIcon color="success" />;
      case 'declining':
        return <TrendingUpIcon sx={{ transform: 'rotate(180deg)', color: 'error.main' }} />;
      case 'stable':
        return <TimelineIcon color="info" />;
      default:
        return <TimelineIcon />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderMetricsCard = (metrics: DeepAnalysisMetrics) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#9C27B0' }} />
          Analysis Metrics
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ color: '#9C27B0' }}>
                {metrics.overallHealth}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Overall Health
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.overallHealth} 
                sx={{ mt: 1, 
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: metrics.overallHealth >= 80 ? '#9C27B0' : metrics.overallHealth >= 60 ? '#FF9800' : '#F44336'
                  }
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ color: '#F44336' }}>
                {metrics.riskScore}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Risk Score
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={100 - metrics.riskScore} 
                sx={{ mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: metrics.riskScore <= 30 ? '#9C27B0' : metrics.riskScore <= 60 ? '#FF9800' : '#F44336'
                  }
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ color: '#FF9800' }}>
                {metrics.performanceScore}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Performance
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.performanceScore} 
                sx={{ mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: metrics.performanceScore >= 80 ? '#9C27B0' : metrics.performanceScore >= 60 ? '#FF9800' : '#F44336'
                  }
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ color: '#2196F3' }}>
                {metrics.qualityScore}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Quality
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={metrics.qualityScore} 
                sx={{ mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: metrics.qualityScore >= 80 ? '#9C27B0' : metrics.qualityScore >= 60 ? '#FF9800' : '#F44336'
                  }
                }}
              />
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon(metrics.trendDirection)}
              <Typography variant="body2">
                Trend: <strong>{metrics.trendDirection}</strong>
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={metrics.confidenceLevel} 
                color={getConfidenceColor(metrics.confidenceLevel)}
                size="small"
              />
              <Typography variant="body2">
                Confidence Level
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderInsightsCard = (insights: DeepAnalysisInsight[]) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#9C27B0' }} />
          Key Insights ({insights.length})
        </Typography>
        
        {insights.map((insight, index) => (
          <Accordion 
            key={index}
            expanded={expandedInsight === `insight-${index}`}
            onChange={() => setExpandedInsight(
              expandedInsight === `insight-${index}` ? null : `insight-${index}`
            )}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                {getSeverityIcon(insight.severity)}
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {insight.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {insight.category} • {insight.severity} severity
                  </Typography>
                </Box>
                <Chip 
                  label={insight.severity} 
                  color={getSeverityColor(insight.severity)}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body1" paragraph>
                  {insight.description}
                </Typography>
                
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Business Impact:
                </Typography>
                <Typography variant="body2" paragraph>
                  {insight.impact}
                </Typography>
                
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Supporting Evidence:
                </Typography>
                <Box mb={2}>
                  {insight.evidence.map((evidence, idx) => (
                    <Chip 
                      key={idx} 
                      label={evidence} 
                      variant="outlined" 
                      size="small" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Recommendations:
                </Typography>
                <Box>
                  {insight.recommendations.map((rec, idx) => (
                    <Chip 
                      key={idx} 
                      label={rec} 
                      color="primary" 
                      size="small" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </CardContent>
    </Card>
  );

  const renderRecommendationsCard = (recommendations: string[]) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#9C27B0' }} />
          Strategic Recommendations ({recommendations.length})
        </Typography>
        
        <Stack spacing={1}>
          {recommendations.map((rec, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <CheckCircleIcon sx={{ mt: 0.5, flexShrink: 0, color: '#9C27B0' }} />
                <Typography variant="body1">
                  {rec}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderPredictionsCard = (predictions: string[]) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#FF9800' }} />
          Predictive Insights ({predictions.length})
        </Typography>
        
        <Stack spacing={1}>
          {predictions.map((prediction, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <TrendingUpIcon sx={{ mt: 0.5, flexShrink: 0, color: '#FF9800' }} />
                <Typography variant="body1">
                  {prediction}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderActionItemsCard = (actionItems: string[]) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#9C27B0' }} />
          Immediate Action Items ({actionItems.length})
        </Typography>
        
        <Stack spacing={1}>
          {actionItems.map((action, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="flex-start" gap={1}>
                <WarningIcon color="warning" sx={{ mt: 0.5, flexShrink: 0 }} />
                <Typography variant="body1">
                  {action}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDeepAnalysis = (analysisData: DeepAnalysisResponse) => (
    <Box>
      {/* Executive Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Executive Summary
          </Typography>
          <Typography variant="body1">
            {analysisData.summary}
          </Typography>
          <Box mt={2} display="flex" gap={2} alignItems="center">
            <Chip 
              label={`Analysis Type: ${analysisData.analysisType}`} 
              sx={{ 
                backgroundColor: '#E1BEE7', 
                color: '#4A148C',
                border: '1px solid #9C27B0'
              }}
            />
            <Chip 
              label={`Generated: ${new Date(analysisData.generatedAt).toLocaleString()}`} 
              variant="outlined"
            />
            <Chip 
              label={`Analysis Time: ${analysisData.analysisTime.toFixed(1)}s`} 
              sx={{ 
                backgroundColor: '#FFE0B2', 
                color: '#E65100',
                border: '1px solid #FF9800'
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Metrics */}
      {renderMetricsCard(analysisData.metrics)}

      {/* Insights */}
      {analysisData.insights.length > 0 && renderInsightsCard(analysisData.insights)}

      {/* Recommendations */}
      {analysisData.recommendations.length > 0 && renderRecommendationsCard(analysisData.recommendations)}

      {/* Predictions */}
      {analysisData.predictions.length > 0 && renderPredictionsCard(analysisData.predictions)}

      {/* Action Items */}
      {analysisData.actionItems.length > 0 && renderActionItemsCard(analysisData.actionItems)}
    </Box>
  );

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
          <Avatar sx={{ bgcolor: '#9C27B0', width: 36, height: 36 }}>
            <AssessmentIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#9C27B0' }}>
              Deep Analysis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI-Powered Project Analytics
            </Typography>
          </Box>
          <Chip 
            label="Connected"
            size="small" 
            sx={{ 
              ml: 1, 
              backgroundColor: '#E1BEE7', 
              color: '#4A148C',
              border: '1px solid #9C27B0'
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton 
              onClick={() => window.location.reload()} 
              size="small" 
              sx={{ 
                color: '#9C27B0',
                '&:hover': { 
                  backgroundColor: '#E1BEE7',
                  color: '#4A148C'
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
                maxWidth: message.type === 'analysis' ? '100%' : '70%',
              }}
            >
              {message.type === 'bot' && (
                <Avatar sx={{ bgcolor: '#9C27B0', width: 32, height: 32 }}>
                  <AssessmentIcon fontSize="small" />
                </Avatar>
              )}
              
              {message.type === 'analysis' ? (
                <Box sx={{ width: '100%' }}>
                  {renderDeepAnalysis(message.content as DeepAnalysisResponse)}
                </Box>
              ) : (
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: message.type === 'user' ? '#9C27B0' : 'grey.50',
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
                <Avatar sx={{ bgcolor: '#FF9800', width: 32, height: 32 }}>
                  <TrendingUpIcon sx={{ color: 'white' }} />
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
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProject}
                label="Project"
                onChange={(e: SelectChangeEvent) => setSelectedProject(e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="">All Projects</MenuItem>
                <MenuItem value="Adani">Adani</MenuItem>
                <MenuItem value="Mobile App">Mobile App</MenuItem>
                <MenuItem value="Web Platform">Web Platform</MenuItem>
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
            sx={{ 
              alignSelf: 'flex-end',
              color: '#9C27B0',
              '&:hover': {
                backgroundColor: '#E1BEE7'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
});

export default DeepAnalysis;