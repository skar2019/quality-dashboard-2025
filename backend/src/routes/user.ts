import express from 'express';
import { 
  login,
  session,
  logout,
  getAllProjectAdmins, 
  createProjectAdmin, 
  updateProjectAdmin, 
  deleteProjectAdmin 
} from '../controllers/userController';

const router = express.Router();

// Test route to verify routing works
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ message: 'Backend is working!' });
});

// Authentication
router.post('/login', login);
router.get('/session', session);
router.post('/logout', logout);

// Project Admin CRUD (Super Admin only)
router.get('/project-admins', getAllProjectAdmins);
router.post('/project-admins', createProjectAdmin);
router.put('/project-admins/:id', updateProjectAdmin);
router.delete('/project-admins/:id', deleteProjectAdmin);

export default router;