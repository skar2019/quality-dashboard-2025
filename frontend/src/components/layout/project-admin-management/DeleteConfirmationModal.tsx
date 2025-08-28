import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ProjectAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  open: boolean;
  admin: ProjectAdmin;
  onClose: () => void;
  onSuccess: (deletedAdminId: string) => void;
}

const DeleteConfirmationModal: React.FC<Props> = ({ open, admin, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/project-admins/${admin.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'user-role': currentUser.role
        },
        credentials: 'include'
      });
      if (response.ok) {
        onSuccess(admin.id);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete project admin');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Project Admin</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{admin.name}</strong>? This action cannot be undone.
        </Typography>
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleDelete} 
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationModal;