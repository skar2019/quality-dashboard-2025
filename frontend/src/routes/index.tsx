import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Login from '@/components/layout/Login';
import ProjectAdminList from '@/components/layout/ProjectAdminList'; // ADD THIS IMPORT
import ProjectList from '@/components/layout/ProjectList';

import ExecutiveOverview from '@/components/modules/ExecutiveOverview';
import QualityIntelligence from '@/components/modules/QualityIntelligence';
import HistoricalLearning from '@/components/modules/HistoricalLearning';
import RegionalAnalysis from '@/components/modules/RegionalAnalysis';
import SprintPerformance from '@/components/modules/SprintPerformance';
import DocumentIntelligence from '@/components/modules/DocumentIntelligence';
import PredictiveQuality from '@/components/modules/PredictiveQuality';
import JiraReportImport from '@/components/modules/JiraReportImport';
import JiraDataViewer from '@/components/modules/JiraDataViewer';
import TextSummarization from '@/components/modules/TextSummarization';
import ProjectInsiderAnalysis from '@/components/modules/ProjectInsiderAnalysis';


const ProtectedRoute: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState({
    isLoggedIn: false,
    user: null
  });

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/session`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setAuthenticated(data);
        setLoading(false);
      })
      .catch(() => {
        setAuthenticated({isLoggedIn: false, user: null});
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return authenticated.isLoggedIn ? (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<ExecutiveOverview />} />
        <Route path="quality-intelligence" element={<QualityIntelligence />} />
        <Route path="historical-learning" element={<HistoricalLearning />} />
        <Route path="regional-analysis" element={<RegionalAnalysis />} />
        <Route path="sprint-performance" element={<SprintPerformance />} />
        <Route path="document-intelligence" element={<DocumentIntelligence />} />
        <Route path="predictive-quality" element={<PredictiveQuality />} />
        <Route path="text-summarization" element={<TextSummarization />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="jira-report-import" element={<JiraReportImport />} />
        <Route path="data-viewer" element={<JiraDataViewer />} />
        <Route path="admin/users" element={<ProjectAdminList />} />
        <Route path="project-insider-analysis" element={<ProjectInsiderAnalysis />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes; 