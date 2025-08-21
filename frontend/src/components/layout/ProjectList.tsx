import React, { useEffect, useState } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Typography, Box } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { projectService } from '@/services/project.service';
import { Project } from '@/interfaces/project.interface';
import AddProjectModal from './project-management/AddProjectModal';
import EditProjectModal from './project-management/EditProjectModal';
import DeleteProjectModal from './project-management/DeleteProjectModal';
import { Button as MuiButton } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import './../../style/projectAdmin.css';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({ open: false, message: '', severity: 'success' });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getAllProjects();
      setProjects(data.data || data); // handle both paginated and non-paginated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddSuccess = (newProject: Project) => {
    setShowAddModal(false);
    showSnackbar('Project added successfully!', 'success');
    fetchProjects(); // Always refresh from backend
  };

  const handleEditSuccess = (updatedProject: Project) => {
    setEditingProject(null);
    showSnackbar('Project updated successfully!', 'success');
    fetchProjects(); // Always refresh from backend
  };

  const handleDeleteSuccess = (deletedProjectId: string) => {
    setDeletingProject(null);
    showSnackbar('Project deleted successfully!', 'success');
    fetchProjects(); // Refresh the list from the backend
  };

  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="project-admin-container">
      <div className="project-admin-header-bar">
        <span>Project Management</span>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          Add Project
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.description}</td>
                <td>{project.startDate && !isNaN(Date.parse(project.startDate)) ? new Date(project.startDate).toLocaleDateString() : ''}</td>
                <td>{project.endDate && !isNaN(Date.parse(project.endDate)) ? new Date(project.endDate).toLocaleDateString() : ''}</td>
                <td>{project.status}</td>
                <td>{project.createdAt && !isNaN(Date.parse(project.createdAt)) ? new Date(project.createdAt).toLocaleDateString() : ''}</td>
                <td>
                  <button 
                    className="btn btn-edit"
                    onClick={() => setEditingProject(project)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-delete"
                    onClick={() => setDeletingProject(project)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="no-data">No projects found.</div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProjectModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editingProject && (
        <EditProjectModal
          open={!!editingProject}
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingProject && (
        <DeleteProjectModal
          open={!!deletingProject}
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default ProjectList; 