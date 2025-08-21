import React, { useState } from 'react';
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

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newProject: Project) => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState<Partial<Project>>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState('');

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
      const newProject = await projectService.createProject(form);
      onSuccess(newProject);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Project</DialogTitle>
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
          <Button type="submit" variant="contained" disabled={loading}>Add</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddProjectModal; 