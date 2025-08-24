import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  FormatIndentIncrease as FormatIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const DocumentEditor = ({ open, onClose, collectionName, document, onSuccess }) => {
  const [jsonContent, setJsonContent] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState('');

  // Reset form when dialog opens/closes or document changes
  useEffect(() => {
    if (open) {
      if (document) {
        // Editing existing document
        setJsonContent(JSON.stringify(document, null, 2));
        setIsValidJson(true);
        setJsonError('');
      } else {
        // Creating new document
        setJsonContent('{\n  \n}');
        setIsValidJson(true);
        setJsonError('');
      }
    }
  }, [open, document]);

  // Validate JSON input
  const validateJson = (input) => {
    try {
      JSON.parse(input);
      setIsValidJson(true);
      setJsonError('');
      return true;
    } catch (error) {
      setIsValidJson(false);
      setJsonError(error.message);
      return false;
    }
  };

  const handleJsonChange = (event) => {
    const value = event.target.value;
    setJsonContent(value);
    validateJson(value);
  };

  const formatJson = () => {
    if (isValidJson) {
      try {
        const parsed = JSON.parse(jsonContent);
        setJsonContent(JSON.stringify(parsed, null, 2));
      } catch (error) {
        // Should not happen since we validated
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonContent);
    toast.success('JSON copied to clipboard!');
  };

  const resetForm = () => {
    if (document) {
      setJsonContent(JSON.stringify(document, null, 2));
    } else {
      setJsonContent('{\n  \n}');
    }
    setIsValidJson(true);
    setJsonError('');
  };

  // Create/Update document mutation
  const saveDocumentMutation = useMutation(
    async (data) => {
      if (document) {
        // Update existing document
        return api.put(`/collections/${collectionName}/documents/${document._id}`, data);
      } else {
        // Create new document
        return api.post(`/collections/${collectionName}/documents`, data);
      }
    },
    {
      onSuccess: (response) => {
        const action = document ? 'updated' : 'created';
        toast.success(`Document ${action} successfully!`);
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || `Failed to ${document ? 'update' : 'create'} document`);
      },
    }
  );

  const handleSave = () => {
    if (!isValidJson) {
      toast.error('Please fix JSON syntax errors before saving');
      return;
    }

    try {
      const data = JSON.parse(jsonContent);
      saveDocumentMutation.mutate(data);
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  const handleClose = () => {
    if (saveDocumentMutation.isLoading) return; // Prevent closing while saving
    
    // Ask for confirmation if there are unsaved changes
    if (jsonContent !== (document ? JSON.stringify(document, null, 2) : '{\n  \n}')) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isNewDocument = !document;
  const hasChanges = jsonContent !== (document ? JSON.stringify(document, null, 2) : '{\n  \n}');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isNewDocument ? 'Add New Document' : 'Edit Document'}
          </Typography>
          <Box>
            <Tooltip title="Format JSON">
              <IconButton onClick={formatJson} disabled={!isValidJson}>
                <FormatIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy JSON">
              <IconButton onClick={copyToClipboard}>
                <CopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset">
              <IconButton onClick={resetForm}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleClose} disabled={saveDocumentMutation.isLoading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Collection: <strong>{collectionName}</strong>
            {!isNewDocument && (
              <> • Document ID: <strong>{document._id}</strong></>
            )}
          </Typography>
        </Box>

        {jsonError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            JSON Error: {jsonError}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 1 }}>
          <TextField
            multiline
            fullWidth
            rows={20}
            value={jsonContent}
            onChange={handleJsonChange}
            error={!isValidJson}
            variant="outlined"
            placeholder="Enter JSON document..."
            sx={{
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '14px',
              },
            }}
          />
        </Paper>

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            💡 Tip: Use valid JSON format. The document will be saved exactly as entered.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saveDocumentMutation.isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={saveDocumentMutation.isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={!isValidJson || saveDocumentMutation.isLoading || !hasChanges}
        >
          {saveDocumentMutation.isLoading 
            ? 'Saving...' 
            : (isNewDocument ? 'Create Document' : 'Update Document')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentEditor;
