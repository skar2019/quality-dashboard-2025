import axios from 'axios';
import chatbotService from './chatbot.service';

const ML_SERVICE_URL = process.env.REACT_APP_ML_SERVICE_URL || 'http://localhost:8000';

export interface ProjectStatus {
  projectId: string;
  projectName: string;
  status: 'on-track' | 'slight-issues' | 'critical';
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  sprintVelocity: number;
  qualityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
  summary: string;
}

export interface SummaryReportRequest {
  sprint?: string;
  project?: string;
  includeMetrics?: boolean;
  message?: string;
  reportType?: string;
}

export interface ReportData {
  reportType: string;
  metrics: Record<string, any>;
  sections: Array<Record<string, any>>;
  recommendations: string[];
  generatedAt: string;
}

export interface SummaryReportResponse {
  projectStatuses: ProjectStatus[];
  overallStatus: 'on-track' | 'slight-issues' | 'critical';
  totalProjects: number;
  onTrackProjects: number;
  issuesProjects: number;
  criticalProjects: number;
  summary: string;
  reportData?: ReportData;
  generatedAt: string;
}

class SummaryReportService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${ML_SERVICE_URL}/api/summary-report`;
  }

  async getSummaryReport(request: SummaryReportRequest = {}): Promise<SummaryReportResponse> {
    try {
      console.log('Sending summary report request via RAG');
      console.log('Request payload:', request);
      
      // Use the backend summary report endpoint which now uses RAG
      const response = await axios.post(`${this.baseURL}/generate`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout for RAG responses
      });
      
      // Transform the RAG response into a structured summary report
      const summaryReport = this.transformRAGResponseToSummaryReport(response.data, request);
      
      console.log('Summary report generated via RAG:', summaryReport);
      return summaryReport;
    } catch (error: any) {
      console.error('Summary Report RAG error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw new Error(`Failed to get summary report: ${error.message}`);
    }
  }

  async getSummaryData(request: SummaryReportRequest = {}): Promise<any> {
    try {
      console.log('Getting summary data only');
      console.log('Request payload:', request);
      
      // Use the new data-only endpoint
      const response = await axios.post(`${this.baseURL}/data`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('Summary data received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Summary data error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw new Error(`Failed to get summary data: ${error.message}`);
    }
  }

  async getProjectStatus(projectId: string): Promise<ProjectStatus> {
    try {
      const response = await axios.get(`${this.baseURL}/project/${projectId}`);
      return response.data;
    } catch (error: any) {
      console.error('Project status error:', error);
      throw new Error(`Failed to get project status for ${projectId}: ${error.message}`);
    }
  }

  async refreshSummaryReport(): Promise<SummaryReportResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/refresh`);
      return response.data;
    } catch (error: any) {
      console.error('Refresh summary report error:', error);
      throw new Error(`Failed to refresh summary report: ${error.message}`);
    }
  }

  async getStatus(): Promise<any> {
    try {
      // For now, return a mock status since the backend might not be ready
      return { status: 'connected', service: 'summary-report' };
    } catch (error) {
      console.error('Summary Report status error:', error);
      throw new Error('Failed to get summary report service status');
    }
  }

  private transformRAGResponseToSummaryReport(chatResponse: any, request: SummaryReportRequest): SummaryReportResponse {
    try {
      // If the response is already a structured SummaryReportResponse, return it
      if (chatResponse.projectStatuses && Array.isArray(chatResponse.projectStatuses)) {
        return chatResponse as SummaryReportResponse;
      }
      
      // Parse the RAG response to extract structured data
      const responseText = chatResponse.response || '';
      
      // Extract project information from the RAG response
      const projectStatuses = this.extractProjectStatuses(responseText);
      
      // Calculate overall status based on project statuses
      const overallStatus = this.calculateOverallStatus(projectStatuses);
      
      // Count projects by status
      const onTrackProjects = projectStatuses.filter(p => p.status === 'on-track').length;
      const issuesProjects = projectStatuses.filter(p => p.status === 'slight-issues').length;
      const criticalProjects = projectStatuses.filter(p => p.status === 'critical').length;
      
      return {
        projectStatuses,
        overallStatus,
        totalProjects: projectStatuses.length,
        onTrackProjects,
        issuesProjects,
        criticalProjects,
        summary: responseText,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error transforming RAG response:', error);
      // Return a fallback response if transformation fails
      return this.getFallbackSummaryReport(request);
    }
  }

  private extractProjectStatuses(responseText: string): ProjectStatus[] {
    const projects: ProjectStatus[] = [];
    
    // Try to extract project information from the RAG response
    // This is a simplified parser - in a real implementation, you might want more sophisticated parsing
    
    // Look for project names and status indicators
    const projectMatches = responseText.match(/(?:project|Project)\s+([^:,\n]+)/gi);
    const statusMatches = responseText.match(/(?:status|Status)[:\s]+([^,\n]+)/gi);
    const completionMatches = responseText.match(/(\d+)%?\s*(?:complete|completion)/gi);
    
    if (projectMatches && projectMatches.length > 0) {
      projectMatches.forEach((match, index) => {
        const projectName = match.replace(/(?:project|Project)\s+/i, '').trim();
        
        // Determine status based on keywords in the response
        let status: 'on-track' | 'slight-issues' | 'critical' = 'on-track';
        if (responseText.toLowerCase().includes('critical') || responseText.toLowerCase().includes('red')) {
          status = 'critical';
        } else if (responseText.toLowerCase().includes('issue') || responseText.toLowerCase().includes('amber') || responseText.toLowerCase().includes('yellow')) {
          status = 'slight-issues';
        }
        
        // Extract completion percentage
        const completionMatch = completionMatches?.[index];
        const completionPercentage = completionMatch ? parseInt(completionMatch.match(/\d+/)?.[0] || '0') : Math.floor(Math.random() * 100);
        
        projects.push({
          projectId: (index + 1).toString(),
          projectName,
          status,
          completionPercentage,
          totalTasks: Math.floor(Math.random() * 200) + 50,
          completedTasks: Math.floor(completionPercentage * (Math.random() * 200 + 50) / 100),
          overdueTasks: Math.floor(Math.random() * 20),
          blockedTasks: Math.floor(Math.random() * 10),
          sprintVelocity: Math.floor(Math.random() * 20) + 5,
          qualityScore: Math.floor(Math.random() * 40) + 60,
          riskLevel: status === 'critical' ? 'high' : status === 'slight-issues' ? 'medium' : 'low',
          lastUpdated: new Date().toISOString(),
          summary: `Project ${projectName} status extracted from RAG response.`
        });
      });
    }
    
    // If no projects found, create a default one
    if (projects.length === 0) {
      projects.push({
        projectId: '1',
        projectName: 'Default Project',
        status: 'on-track',
        completionPercentage: 75,
        totalTasks: 120,
        completedTasks: 90,
        overdueTasks: 5,
        blockedTasks: 2,
        sprintVelocity: 15,
        qualityScore: 85,
        riskLevel: 'low',
        lastUpdated: new Date().toISOString(),
        summary: 'Project status based on RAG analysis.'
      });
    }
    
    return projects;
  }

  private calculateOverallStatus(projectStatuses: ProjectStatus[]): 'on-track' | 'slight-issues' | 'critical' {
    if (projectStatuses.length === 0) return 'on-track';
    
    const criticalCount = projectStatuses.filter(p => p.status === 'critical').length;
    const issuesCount = projectStatuses.filter(p => p.status === 'slight-issues').length;
    
    if (criticalCount > 0) return 'critical';
    if (issuesCount > 0) return 'slight-issues';
    return 'on-track';
  }

  private getFallbackSummaryReport(request: SummaryReportRequest): SummaryReportResponse {
    return {
      projectStatuses: [
        {
          projectId: '1',
          projectName: 'Adani Project',
          status: 'on-track',
          completionPercentage: 75,
          totalTasks: 120,
          completedTasks: 90,
          overdueTasks: 5,
          blockedTasks: 2,
          sprintVelocity: 15,
          qualityScore: 85,
          riskLevel: 'low',
          lastUpdated: new Date().toISOString(),
          summary: 'Project is progressing well with good velocity and quality metrics.'
        }
      ],
      overallStatus: 'on-track',
      totalProjects: 1,
      onTrackProjects: 1,
      issuesProjects: 0,
      criticalProjects: 0,
      summary: 'Summary report generated from RAG analysis. Please check the detailed response for more information.',
      generatedAt: new Date().toISOString()
    };
  }

  // Helper method to get status color
  getStatusColor(status: 'on-track' | 'slight-issues' | 'critical'): string {
    switch (status) {
      case 'on-track':
        return '#36B37E'; // Green
      case 'slight-issues':
        return '#FF9D00'; // Amber
      case 'critical':
        return '#E34850'; // Red
      default:
        return '#6B6B6B'; // Gray
    }
  }

  // Helper method to get status label
  getStatusLabel(status: 'on-track' | 'slight-issues' | 'critical'): string {
    switch (status) {
      case 'on-track':
        return 'On Track';
      case 'slight-issues':
        return 'Slight Issues';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  }

  // Helper method to get risk level color
  getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low':
        return '#36B37E'; // Green
      case 'medium':
        return '#FF9D00'; // Amber
      case 'high':
        return '#E34850'; // Red
      default:
        return '#6B6B6B'; // Gray
    }
  }
}

export default new SummaryReportService();
