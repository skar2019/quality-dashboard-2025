import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Storage as StorageIcon,
  Collections as CollectionsIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const Dashboard = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch collections
  const { data: collectionsResponse, isLoading, error, refetch } = useQuery(
    'collections',
    async () => {
      const response = await api.get('/collections');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Create collection mutation
  const createCollectionMutation = useMutation(
    (name) => api.post('/collections', { name }),
    {
      onSuccess: () => {
        toast.success('Collection created successfully!');
        setCreateDialogOpen(false);
        setNewCollectionName('');
        queryClient.invalidateQueries('collections');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create collection');
      },
    }
  );

  // Delete collection mutation
  const deleteCollectionMutation = useMutation(
    (name) => api.delete(`/collections/${name}`),
    {
      onSuccess: () => {
        toast.success('Collection deleted successfully!');
        setDeleteConfirmOpen(false);
        setCollectionToDelete(null);
        queryClient.invalidateQueries('collections');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete collection');
      },
    }
  );

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      toast.error('Collection name is required');
      return;
    }
    createCollectionMutation.mutate(newCollectionName.trim());
  };

  const handleDeleteCollection = (collection) => {
    setCollectionToDelete(collection);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (collectionToDelete) {
      deleteCollectionMutation.mutate(collectionToDelete.name);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load collections: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🍃 MongoDB Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your MongoDB collections and documents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          New Collection
        </Button>
      </Box>

      {/* Collections Grid */}
      <Grid container spacing={3}>
        {collectionsResponse?.map((collection) => (
          <Grid item xs={12} sm={6} md={4} key={collection.name}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 }
              }}
              onClick={() => navigate(`/collection/${collection.name}`)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <StorageIcon color="primary" sx={{ fontSize: 40 }} />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="h6" component="h3" gutterBottom>
                  {collection.name}
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DocumentIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {collection.count.toLocaleString()} documents
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <CollectionsIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {collection.indexes} indexes
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Size: {formatBytes(collection.size)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Storage: {formatBytes(collection.storageSize)}
                  </Typography>
                </Box>
                
                <Box mt={2}>
                  <Chip 
                    label="View Collection" 
                    color="primary" 
                    variant="outlined"
                    size="small"
                    icon={<ViewIcon />}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Collection Name"
            fullWidth
            variant="outlined"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Enter collection name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCollection} 
            variant="contained"
            disabled={createCollectionMutation.isLoading}
          >
            {createCollectionMutation.isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the collection "{collectionToDelete?.name}"?
            This action cannot be undone and will permanently remove all documents in this collection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteCollectionMutation.isLoading}
          >
            {deleteCollectionMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
