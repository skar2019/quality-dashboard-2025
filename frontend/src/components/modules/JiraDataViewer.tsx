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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  FilterList,
  Visibility,
  Download,
  BarChart,
  TableChart,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';

interface JiraIssue {
  _id: string;
  issueKey: string;
  summary: string;
  issueType: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  resolution: string;
  description: string;
}

interface ReportStats {
  totalIssues: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
}

interface ImportedReport {
  _id: string;
  projectId: string;
  projectName?: string;
  sprint: string;
  startDate: string;
  endDate: string;
  importedAt: string;
  fileName: string;
  issueCount: number;
}

const COLORS = ['#1473E6', '#36B37E', '#FF9D00', '#E34850', '#0066CC', '#BDBDBD'];

const JiraDataViewer: React.FC = () => {
  console.log('JiraDataViewer component loaded');
  
  const [reports, setReports] = useState<ImportedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ImportedReport | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalIssues, setTotalIssues] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'stats'>('table');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    startDate: '',
    endDate: '',
  });
  const [searchParams] = useSearchParams();

  // Fetch available reports
  useEffect(() => {
    fetchReports();
  }, []);

  // Handle URL parameter for pre-selecting a report
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r._id === reportId);
      if (report) {
        setSelectedReport(report);
      }
    }
  }, [searchParams, reports]);

  // Fetch data when report changes
  useEffect(() => {
    if (selectedReport) {
      fetchReportData();
      fetchReportStats();
    }
  }, [selectedReport, page, rowsPerPage, filters]);

  const fetchReports = async () => {
    try {
              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/jira-imports/recent`, {
        credentials: 'include'
      });
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchReportData = async () => {
    if (!selectedReport) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignee && { assignee: filters.assignee }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/jira-imports/${selectedReport._id}/data?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setIssues(data.data);
      setTotalIssues(data.pagination.total);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportStats = async () => {
    if (!selectedReport) return;
    
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignee && { assignee: filters.assignee }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/jira-imports/${selectedReport._id}/stats?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching report stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleReportChange = (report: ImportedReport) => {
    setSelectedReport(report);
    setPage(0);
    setFilters({ status: '', priority: '', assignee: '', startDate: '', endDate: '' });
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
      case 'closed':
        return 'success';
      case 'in progress':
        return 'info';
      case 'to do':
        return 'warning';
      case 'blocked':
        return 'error';
      default:
        return 'default';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const prepareChartData = (data: Record<string, number>) => {
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Sprint Insider Logo */}
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
            {/* Sprint Icon */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                {/* Sprint Track */}
                <path
                  d="M6 16C6 10.4772 10.4772 6 16 6C21.5228 6 26 10.4772 26 16C26 21.5228 21.5228 26 16 26C10.4772 26 6 21.5228 6 16Z"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
                {/* Sprint Runner */}
                <path
                  d="M12 12L16 8L20 12L18 16L14 16L12 12Z"
                  fill="white"
                />
                {/* Sprint Lines */}
                <path
                  d="M8 16L24 16"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <path
                  d="M16 8L16 24"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                {/* Data Points */}
                <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8" />
                <circle cx="20" cy="12" r="1.5" fill="white" opacity="0.8" />
                <circle cx="12" cy="20" r="1.5" fill="white" opacity="0.8" />
                <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.8" />
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
              Sprint Explore
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '1rem'
              }}
            >
              View and analyze imported Jira reports
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Report Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Select Report"
              action={
                <IconButton onClick={fetchReports}>
                  <Refresh />
                </IconButton>
              }
            />
            <CardContent>
              {reports.length === 0 ? (
                <Alert severity="info">No reports available</Alert>
              ) : (
                <Box>
                  {reports.map((report) => (
                    <Card
                      key={report._id}
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        border: selectedReport?._id === report._id ? 2 : 1,
                        borderColor: selectedReport?._id === report._id ? 'primary.main' : 'divider',
                      }}
                      onClick={() => handleReportChange(report)}
                    >
                      <CardContent>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="h5" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                            Project: {report.projectName || report.projectId}
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                            Sprint: {report.sprint}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          {report.fileName || 'Jira Import'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Imported: {formatDate(report.importedAt)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Issues: {report.issueCount || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Data View */}
        <Grid item xs={12} md={8}>
          {selectedReport ? (
            <Card>
              <CardHeader
                title={`${selectedReport.fileName || 'Jira Import'} - ${selectedReport.projectName || selectedReport.projectId}`}
                subheader={`Sprint: ${selectedReport.sprint}`}
                action={
                  <Box>
                    <Tabs value={viewMode} onChange={(e, newValue) => setViewMode(newValue)}>
                      <Tab icon={<TableChart />} label="Table" value="table" />
                      <Tab icon={<BarChart />} label="Statistics" value="stats" />
                    </Tabs>
                  </Box>
                }
              />
              <CardContent>
                {viewMode === 'table' ? (
                  <Box>
                    {/* Filters */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            label="Status"
                          >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="To Do">To Do</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Done">Done</MenuItem>
                            <MenuItem value="Closed">Closed</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Priority</InputLabel>
                          <Select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                            label="Priority"
                          >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Assignee"
                          value={filters.assignee}
                          onChange={(e) => handleFilterChange('assignee', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Report Start Date"
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          helperText="Filter by report date range"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Report End Date"
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          helperText="Filter by report date range"
                        />
                      </Grid>
                    </Grid>

                    {/* Table */}
                    {loading ? (
                      <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Issue Key</TableCell>
                              <TableCell>Summary</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Priority</TableCell>
                              <TableCell>Assignee</TableCell>
                              <TableCell>Created</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {issues.map((issue) => (
                              <TableRow key={issue._id} hover>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="bold">
                                    {issue.issueKey}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Tooltip title={issue.summary}>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                      {issue.summary}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <Chip label={issue.issueType} size="small" />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={issue.status}
                                    color={getStatusColor(issue.status) as any}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={issue.priority}
                                    color={getPriorityColor(issue.priority) as any}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{issue.assignee}</TableCell>
                                <TableCell>{formatDate(issue.created)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <TablePagination
                          rowsPerPageOptions={[10, 25, 50, 100, { label: 'Show All', value: -1 }]}
                          component="div"
                          count={totalIssues}
                          rowsPerPage={rowsPerPage}
                          page={page}
                          onPageChange={handleChangePage}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                      </TableContainer>
                    )}
                  </Box>
                ) : (
                  /* Statistics View */
                  <Box>
                    {loadingStats ? (
                      <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                      </Box>
                    ) : stats ? (
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Total Issues: {stats.totalIssues}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Typography variant="h6" gutterBottom>Status Breakdown</Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={prepareChartData(stats.statusBreakdown)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#1473E6"
                                dataKey="value"
                              >
                                {prepareChartData(stats.statusBreakdown).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <Typography variant="h6" gutterBottom>Priority Breakdown</Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={prepareChartData(stats.priorityBreakdown)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#1473E6"
                                dataKey="value"
                              >
                                {prepareChartData(stats.priorityBreakdown).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <Typography variant="h6" gutterBottom>Issue Type Breakdown</Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={prepareChartData(stats.typeBreakdown)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#1473E6"
                                dataKey="value"
                              >
                                {prepareChartData(stats.typeBreakdown).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Grid>
                      </Grid>
                    ) : (
                      <Alert severity="info">No statistics available</Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Alert severity="info">
                  Select a report from the left panel to view its data
                </Alert>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default JiraDataViewer; 