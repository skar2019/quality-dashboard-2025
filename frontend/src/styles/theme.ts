import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1473E6', // Adobe Blue - primary brand color
      light: '#4A9EFF',
      dark: '#0D5BB8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FA0F00', // Adobe Red for AppBar
      light: '#FF4D4D',
      dark: '#CC0000',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E34850', // Adobe Error Red
      light: '#FF6B6B',
      dark: '#B91C1C',
    },
    warning: {
      main: '#FF9D00', // Adobe Warning Orange
      light: '#FFB84D',
      dark: '#CC7A00',
    },
    success: {
      main: '#36B37E', // Adobe Success Green
      light: '#57D9A3',
      dark: '#2B8A5F',
    },
    info: {
      main: '#0066CC', // Adobe Info Blue
      light: '#4A9EFF',
      dark: '#004499',
    },
    background: {
      default: '#F8F9FA', // Adobe Light Gray Background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2C2C', // Adobe Dark Gray for primary text
      secondary: '#6B6B6B', // Adobe Medium Gray for secondary text
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Adobe Clean", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    h2: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    h3: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    h4: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    h5: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    h6: {
      fontWeight: 600,
      color: '#2C2C2C',
    },
    body1: {
      color: '#2C2C2C',
    },
    body2: {
      color: '#6B6B6B',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E0E0E0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme; 