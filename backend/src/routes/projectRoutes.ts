import express from 'express';
import { projectController } from '../controllers/projectController';
import { validateRequest } from '../middleware/validateRequest';
import { projectValidation } from '../validations/projectValidation';

const router = express.Router();

// Create a new project
router.post(
    '/',
    validateRequest(projectValidation.createProject),
    projectController.createProject
);

// Get all projects with optional filters
router.get('/', projectController.getProjects);

// Get project statistics
router.get('/stats', projectController.getProjectStats);

// Get a single project by ID
router.get(
    '/:id',
    validateRequest(projectValidation.getProject),
    projectController.getProjectById
);

// Update a project
router.put(
    '/:id',
    validateRequest(projectValidation.updateProject),
    projectController.updateProject
);

// Delete a project
router.delete(
    '/:id',
    validateRequest(projectValidation.deleteProject),
    projectController.deleteProject
);

export default router; 