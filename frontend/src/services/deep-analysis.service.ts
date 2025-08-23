import axios from 'axios';

// Types for Deep Analysis
export interface DeepAnalysisRequest {
  message?: string;
  sprint?: string;
  project?: string;
  analysisType?: 'comprehensive' | 'risk' | 'performance' | 'quality' | 'trends';
  includeRecommendations?: boolean;
  includePredictions?: boolean;
}

export interface DeepAnalysisInsight {
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  evidence: string[];
  recommendations: string[];
}

export interface DeepAnalysisMetrics {
  overallHealth: number;
  riskScore: number;
  performanceScore: number;
  qualityScore: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface DeepAnalysisResponse {
  analysisType: string;
  summary: string;
  insights: DeepAnalysisInsight[];
  metrics: DeepAnalysisMetrics;
  recommendations: string[];
  predictions: string[];
  actionItems: string[];
  generatedAt: string;
  analysisTime: number;
}

class DeepAnalysisService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_ML_API_URL || 'http://localhost:8000';
  }

  async generateDeepAnalysis(request: DeepAnalysisRequest, retryCount: number = 0): Promise<DeepAnalysisResponse> {
    const maxRetries = 2;
    
    try {
      console.log(`Generating deep analysis with type: ${request.analysisType}`);
      console.log('Request payload:', request);
      
      const response = await axios.post(`${this.baseURL}/api/deep-summary-report/generate`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes timeout for deep analysis
      });
      
      console.log('Deep analysis response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Deep analysis API error (attempt ${retryCount + 1}):`, error);
      
      // Check if we should retry
      const shouldRetry = retryCount < maxRetries && (
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        (error.response && error.response.status >= 500) ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error')
      );
      
      if (shouldRetry) {
        console.log(`Retrying deep analysis request in ${(retryCount + 1) * 2000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.generateDeepAnalysis(request, retryCount + 1);
      }
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      throw new Error(`Deep analysis failed: ${error.message}`);
    }
  }

  async getDeepAnalysisStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/api/deep-summary-report/status`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting deep analysis status:', error);
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  async refreshDeepAnalysis(): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/api/deep-summary-report/refresh`);
      return response.data;
    } catch (error: any) {
      console.error('Error refreshing deep analysis:', error);
      throw new Error(`Failed to refresh: ${error.message}`);
    }
  }
}

export default new DeepAnalysisService();
