import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { projectService } from '@/services/project.service';
import { Project } from '@/interfaces/project.interface';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface EditProjectModalProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSuccess: (updatedProject: Project) => void;
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ open, project, onClose, onSuccess }) => {
  const [form, setForm] = useState<Partial<Project>>({
    ...project,
    startDate: formatDate(project.startDate),
    endDate: formatDate(project.endDate),
  });
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    setForm({
      ...project,
      startDate: formatDate(project.startDate),
      endDate: formatDate(project.endDate),
    });
    setDateError('');
  }, [project]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'startDate' || e.target.name === 'endDate') {
      setDateError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate end date > start date
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      setDateError('End date must be after start date');
      return;
    }
    setLoading(true);
    try {
      const id = project.id || project._id;
      if (id) {
        const updatedProject = await projectService.updateProject(id, form);
        onSuccess(updatedProject);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Project</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Start Date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="End Date"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          {dateError && (
            <div style={{ color: 'red', marginBottom: 8 }}>{dateError}</div>
          )}
          <TextField
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            select
            fullWidth
            margin="normal"
            required
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>Update</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditProjectModal; 