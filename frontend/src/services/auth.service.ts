import apiClient from '@/api/client';
import { ILoginCredentials, ILoginResponse } from '@/interfaces/auth.interface';

export const AuthService = {
  async login(credentials: ILoginCredentials): Promise<ILoginResponse> {
    const response = await apiClient.post<ILoginResponse>('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
    }
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
}; 