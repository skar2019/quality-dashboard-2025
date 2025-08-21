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
  onClose: () => void;
  onSuccess: (newAdmin: ProjectAdmin) => void;
}

const AddProjectAdminModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
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
      const payload = {
        name: form.name,
        email: form.email,
        password: adminPassword,
        currentUserRole: currentUser.role
      };
      console.log('📝 Sending payload:', payload);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/project-admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-role': currentUser.role
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const newAdmin = await response.json();
        console.log('✅ Received response:', newAdmin);
        onSuccess(newAdmin);
        onClose();
      } else {
        const errorData = await response.json();
        console.error('❌ API error:', errorData);
        setError(errorData.message || 'Failed to create project admin');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Project Admin</DialogTitle>
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
            label="Password"
            name="adminPassword"
            type="password"
            value={form.adminPassword}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            autoComplete="new-password"
          />
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Creating...' : 'Add'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddProjectAdminModal;