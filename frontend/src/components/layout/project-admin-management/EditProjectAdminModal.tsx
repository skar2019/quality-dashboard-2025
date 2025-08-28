import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

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
  onSuccess: (updatedAdmin: ProjectAdmin) => void;
}

const EditProjectAdminModal: React.FC<Props> = ({ open, admin, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: admin.name,
    email: admin.email,
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const { adminPassword, ...rest } = form;
      const payload = { ...rest, password: adminPassword };
              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/project-admins/${admin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-role': currentUser.role
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const updatedAdmin = await response.json();
        onSuccess(updatedAdmin);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update project admin');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Project Admin</DialogTitle>
      <form onSubmit={handleSubmit} autoComplete="off">
        <DialogContent>
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            autoComplete="off"
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            autoComplete="off"
          />
          <TextField
            label="Password (leave blank to keep current)"
            name="adminPassword"
            type="password"
            value={form.adminPassword}
            onChange={handleChange}
            fullWidth
            margin="normal"
            placeholder="Enter new password or leave blank"
            autoComplete="new-password"
          />
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Updating...' : 'Update Admin'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditProjectAdminModal;