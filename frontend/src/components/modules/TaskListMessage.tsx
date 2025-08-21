import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  Book as StoryIcon,
  Build as BuildIcon,
  Star as EpicIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { TaskData, ProjectSummary } from '../../services/chatbot.service';

interface TaskListMessageProps {
  tasks: TaskData[];
  projectSummaries: ProjectSummary[];
  statistics: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    high_priority_tasks: number;
    bugs: number;
  };
  queryTime?: number;
}

const TaskListMessage: React.FC<TaskListMessageProps> = ({
  tasks,
  projectSummaries,
  statistics,
  queryTime
}) => {
  // Use tasks as provided by the RAG system - no client-side filtering
  const filteredTasks = tasks;
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const getIssueTypeIcon = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'bug':
        return <BugIcon color="error" />;
      case 'story':
        return <StoryIcon color="primary" />;
      case 'improvement':
        return <BuildIcon color="info" />;
      case 'epic':
        return <EpicIcon color="secondary" />;
      default:
        return <AssignmentIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
        return 'success';
      case 'in progress':
        return 'warning';
      case 'to do':
        return 'info';
      case 'blocked':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAssigneeInitials = (name: string) => {
    return name.split('.').map(part => part.charAt(0).toUpperCase()).join('');
  };

  const parseTitleFromDescription = (description: string, fallbackTitle: string): string => {
    // Look for "Title: " in the description
    const titleMatch = description.match(/Title:\s*([^\n]+)/);
    if (titleMatch && titleMatch[1]) {
      const parsedTitle = titleMatch[1].trim();
      // Only return parsed title if it's not empty and not "Unknown Title"
      if (parsedTitle && parsedTitle !== 'Unknown Title') {
        return parsedTitle;
      }
    }
    // Return fallback title if parsing fails
    return fallbackTitle || 'Unknown Title';
  };

  const toggleProjectExpansion = (projectName: string) => {
    setExpandedProject(expandedProject === projectName ? null : projectName);
  };

  const toggleTaskDetails = (taskId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const completionRate = statistics.total_tasks > 0 
    ? (statistics.completed_tasks / statistics.total_tasks) * 100 
    : 0;

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100% !important',
      minWidth: '100%',
      flex: '1 1 100%',
      overflow: 'visible'
    }}>
      {/* Statistics Overview */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h6" gutterBottom>
          📊 Task Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold">
                {statistics.total_tasks}
              </Typography>
              <Typography variant="caption">Total Tasks</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold" color="success.light">
                {statistics.completed_tasks}
              </Typography>
              <Typography variant="caption">Completed</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold" color="warning.light">
                {statistics.in_progress_tasks}
              </Typography>
              <Typography variant="caption">In Progress</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold" color="error.light">
                {statistics.high_priority_tasks}
              </Typography>
              <Typography variant="caption">High Priority</Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box mt={2}>
          <Typography variant="body2" gutterBottom>
            Completion Progress
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={completionRate} 
            sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.3)' }}
          />
          <Typography variant="caption">
            {completionRate.toFixed(1)}% Complete
          </Typography>
        </Box>
      </Paper>

      {/* Project-wise Task Breakdown */}
      <Grid container spacing={2}>
        {/* Left Column - Project Summary */}
        <Grid item xs={12} lg={3} md={4}>
          <Paper sx={{ p: 2, height: 'fit-content', position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom>
              📋 Project Summary
            </Typography>
            {projectSummaries.map((project) => (
              <Box key={project.project_name} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {project.project_name}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  <Chip 
                    size="small" 
                    label={`${project.task_count} Total`} 
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`${project.high_priority_tasks} High Priority`} 
                    color="error" 
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`${project.bugs} Bugs`} 
                    color="warning" 
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`${project.completed_tasks}/${project.task_count} Done`} 
                    color="success" 
                    variant="outlined"
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Right Column - Task List */}
        <Grid item xs={12} lg={9} md={8}>
          <Box>
            {/* Task List */}
            <Typography variant="h6" gutterBottom>
              📝 Tasks ({filteredTasks.length})
            </Typography>
            
            {filteredTasks.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  No tasks found matching your criteria
                </Typography>
              </Paper>
            ) : (
              <Box>
                {filteredTasks.map((task, index) => (
                  <Paper 
                    key={task.id}
                    sx={{ 
                      mb: 2,
                      p: 3,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    {/* Task Header */}
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {getIssueTypeIcon(task.issue_type)}
                      <Box flex={1}>
                        <Typography 
                          variant="h6" 
                          fontWeight="bold"
                          sx={{ 
                            color: 'text.primary',
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                          }}
                        >
                          {parseTitleFromDescription(task.description, task.title)}
                        </Typography>
                        <Chip 
                          label={task.id} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            bgcolor: 'primary.50',
                            borderColor: 'primary.200',
                            mt: 0.5
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Task Description */}
                    <Box mb={2}>
                      <Typography 
                        variant="body2" 
                        color="textSecondary" 
                        sx={{ 
                          lineHeight: 1.6,
                          fontSize: '0.9rem'
                        }}
                      >
                        {(() => {
                          // Extract only the actual description text
                          const lines = task.description.split('\n');
                          let descriptionText = '';
                          
                          for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('Description:')) {
                              // Extract the description text after "Description:"
                              const descMatch = trimmedLine.match(/Description:\s*(.+)/);
                              if (descMatch && descMatch[1]) {
                                descriptionText = descMatch[1].trim();
                                break;
                              }
                            }
                          }
                          
                          // If no description found, show a fallback
                          if (!descriptionText) {
                            descriptionText = 'No description available';
                          }
                          
                          return descriptionText;
                        })()}
                      </Typography>
                    </Box>

                    {/* Task Status Chips */}
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip 
                        label={task.priority} 
                        size="small" 
                        color={getPriorityColor(task.priority) as any}
                      />
                      <Chip 
                        label={task.status} 
                        size="small" 
                        color={getStatusColor(task.status) as any}
                      />
                      <Chip 
                        label={task.issue_type} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>

                                         {/* Task Details - Always Visible */}
                     <Box 
                       sx={{ 
                         p: 2, 
                         bgcolor: 'grey.50', 
                         borderRadius: 1,
                         border: '1px solid',
                         borderColor: 'grey.200'
                       }}
                     >
                       <Grid container spacing={2}>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Assignee
                           </Typography>
                           <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                             <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                               {getAssigneeInitials(task.assignee)}
                             </Avatar>
                             <Typography variant="body2" fontWeight="medium">
                               {task.assignee}
                             </Typography>
                           </Box>
                         </Grid>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Reporter
                           </Typography>
                           <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                             <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                             <Typography variant="body2" fontWeight="medium">
                               {task.reporter}
                             </Typography>
                           </Box>
                         </Grid>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Sprint
                           </Typography>
                           <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                             <ScheduleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                             <Typography variant="body2" fontWeight="medium">
                               {task.sprint}
                             </Typography>
                           </Box>
                         </Grid>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Resolution
                           </Typography>
                           <Typography variant="body2" fontWeight="medium" mt={0.5}>
                             {task.resolution}
                           </Typography>
                         </Grid>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Project
                           </Typography>
                           <Typography variant="body2" fontWeight="medium" mt={0.5}>
                             {task.project}
                           </Typography>
                         </Grid>
                         <Grid item xs={6} sm={4} md={3}>
                           <Typography variant="caption" color="textSecondary" display="block">
                             Issue Type
                           </Typography>
                           <Typography variant="body2" fontWeight="medium" mt={0.5}>
                             {task.issue_type}
                           </Typography>
                         </Grid>
                       </Grid>
                     </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

    {/* Query Time */}
    {queryTime && (
      <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
        Query processed in {queryTime.toFixed(2)}s
      </Typography>
    )}
  </Box>
  );
};

export default TaskListMessage;
