import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
  Error,
  Info,
  Delete,
  Visibility,
  CalendarToday,
  TableChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ImportedReport {
  id: string;
  name: string;
  importDate: string;
  status: 'success' | 'error' | 'processing';
  recordCount: number;
  issues?: string[];
}

// Helper function to format date with ordinal suffix
const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
};

// Helper function to calculate duration between two dates
const calculateDuration = (startDate: Date, endDate: Date): number => {
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1; // Include both start and end dates
};

const JiraReportImport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [importedReports, setImportedReports] = useState<ImportedReport[]>([
    {
      id: '1',
      name: 'Sprint Report - Q1 2024',
      importDate: '2024-01-15',
      status: 'success',
      recordCount: 245,
    },
    {
      id: '2',
      name: 'Bug Report - January',
      importDate: '2024-01-10',
      status: 'error',
      recordCount: 0,
      issues: ['Invalid date format in row 15', 'Missing required field: Priority'],
    },
    {
      id: '3',
      name: 'Epic Progress Report',
      importDate: '2024-01-08',
      status: 'processing',
      recordCount: 0,
    },
  ]);
  const [selectedReport, setSelectedReport] = useState<ImportedReport | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [lastImportedReport, setLastImportedReport] = useState<any>(null);
  const navigate = useNavigate();

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('API response:', data); // Debug log
          // Handle different possible API response structures
          let projectsArray = [];
          if (Array.isArray(data)) {
            projectsArray = data;
          } else if (data && Array.isArray(data.projects)) {
            projectsArray = data.projects;
          } else if (data && Array.isArray(data.data)) {
            projectsArray = data.data;
          } else {
            console.warn('API response does not contain a valid projects array:', data);
            projectsArray = [];
          }
          
          // Ensure each project has the correct structure
          const formattedProjects = projectsArray.map((project: any) => ({
            id: project.id || project._id || project.projectId,
            name: project.name || project.title || project.projectName || `Project ${project.id || project._id}`
          }));
          
          console.log('Formatted projects:', formattedProjects); // Debug log
          setProjects(formattedProjects);
        } else {
          console.error('Failed to fetch projects');
          // Fallback to sample data if API fails
          setProjects([
            { id: 'proj-001', name: 'E-Commerce Platform' },
            { id: 'proj-002', name: 'Mobile Banking App' },
            { id: 'proj-003', name: 'Customer Portal' },
            { id: 'proj-004', name: 'Data Analytics Dashboard' },
            { id: 'proj-005', name: 'Security Enhancement' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Fallback to sample data if API fails
        setProjects([
          { id: 'proj-001', name: 'E-Commerce Platform' },
          { id: 'proj-002', name: 'Mobile Banking App' },
          { id: 'proj-003', name: 'Customer Portal' },
          { id: 'proj-004', name: 'Data Analytics Dashboard' },
          { id: 'proj-005', name: 'Security Enhancement' },
        ]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    setLoadingRecent(true);
    fetch('/api/jira-imports/recent', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setRecentImports(data))
      .catch(() => setRecentImports([]))
      .finally(() => setLoadingRecent(false));
  }, []);

  const sprints = [
    { id: 'sprint-1', name: 'Sprint 1' },
    { id: 'sprint-2', name: 'Sprint 2' },
    { id: 'sprint-3', name: 'Sprint 3' },
    { id: 'sprint-4', name: 'Sprint 4' },
    { id: 'sprint-5', name: 'Sprint 5' },
    { id: 'sprint-6', name: 'Sprint 6' },
    { id: 'sprint-7', name: 'Sprint 7' },
    { id: 'sprint-8', name: 'Sprint 8' },
    { id: 'sprint-9', name: 'Sprint 9' },
    { id: 'sprint-10', name: 'Sprint 10' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleProjectChange = (event: any) => {
    const projectId = event.target.value;
    console.log('Selected project ID:', projectId); // Debug log
    const selectedProjectData = projects.find(p => p.id === projectId);
    console.log('Selected project data:', selectedProjectData); // Debug log
    setSelectedProject(projectId);
  };

  const handleSprintChange = (event: any) => {
    setSelectedSprint(event.target.value);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const handleStartDateIconClick = () => {
    const dateInput = document.getElementById('start-date-input') as HTMLInputElement;
    if (dateInput) {
      dateInput.showPicker();
    }
  };

  const handleEndDateIconClick = () => {
    const dateInput = document.getElementById('end-date-input') as HTMLInputElement;
    if (dateInput) {
      dateInput.showPicker();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProject || !selectedSprint || !startDate || !endDate || !Array.isArray(projects)) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    const selectedProjectData = projects.find(p => p.id === selectedProject);
    if (selectedProjectData) {
      formData.append('projectName', selectedProjectData.name);
    }
    formData.append('projectId', selectedProject);
    formData.append('sprint', selectedSprint);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);

    try {
      const response = await fetch('/api/jira-imports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Optionally, update importedReports or recentImports with the new report
        setImportedReports([
          {
            id: data.id || Date.now().toString(),
            name: data.name || `${selectedFile.name} - ${selectedProject} - ${selectedSprint}`,
            importDate: data.importDate || new Date().toISOString().split('T')[0],
            status: data.status || 'success',
            recordCount: data.recordCount || 0,
            issues: data.issues || [],
          },
          ...importedReports,
        ]);
        setSelectedFile(null);
        setSelectedProject('');
        setSelectedSprint('');
        setStartDate('');
        setEndDate('');
        setImportSuccess(true);
        setLastImportedReport(data);
        navigate('/dashboard/data-viewer');
      } else {
        // Handle error
        setImportedReports([
          {
            id: Date.now().toString(),
            name: `${selectedFile.name} - ${selectedProject} - ${selectedSprint}`,
            importDate: new Date().toISOString().split('T')[0],
            status: 'error',
            recordCount: 0,
            issues: ['Failed to upload report.'],
          },
          ...importedReports,
        ]);
      }
    } catch (error) {
      setImportedReports([
        {
          id: Date.now().toString(),
          name: `${selectedFile.name} - ${selectedProject} - ${selectedSprint}`,
          importDate: new Date().toISOString().split('T')[0],
          status: 'error',
          recordCount: 0,
          issues: ['An error occurred during upload.'],
        },
        ...importedReports,
      ]);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleViewDetails = (report: ImportedReport) => {
    setSelectedReport(report);
    setDetailsDialogOpen(true);
  };

  const handleDeleteReport = (reportId: string) => {
    setImportedReports(importedReports.filter(report => report.id !== reportId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'processing':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Jira Report Import Logo */}
          <Box
            sx={{
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg, #0052CC 0%, #0047B3 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 82, 204, 0.3)',
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
            {/* Import Icon */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                {/* Cloud Upload */}
                <path
                  d="M8 20C8 16.6863 10.6863 14 14 14H18C21.3137 14 24 16.6863 24 20C24 23.3137 21.3137 26 18 26H14C10.6863 26 8 23.3137 8 20Z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Upload Arrow */}
                <path
                  d="M16 8L16 18M12 14L16 10L20 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* JIRA Logo Elements */}
                <rect x="10" y="22" width="4" height="2" rx="0.5" fill="white" opacity="0.8" />
                <rect x="16" y="22" width="4" height="2" rx="0.5" fill="white" opacity="0.8" />
                <rect x="12" y="24" width="6" height="1" rx="0.5" fill="white" opacity="0.6" />
                
                {/* Data Flow Lines */}
                <path
                  d="M6 12L10 12"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                <path
                  d="M22 12L26 12"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                
                {/* Data Points */}
                <circle cx="8" cy="12" r="1" fill="white" opacity="0.6" />
                <circle cx="24" cy="12" r="1" fill="white" opacity="0.6" />
              </svg>
            </Box>
          </Box>
          
          {/* Title with gradient text */}
          <Box>
            <Typography 
              variant="h4" 
              sx={{
                background: 'linear-gradient(135deg, #0052CC 0%, #0047B3 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                mb: 0.5
              }}
            >
              Jira Report Import
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '1rem'
              }}
            >
              Import and manage Jira reports for quality analysis
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Success Message */}
      {importSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          action={
            <Box>
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/dashboard/data-viewer')}
              >
                View Data
              </Button>
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => setImportSuccess(false)}
              >
                Dismiss
              </Button>
            </Box>
          }
        >
          Report imported successfully! You can now view the data or continue importing more reports.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Import New Report"
              avatar={<CloudUpload color="primary" />}
            />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={selectedProject}
                    onChange={handleProjectChange}
                    label="Project"
                    disabled={loadingProjects}
                  >
                    {loadingProjects ? (
                      <MenuItem disabled value="">Loading projects...</MenuItem>
                    ) : (
                      Array.isArray(projects) && projects.length > 0 ? (
                        projects.map((project) => (
                          <MenuItem key={project.id} value={project.id}>
                            {project.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">No projects available</MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Sprint</InputLabel>
                  <Select
                    value={selectedSprint}
                    onChange={handleSprintChange}
                    label="Sprint"
                  >
                    {sprints.map((sprint) => (
                      <MenuItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  id="start-date-input"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  fullWidth
                  sx={{ 
                    mb: 2,
                    '& .MuiInputBase-input': {
                      cursor: 'text',
                    },
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      display: 'none',
                      '-webkit-appearance': 'none',
                    },
                    '& input[type="date"]::-moz-calendar-picker-indicator': {
                      display: 'none',
                    }
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleStartDateIconClick}
                          edge="end"
                          size="small"
                        >
                          <CalendarToday color="action" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  id="end-date-input"
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  fullWidth
                  sx={{ 
                    mb: 2,
                    '& .MuiInputBase-input': {
                      cursor: 'text',
                    },
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      display: 'none',
                      '-webkit-appearance': 'none',
                    },
                    '& input[type="date"]::-moz-calendar-picker-indicator': {
                      display: 'none',
                    }
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleEndDateIconClick}
                          edge="end"
                          size="small"
                        >
                          <CalendarToday color="action" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{ mb: 2 }}
                  startIcon={<Description />}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileSelect}
                  />
                </Button>

                {selectedFile && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </Alert>
                )}

                {isUploading && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Uploading... {uploadProgress}%
                    </Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedProject || !selectedSprint || !startDate || !endDate || isUploading || loadingProjects || !Array.isArray(projects)}
                  startIcon={<CloudUpload />}
                >
                  {isUploading ? 'Importing...' : loadingProjects ? 'Loading Projects...' : 'Import Report'}
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Supported formats: CSV, Excel (.xlsx), JSON
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Import Statistics" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {importedReports.filter(r => r.status === 'success').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main">
                      {importedReports.filter(r => r.status === 'error').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {importedReports.filter(r => r.status === 'processing').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Processing
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Imported Reports List */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Recent Imports
              </Typography>
              <Button
                variant="outlined"
                startIcon={<TableChart />}
                onClick={() => {
                  console.log('View All Data clicked - navigating to /dashboard/data-viewer');
                  navigate('/dashboard/data-viewer');
                }}
              >
                View All Data
              </Button>
            </Box>
            {loadingRecent ? (
              <Typography>Loading...</Typography>
            ) : recentImports.length === 0 ? (
              <Typography>No recent imports found.</Typography>
            ) : (
              <List>
                {recentImports.map((report) => (
                  <ListItem 
                    key={report._id}
                    secondaryAction={
                      <Box>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<TableChart />}
                          onClick={() => {
                            console.log('View Data clicked for report:', report._id);
                            navigate(`/dashboard/data-viewer?report=${report._id}`);
                          }}
                        >
                          View Data
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                            Project: {report.projectName || report.projectId}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                            Sprint: {report.sprint}
                          </Typography>
                          <Box sx={{ marginTop: '4px', marginBottom: '4px' }}>
                            {report.startDate && report.endDate ? (
                              <>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#1976d2', 
                                    fontWeight: 500, 
                                    backgroundColor: '#e3f2fd', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    display: 'inline-block',
                                    marginBottom: '2px'
                                  }}
                                >
                                  Start Date: {formatDateWithOrdinal(new Date(report.startDate))}
                                </Typography>
                                <br />
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#1976d2', 
                                    fontWeight: 500, 
                                    backgroundColor: '#e3f2fd', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    display: 'inline-block',
                                    marginBottom: '2px'
                                  }}
                                >
                                  End Date: {formatDateWithOrdinal(new Date(report.endDate))}
                                </Typography>
                                <br />
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#2e7d32', 
                                    fontWeight: 500, 
                                    backgroundColor: '#e8f5e8', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    display: 'inline-block'
                                  }}
                                >
                                  Duration: {calculateDuration(new Date(report.startDate), new Date(report.endDate))} Days
                                </Typography>
                              </>
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#1976d2', 
                                  fontWeight: 500, 
                                  backgroundColor: '#e3f2fd', 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  display: 'inline-block'
                                }}
                              >
                                Date range not specified
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            {report.fileName || 'Jira Import'}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Imported: {new Date(report.importedAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Issues: {report.issueCount || 0}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Report Details: {selectedReport?.name}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Import Date
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.importDate}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedReport.status}
                    color={getStatusColor(selectedReport.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Record Count
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.recordCount}
                  </Typography>
                </Grid>
              </Grid>

              {selectedReport.issues && selectedReport.issues.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="error">
                    Issues Found
                  </Typography>
                  <List>
                    {selectedReport.issues.map((issue, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText primary={issue} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JiraReportImport; 