import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Checkbox,
  Toolbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import DocumentEditor from './DocumentEditor';

const CollectionView = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filter, setFilter] = useState('{}');
  const [sort, setSort] = useState('{}');
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);

  // Fetch documents
  const { data: documentsData, isLoading, error, refetch } = useQuery(
    ['documents', name, page, rowsPerPage, filter, sort],
    async () => {
      const response = await api.get(`/collections/${name}/documents`, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          filter,
          sort,
        },
      });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  // Delete document mutation
  const deleteDocumentMutation = useMutation(
    (id) => api.delete(`/collections/${name}/documents/${id}`),
    {
      onSuccess: () => {
        toast.success('Document deleted successfully!');
        queryClient.invalidateQueries(['documents', name]);
        setSelectedRows([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete document');
      },
    }
  );

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation(
    (ids) => api.post(`/collections/${name}/documents/bulk-delete`, { ids }),
    {
      onSuccess: () => {
        toast.success('Documents deleted successfully!');
        queryClient.invalidateQueries(['documents', name]);
        setSelectedRows([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete documents');
      },
    }
  );

  // Computed values
  const documents = documentsData?.documents || [];
  const total = documentsData?.pagination?.total || 0;
  const totalPages = documentsData?.pagination?.pages || 0;

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle row selection
  const handleSelectAllRows = (event) => {
    if (event.target.checked) {
      setSelectedRows(documents.map(doc => doc._id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      toast.error('No documents selected');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} documents?`)) {
      bulkDeleteMutation.mutate(selectedRows);
    }
  };

  // Handle document operations
  const handleEditDocument = (document) => {
    setEditingDocument(document);
    setDocumentEditorOpen(true);
  };

  const handleDeleteDocument = (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteDocumentMutation.mutate(id);
    }
  };

  const handleAddDocument = () => {
    setEditingDocument(null);
    setDocumentEditorOpen(true);
  };

  // Filter and search
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    
    return documents.filter(doc => 
      JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // Get document keys for table headers
  const documentKeys = useMemo(() => {
    if (documents.length === 0) return [];
    
    const allKeys = new Set();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    
    return Array.from(allKeys).sort((a, b) => {
      // Put _id first
      if (a === '_id') return -1;
      if (b === '_id') return 1;
      return a.localeCompare(b);
    });
  }, [documents]);

  if (isLoading && !documentsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load documents: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Collection: {name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {total.toLocaleString()} documents • Page {page + 1} of {totalPages}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDocument}
          size="large"
        >
          Add Document
        </Button>
      </Box>

      {/* Toolbar */}
      <Paper sx={{ mb: 2 }}>
        <Toolbar>
          <Box display="flex" alignItems="center" gap={2} flex={1}>
            <TextField
              size="small"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setFilterDialogOpen(true)}
              variant="outlined"
              size="small"
            >
              Filter
            </Button>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              variant="outlined"
              size="small"
            >
              Refresh
            </Button>
          </Box>
          
          {selectedRows.length > 0 && (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {selectedRows.length} selected
              </Typography>
              <Button
                color="error"
                variant="outlined"
                size="small"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isLoading}
              >
                Delete Selected
              </Button>
            </Box>
          )}
        </Toolbar>
      </Paper>

      {/* Documents Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < documents.length}
                    checked={selectedRows.length === documents.length && documents.length > 0}
                    onChange={handleSelectAllRows}
                  />
                </TableCell>
                {documentKeys.map((key) => (
                  <TableCell key={key}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {key}
                      {key === '_id' && <Chip label="ID" size="small" color="primary" />}
                    </Box>
                  </TableCell>
                ))}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow 
                  key={doc._id} 
                  hover
                  selected={selectedRows.includes(doc._id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.includes(doc._id)}
                      onChange={() => handleSelectRow(doc._id)}
                    />
                  </TableCell>
                  {documentKeys.map((key) => (
                    <TableCell key={key}>
                      <Box sx={{ maxWidth: 200, overflow: 'hidden' }}>
                        {key === '_id' ? (
                          <Chip 
                            label={doc[key].toString().slice(-8)} 
                            size="small" 
                            variant="outlined"
                            title={doc[key].toString()}
                          />
                        ) : (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={JSON.stringify(doc[key])}
                          >
                            {typeof doc[key] === 'object' 
                              ? JSON.stringify(doc[key]).slice(0, 50) + '...'
                              : String(doc[key])
                            }
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditDocument(doc)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDocument(doc._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Filter Documents</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="MongoDB Filter (JSON)"
              multiline
              rows={4}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder='{"field": "value"}'
              helperText="Enter MongoDB query filter in JSON format"
            />
            <TextField
              label="Sort (JSON)"
              multiline
              rows={2}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              placeholder='{"field": 1}'
              helperText="Enter MongoDB sort in JSON format (1 for ascending, -1 for descending)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setFilterDialogOpen(false);
              setPage(0);
            }} 
            variant="contained"
          >
            Apply Filter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Editor Dialog */}
      <DocumentEditor
        open={documentEditorOpen}
        onClose={() => setDocumentEditorOpen(false)}
        collectionName={name}
        document={editingDocument}
        onSuccess={() => {
          setDocumentEditorOpen(false);
          queryClient.invalidateQueries(['documents', name]);
        }}
      />
    </Box>
  );
};

export default CollectionView;
