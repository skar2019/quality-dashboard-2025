import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  Book as StoryIcon,
  Build as BuildIcon,
  Star as EpicIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityHighIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Report as ReportIcon,
  Group as GroupIcon,
} from '@mui/icons-material';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  issueType: string;
  resolution: string;
  project: string;
  sprint: string;
}

interface TaskStatusDashboardProps {
  tasks: Task[];
  title?: string;
}

const TaskStatusDashboard: React.FC<TaskStatusDashboardProps> = ({ 
  tasks, 
  title = "Task Status Dashboard" 
}) => {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    const grouped = tasks.reduce((acc, task) => {
      if (!acc[task.project]) {
        acc[task.project] = [];
      }
      acc[task.project].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    // Sort projects by number of tasks
    return Object.fromEntries(
      Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [tasks]);

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

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <PriorityHighIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <CheckCircleIcon color="success" />;
      default:
        return <WarningIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
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

  const getResolutionColor = (resolution: string) => {
    switch (resolution.toLowerCase()) {
      case 'done':
        return 'success';
      case 'unresolved':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAssigneeInitials = (name: string) => {
    return name.split('.').map(part => part.charAt(0).toUpperCase()).join('');
  };

  const getProjectStats = (projectTasks: Task[]) => {
    const total = projectTasks.length;
    const highPriority = projectTasks.filter(t => t.priority.toLowerCase() === 'high').length;
    const bugs = projectTasks.filter(t => t.issueType.toLowerCase() === 'bug').length;
    const done = projectTasks.filter(t => t.resolution.toLowerCase() === 'done').length;
    
    return { total, highPriority, bugs, done };
  };

  const overallStats = useMemo(() => {
    const total = tasks.length;
    const highPriority = tasks.filter(t => t.priority.toLowerCase() === 'high').length;
    const bugs = tasks.filter(t => t.issueType.toLowerCase() === 'bug').length;
    const done = tasks.filter(t => t.resolution.toLowerCase() === 'done').length;
    const inProgress = tasks.filter(t => t.status.toLowerCase() === 'in progress').length;
    
    return { total, highPriority, bugs, done, inProgress };
  }, [tasks]);

  const handleAccordionChange = (project: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedProject(isExpanded ? project : null);
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" color="white" gutterBottom>
              {title}
            </Typography>
            <Typography variant="subtitle1" color="white" sx={{ opacity: 0.9 }}>
              Comprehensive overview of all project tasks and their current status
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Chip 
              icon={<AssignmentIcon />} 
              label={`${overallStats.total} Total Tasks`} 
              color="primary" 
              variant="filled"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            <Chip 
              icon={<TrendingUpIcon />} 
              label={`${overallStats.inProgress} In Progress`} 
              color="warning" 
              variant="filled"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Overall Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overall Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <AssignmentIcon />
                  <Typography variant="h6">Total Tasks</Typography>
                </Box>
                <Typography variant="h4">{overallStats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <PriorityHighIcon />
                  <Typography variant="h6">High Priority</Typography>
                </Box>
                <Typography variant="h4">{overallStats.highPriority}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <BugIcon />
                  <Typography variant="h6">Bugs</Typography>
                </Box>
                <Typography variant="h4">{overallStats.bugs}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon />
                  <Typography variant="h6">Completed</Typography>
                </Box>
                <Typography variant="h4">{overallStats.done}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Project-wise Task Breakdown */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Project-wise Task Breakdown
        </Typography>
        
        {Object.entries(groupedTasks).map(([project, projectTasks]) => {
          const stats = getProjectStats(projectTasks);
          const completionRate = (stats.done / stats.total) * 100;
          
          return (
            <Accordion 
              key={project}
              expanded={expandedProject === project}
              onChange={handleAccordionChange(project)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">{project}</Typography>
                    <Badge badgeContent={stats.total} color="primary">
                      <GroupIcon />
                    </Badge>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip 
                      size="small" 
                      label={`${stats.highPriority} High Priority`} 
                      color="error" 
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`${stats.bugs} Bugs`} 
                      color="warning" 
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`${stats.done}/${stats.total} Done`} 
                      color="success" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Completion Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionRate} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {completionRate.toFixed(1)}% Complete
                  </Typography>
                </Box>
                
                <List>
                  {projectTasks.map((task, index) => (
                    <React.Fragment key={task.id}>
                      <ListItem sx={{ 
                        bgcolor: 'grey.50', 
                        borderRadius: 1, 
                        mb: 1,
                        border: '1px solid',
                        borderColor: 'grey.200'
                      }}>
                        <ListItemIcon>
                          {getIssueTypeIcon(task.issueType)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {task.title}
                              </Typography>
                              <Chip 
                                label={task.id} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                {task.description}
                              </Typography>
                              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                                <Chip 
                                  icon={getPriorityIcon(task.priority)}
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
                                  label={task.resolution} 
                                  size="small" 
                                  color={getResolutionColor(task.resolution) as any}
                                />
                                <Chip 
                                  label={task.issueType} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </Box>
                              <Box display="flex" alignItems="center" gap={2} mt={1}>
                                <Tooltip title={`Assignee: ${task.assignee}`}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                      {getAssigneeInitials(task.assignee)}
                                    </Avatar>
                                    <Typography variant="caption">
                                      {task.assignee}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                                <Tooltip title={`Reporter: ${task.reporter}`}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <PersonIcon fontSize="small" />
                                    <Typography variant="caption">
                                      {task.reporter}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                                <Tooltip title={`Sprint: ${task.sprint}`}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <ScheduleIcon fontSize="small" />
                                    <Typography variant="caption">
                                      {task.sprint}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < projectTasks.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>
    </Box>
  );
};

export default TaskStatusDashboard;
