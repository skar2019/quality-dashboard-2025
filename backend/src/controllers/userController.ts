import { Request, Response } from 'express';
import User from '../models/users';
import { v4 as uuidv4 } from 'uuid';
import { IUser } from '../types/user';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      userType: string;
    };
  }
}
// Simple login (your existing approach)
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    console.log('🔍 login - Attempting login for email:', email);
    
    const user = await User.findOne({ email, password });
    if (!user) {
      console.log('❌ login - Invalid credentials for email:', email);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    console.log('✅ login - User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType
    });

    req.session.isAuthenticated = true;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType
    };
    
    console.log('🔍 login - Session after setting user:', {
      sessionId: req.session.id,
      isAuthenticated: req.session.isAuthenticated,
      user: req.session.user
    });
    
    // Return user data for frontend to store
    res.json({
      user: {
        id: user.id,
        name: user.name, // Use actual name field
        email: user.email,
        role: user.userType      // Map for frontend
      }
    });
  } catch (err) {
    console.error('❌ login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const session = async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 session - Checking session:', {
    sessionId: req.session.id,
    isAuthenticated: req.session.isAuthenticated,
    user: req.session.user
  });
  
  if (req.session.isAuthenticated) {
    console.log('✅ session - User is authenticated');
    res.json({ isLoggedIn: true , user: req.session.user});
  } else {
    console.log('❌ session - User is not authenticated');
    res.status(401).json({ isLoggedIn: false, message: 'Not authenticated' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: 'Server error' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
};

// Get all project admins (Simple version)
export const getAllProjectAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    // Debug: log session
    console.log('🔍 getAllProjectAdmins - Full session:', req.session);
    console.log('🔍 getAllProjectAdmins - Session user:', req.session.user);
    console.log('🔍 getAllProjectAdmins - Session ID:', req.session.id);
    
    // Safe check for session user
    if (!req.session.user) {
      console.log('❌ getAllProjectAdmins - No session user found');
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    
    // Check if user is super_admin
    const userType = req.session.user.userType;
    console.log('🔍 getAllProjectAdmins - User type:', userType);
  

    const projectAdmins = await User.find({ userType: 'project_admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Map for frontend
    const mappedAdmins = projectAdmins.map(admin => ({
      id: admin.id,
      name: admin.name, // Use actual name field
      email: admin.email,
      role: admin.userType,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    }));

    console.log('✅ getAllProjectAdmins - Returning', mappedAdmins.length, 'project admins');
    res.json(mappedAdmins);
  } catch (err) {
    console.error('❌ getAllProjectAdmins error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create project admin (Simple version)
export const createProjectAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, currentUserRole } = req.body;
    
    // Debug logging
    console.log('🔍 createProjectAdmin - Request body:', req.body);
    console.log('🔍 createProjectAdmin - Extracted fields:', { name, email, password, currentUserRole });

    // Validate required fields
    if (!name || !email || !password) {
      console.log('❌ Validation failed - missing fields:', { name: !!name, email: !!email, password: !!password });
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Create new project admin
    const newAdmin = new User({
      id: uuidv4(),
      name,
      email,
      password, // Keep it simple - plain text password
      userType: 'project_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('🔍 createProjectAdmin - User model before save:', {
      name: newAdmin.name,
      email: newAdmin.email,
      userType: newAdmin.userType
    });

    await newAdmin.save();

    console.log('🔍 createProjectAdmin - User model after save:', {
      name: newAdmin.name,
      email: newAdmin.email,
      userType: newAdmin.userType
    });

    // Return admin data (without password)
    const adminResponse = {
      id: newAdmin.id,
      name: newAdmin.name, // Use actual name field
      email: newAdmin.email,
      role: newAdmin.userType,
      createdAt: newAdmin.createdAt,
      updatedAt: newAdmin.updatedAt
    };

    console.log('🔍 createProjectAdmin - Response being sent:', adminResponse);

    res.status(201).json(adminResponse);
  } catch (err) {
    console.error('❌ createProjectAdmin - Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update project admin (Simple version)
export const updateProjectAdmin = async (req: Request, res: Response): Promise<void> => {
  try {

    const { id } = req.params;
    const { name, email, password, currentUserRole } = req.body;
    
    // Find the admin to update
    const admin = await User.findOne({ id });
    if (!admin) {
      res.status(404).json({ message: 'Project admin not found' });
      return;
    }

    // Check if email already exists (excluding current admin)
    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email, id: { $ne: id } });
      if (existingUser) {
        res.status(400).json({ message: 'Email already exists' });
        return;
      }
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password && password.trim() !== '') admin.password = password;
    admin.updatedAt = new Date();

    await admin.save();

    // Return updated admin data
    const adminResponse = {
      id: admin.id,
      name: admin.name, // Use actual name field
      email: admin.email,
      role: admin.userType,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    res.json(adminResponse);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete project admin (Simple version)
export const deleteProjectAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Debug: log session
    console.log('🔍 deleteProjectAdmin - Full session:', req.session);
    console.log('🔍 deleteProjectAdmin - Session user:', req.session.user);
    console.log('🔍 deleteProjectAdmin - Session ID:', req.session.id);
    
    // Access user from in-memory session
    const user = req.session.user;
    if (!user) {
      console.log('❌ deleteProjectAdmin - No session user found');
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    
    const userType = user.userType;
    console.log('🔍 deleteProjectAdmin - User type:', userType);
    
    if (userType !== 'super_admin') {
      console.log('❌ deleteProjectAdmin - Access denied, user type:', userType);
      res.status(403).json({ message: 'Access denied. Super Admin only.' });
      return;
    }

    const admin = await User.findOne({ id });
    if (!admin) {
      console.log('❌ deleteProjectAdmin - Project admin not found with id:', id);
      res.status(404).json({ message: 'Project admin not found' });
      return;
    }

    await User.deleteOne({ id });
    console.log('✅ deleteProjectAdmin - Successfully deleted admin with id:', id);
    res.json({ message: 'Project admin deleted successfully' });

    console.log('✅ deleteProjectAdmin - Authenticated user:', {
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType
    });
  } catch (err) {
    console.error('❌ deleteProjectAdmin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};