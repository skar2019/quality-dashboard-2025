import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import apiClient, { ML_SERVICE_URL } from '../../api/client';

const TextSummarization: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to summarize');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');

    try {
      const response = await apiClient.post(`${ML_SERVICE_URL}/api/summarize`, {
        text: inputText,
      });
      setSummary(response.data.summary);
    } catch (err) {
      setError('Failed to generate summary. Please try again.');
      console.error('Summarization error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Text Summarization
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Enter your text below to generate a concise summary using AI.
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <TextField
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              label="Enter text to summarize"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              error={!!error}
              helperText={error}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading || !inputText.trim()}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Summary'}
            </Button>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Typography variant="body1">{summary}</Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default TextSummarization; 