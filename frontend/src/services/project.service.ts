import apiClient from '@/api/client';
import { Project } from '@/interfaces/project.interface';

export const projectService = {
  async getAllProjects(params = {}) {
    const response = await apiClient.get('/api/projects', { params });
    return response.data;
  },

  async getProjectById(id: string) {
    const response = await apiClient.get(`/api/projects/${id}`);
    return response.data;
  },

  async createProject(project: Partial<Project>) {
    const response = await apiClient.post('/api/projects', project);
    return response.data;
  },

  async updateProject(id: string, project: Partial<Project>) {
    const response = await apiClient.put(`/api/projects/${id}`, project);
    return response.data;
  },

  async deleteProject(id: string) {
    const response = await apiClient.delete(`/api/projects/${id}`);
    return response.data;
  },
}; 