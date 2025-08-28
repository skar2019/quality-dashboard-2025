import axios from 'axios';

const ML_SERVICE_URL = process.env.REACT_APP_ML_API_URL || 'http://localhost:8000';

export interface ChatRequest {
  message: string;
  sprint?: string;
  project?: string;
}

export interface ChatResponse {
  response: string;
  sources: Array<{ [key: string]: string }>;
  project_context: {
    total_projects: number;
    total_jira_items: number;
  };
  query_time?: number;
}

// New interfaces for structured data
export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  issue_type: string;
  resolution: string;
  project: string;
  sprint: string;
}

export interface ProjectSummary {
  project_name: string;
  task_count: number;
  completed_tasks: number;
  in_progress_tasks: number;
  high_priority_tasks: number;
  bugs: number;
}

export interface StructuredChatResponse {
  message_type: 'text' | 'task_list' | 'project_summary';
  text_response?: string;
  tasks?: TaskData[];
  project_summaries?: ProjectSummary[];
  statistics?: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    high_priority_tasks: number;
    bugs: number;
  };
  query_time?: number;
}

class ChatbotService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${ML_SERVICE_URL}/api/chatbot`;
  }

  async sendMessage(request: ChatRequest, retryCount: number = 0): Promise<ChatResponse> {
    const maxRetries = 2;
    
    try {
      console.log(`Sending request to: ${this.baseURL}/chat (attempt ${retryCount + 1}/${maxRetries + 1})`);
      console.log('Request payload:', request);
      
      const response = await axios.post(`${this.baseURL}/chat`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000, // Increased timeout to 45 seconds
      });
      
      console.log('Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Chatbot API error (attempt ${retryCount + 1}):`, error);
      
      // Check if we should retry
      const shouldRetry = retryCount < maxRetries && (
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ECONNRESET' ||   // Connection reset
        error.code === 'ENOTFOUND' ||    // DNS resolution failed
        error.code === 'ECONNREFUSED' || // Connection refused
        (error.response && error.response.status >= 500) || // Server errors
        error.message.includes('timeout') ||
        error.message.includes('Network Error')
      );
      
      if (shouldRetry) {
        console.log(`Retrying request in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.sendMessage(request, retryCount + 1);
      }
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        throw new Error(`Server error (${error.response.status}): ${error.response.data?.detail || error.response.data?.error || 'Unknown server error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error('No response from server. Please check your connection and try again.');
      } else {
        console.error('Error setting up request:', error.message);
        throw new Error(`Connection error: ${error.message}`);
      }
    }
  }

  async getStructuredData(request: ChatRequest, retryCount: number = 0): Promise<StructuredChatResponse> {
    const maxRetries = 2;
    
    try {
      console.log(`Sending structured data request to: ${this.baseURL}/data (attempt ${retryCount + 1}/${maxRetries + 1})`);
      console.log('Request payload:', request);
      
      const response = await axios.post(`${this.baseURL}/data`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });
      
      console.log('Structured response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Structured data API error (attempt ${retryCount + 1}):`, error);
      
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
        console.log(`Retrying structured data request in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return this.getStructuredData(request, retryCount + 1);
      }
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        throw new Error(`Server error (${error.response.status}): ${error.response.data?.detail || error.response.data?.error || 'Unknown server error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error('No response from server. Please check your connection and try again.');
      } else {
        console.error('Error setting up request:', error.message);
        throw new Error(`Connection error: ${error.message}`);
      }
    }
  }

  async getStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/status`);
      return response.data;
    } catch (error) {
      console.error('Chatbot status error:', error);
      throw new Error('Failed to get chatbot status');
    }
  }

  async debugDatabase(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/debug/database`);
      return response.data;
    } catch (error) {
      console.error('Database debug error:', error);
      throw new Error('Failed to get database debug info');
    }
  }

  async testRAGFunctionality(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/debug/rag-test`);
      return response.data;
    } catch (error) {
      console.error('RAG test error:', error);
      throw new Error('Failed to test RAG functionality');
    }
  }

  // Get available projects and sprints for search form
  async getAvailableProjects(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/embedding-count`);
      return response.data.projects || [];
    } catch (error) {
      console.error('Failed to get available projects:', error);
      return ['Adani', 'Digital Transformation', 'Legacy Migration', 'Quality Dashboard', 'Mobile App'];
    }
  }

  async getAvailableSprints(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseURL}/embedding-count`);
      return response.data.sprints || [];
    } catch (error) {
      console.error('Failed to get available sprints:', error);
      return ['sprint-1', 'sprint-2', 'sprint-3'];
    }
  }
}

export default new ChatbotService(); 