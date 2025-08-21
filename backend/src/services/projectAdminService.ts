import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Get current user from localStorage (stored after login)
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const projectAdminService = {
  // Get all project admins
  getAllProjectAdmins: async () => {
    const currentUser = getCurrentUser();
    const response = await api.get('/user/project-admins', {
      headers: {
        'user-role': currentUser?.role
      }
    });
    return response.data;
  },

  // Create project admin
  createProjectAdmin: async (data: { name: string; email: string; password: string }) => {
    const currentUser = getCurrentUser();
    const response = await api.post('/user/project-admins', {
      ...data,
      currentUserRole: currentUser?.role
    });
    return response.data;
  },

  // Update project admin
  updateProjectAdmin: async (id: string, data: { name: string; email: string; password?: string }) => {
    const currentUser = getCurrentUser();
    const response = await api.put(`/user/project-admins/${id}`, {
      ...data,
      currentUserRole: currentUser?.role
    });
    return response.data;
  },

  // Delete project admin
  deleteProjectAdmin: async (id: string) => {
    const currentUser = getCurrentUser();
    await api.delete(`/user/project-admins/${id}`, {
      headers: {
        'user-role': currentUser?.role
      }
    });
  },
};