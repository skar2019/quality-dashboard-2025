import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  Public as PublicIcon,
  Speed as SpeedIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  AccountCircle,
  People as PeopleIcon, // ADD THIS IMPORT for admin icon
  Folder as FolderIcon,
  CloudUpload as CloudUploadIcon, // ADD THIS IMPORT for Jira Report Import icon
  TableChart as TableChartIcon, // ADD THIS IMPORT for Data Viewer icon
  Summarize as SummarizeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Analytics as AnalyticsIcon, // ADD THIS IMPORT for Project Insider Analysis icon
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

const drawerWidth = 300;
const collapsedWidth = 60;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: 'Executive Overview', icon: <DashboardIcon />, path: '/dashboard' },
  // { text: 'Text Summarization', icon: <SummarizeIcon />, path: '/dashboard/text-summarization' },
  //{ text: 'Quality Intelligence', icon: <AssessmentIcon />, path: '/dashboard/quality-intelligence' },
  //{ text: 'Historical Learning', icon: <HistoryIcon />, path: '/dashboard/historical-learning' },
  //{ text: 'Regional Analysis', icon: <PublicIcon />, path: '/dashboard/regional-analysis' },
  //{ text: 'Sprint Performance', icon: <SpeedIcon />, path: '/dashboard/sprint-performance' },
  //{ text: 'Document Intelligence', icon: <DescriptionIcon />, path: '/dashboard/document-intelligence' },
  //{ text: 'Predictive Quality', icon: <TrendingUpIcon />, path: '/dashboard/predictive-quality' },
  { text: 'Project Management', icon: <FolderIcon />, path: '/dashboard/projects' },
  { text: 'Project Admin Management', icon: <PeopleIcon />, path: '/dashboard/admin/users' },
  { text: 'Jira Report Import', icon: <CloudUploadIcon />, path: '/dashboard/jira-report-import' },
  { text: 'Sprint Explore', icon: <TableChartIcon />, path: '/dashboard/data-viewer' },
  { text: 'Project Insider Analysis', icon: <AnalyticsIcon />, path: '/dashboard/project-insider-analysis' },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fetch current user from session endpoint
    const fetchSessionUser = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/session`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        setCurrentUser(null);
      }
    };
    fetchSessionUser();
  }, []);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDrawerOpen(!drawerOpen);
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    .then(res => res.json())
    navigate('/');
    handleClose();
  };

  const adobeLogo = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, width: 40 }}>
      <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
        <rect width="512" height="512" rx="0" fill="#FA0F00"/>
        <polygon fill="#fff" points="256,120 120,392 192,392 256,256 320,392 392,392"/>
      </svg>
    </Box>
  );

  const drawer = (
    <div>
      <Toolbar sx={{ minHeight: 64, px: 2, py: 0, display: 'flex', alignItems: 'center', gap: 0, justifyContent: drawerOpen ? 'flex-start' : 'center' }}>
        {adobeLogo}
        {drawerOpen ? (
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/dashboard"
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.5px',
              transition: 'opacity 0.2s',
              opacity: drawerOpen ? 1 : 0,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              height: 40,
            }}
          >
            Quality Dashboard
          </Typography>
        ) : (
          <DashboardIcon sx={{ color: 'white', fontSize: 32, display: 'flex', alignItems: 'center', height: 40 }} />
        )}
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setMobileOpen(false);
              }
            }}
            selected={location.pathname === item.path}
            sx={{
              cursor: 'pointer',
              justifyContent: drawerOpen ? 'flex-start' : 'center',
              px: drawerOpen ? 2 : 1,
              minHeight: 48,
              transition: 'all 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: drawerOpen ? 2 : 'auto', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
            {drawerOpen && <ListItemText primary={item.text} sx={{ opacity: drawerOpen ? 1 : 0, transition: 'opacity 0.2s' }} />}
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        color="secondary"
        sx={{
          width: { sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${collapsedWidth}px)` },
          ml: { sm: drawerOpen ? `${drawerWidth}px` : `${collapsedWidth}px` },
          transition: 'width 0.3s, margin-left 0.3s',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {isMobile ? <MenuIcon /> : (drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#FFFFFF' }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || 'Quality Dashboard'}
          </Typography>
          {currentUser && (
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              Welcome, {currentUser.name}
            </Typography>
          )}
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ 
          width: { sm: drawerOpen ? drawerWidth : collapsedWidth }, 
          flexShrink: { sm: 0 }, 
          height: '100vh',
          transition: 'width 0.3s',
        }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerOpen ? drawerWidth : collapsedWidth,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'stretch',
              transition: 'width 0.3s',
              overflowX: 'hidden',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${collapsedWidth}px)` },
          mt: '64px',
          transition: 'width 0.3s',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout; 