import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const regionalData = [
  { region: 'North America', defects: 120, resolved: 110, coverage: 95 },
  { region: 'Europe', defects: 150, resolved: 140, coverage: 92 },
  { region: 'Asia Pacific', defects: 180, resolved: 160, coverage: 88 },
  { region: 'Latin America', defects: 90, resolved: 85, coverage: 94 },
];

const moduleData = [
  { module: 'Frontend', defects: 45, complexity: 'High' },
  { module: 'Backend', defects: 35, complexity: 'Medium' },
  { module: 'Database', defects: 25, complexity: 'Low' },
  { module: 'API', defects: 30, complexity: 'Medium' },
];

const RegionalAnalysis: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Regional & Module Analysis
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Regional Performance Overview
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="defects" fill="#1473E6" name="Total Defects" />
                  <Bar dataKey="resolved" fill="#36B37E" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Regional Coverage
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Region</TableCell>
                    <TableCell align="right">Coverage (%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {regionalData.map((row) => (
                    <TableRow key={row.region}>
                      <TableCell component="th" scope="row">
                        {row.region}
                      </TableCell>
                      <TableCell align="right">{row.coverage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Module Analysis
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Module</TableCell>
                    <TableCell align="right">Defects</TableCell>
                    <TableCell align="right">Complexity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moduleData.map((row) => (
                    <TableRow key={row.module}>
                      <TableCell component="th" scope="row">
                        {row.module}
                      </TableCell>
                      <TableCell align="right">{row.defects}</TableCell>
                      <TableCell align="right">{row.complexity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RegionalAnalysis; 