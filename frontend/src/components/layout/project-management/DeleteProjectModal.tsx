import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { projectService } from '@/services/project.service';
import { Project } from '@/interfaces/project.interface';

interface DeleteProjectModalProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSuccess: (deletedProjectId: string) => void;
}

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ open, project, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const id = project.id || project._id;
      if (id) {
        await projectService.deleteProject(id);
        onSuccess(id);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Project</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete project "{project.name}"? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleDelete} 
          disabled={loading}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteProjectModal; 