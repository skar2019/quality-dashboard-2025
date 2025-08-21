import express from 'express';
import axios from 'axios';

const router = express.Router();

// ML Models API URL
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// Proxy chat request to ML models service
router.post('/chat', (req, res) => {
  const { message, conversation_history } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  axios.post(`${ML_API_URL}/api/chatbot/chat`, {
    message,
    conversation_history
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Chatbot error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to connect to chatbot service',
        detail: error.message 
      });
    }
  });
});

// Proxy RAG chat request to ML models service
router.post('/rag-chat', (req, res) => {
  const { message, conversation_history } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  axios.post(`${ML_API_URL}/api/chatbot/rag-chat`, {
    message,
    conversation_history
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('RAG Chatbot error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to connect to RAG chatbot service',
        detail: error.message 
      });
    }
  });
});

// Process JIRA data for RAG
router.post('/process-jira-data', async (req, res) => {
  try {
    const { jira_data } = req.body;
    
    if (!jira_data || !Array.isArray(jira_data)) {
      return res.status(400).json({ error: 'JIRA data array is required' });
    }

    const response = await axios.post(`${ML_API_URL}/api/chatbot/process-jira-data`, {
      jira_data
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('JIRA data processing error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to process JIRA data',
        detail: error.message 
      });
    }
  }
});

// Process existing JIRA data for RAG
router.post('/process-existing-jira-data', async (req, res) => {
  try {
    const response = await axios.post(`${ML_API_URL}/api/chatbot/process-existing-jira-data`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Existing JIRA data processing error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to process existing JIRA data',
        detail: error.message 
      });
    }
  }
});

// Get chat history
router.get('/chat-history', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/api/chatbot/chat-history`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Get chat history error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to get chat history',
        detail: error.message 
      });
    }
  }
});

// Clear chat history
router.delete('/chat-history', async (req, res) => {
  try {
    const response = await axios.delete(`${ML_API_URL}/api/chatbot/chat-history`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Clear chat history error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to clear chat history',
        detail: error.message 
      });
    }
  }
});

// Get chatbot health
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/api/chatbot/health`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Chatbot health check error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to check chatbot health',
        detail: error.message 
      });
    }
  }
});

// Get project context
router.get('/project-context', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/api/chatbot/project-context`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Get project context error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to get project context',
        detail: error.message 
      });
    }
  }
});

export default router; 