import { Request, Response } from 'express';
import Project from '../models/projects';
import { IProjectCreate, IProjectUpdate, ProjectStatus } from '../types/project';

export const projectController = {
    // Create a new project
    async createProject(req: Request<{}, {}, IProjectCreate>, res: Response) {
        try {
            const projectData = req.body;
            const project = new Project(projectData);
            await project.save();
            
            res.status(201).json({
                success: true,
                data: project
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                error: error.message || 'Error creating project'
            });
        }
    },

    // Get all projects with optional filters
    async getProjects(req: Request, res: Response) {
        try {
            const { 
                status, 
                search, 
                startDate, 
                endDate,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                page = 1,
                limit = 10
            } = req.query;

            // Build query
            const query: any = {};
            
            if (status) {
                query.status = status;
            }
            
            if (search) {
                query.$text = { $search: search as string };
            }
            
            if (startDate || endDate) {
                query.startDate = {};
                if (startDate) query.startDate.$gte = new Date(startDate as string);
                if (endDate) query.startDate.$lte = new Date(endDate as string);
            }

            // Calculate pagination
            const skip = (Number(page) - 1) * Number(limit);
            
            // Execute query with pagination and sorting
            const projects = await Project.find(query)
                .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(Number(limit));

            // Get total count for pagination
            const total = await Project.countDocuments(query);

            res.status(200).json({
                success: true,
                data: projects,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message || 'Error fetching projects'
            });
        }
    },

    // Get a single project by ID
    async getProjectById(req: Request<{ id: string }>, res: Response) {
        try {
            const project = await Project.findById(req.params.id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }

            res.status(200).json({
                success: true,
                data: project
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message || 'Error fetching project'
            });
        }
    },

    // Update a project
    async updateProject(
        req: Request<{ id: string }, {}, IProjectUpdate>,
        res: Response
    ) {
        try {
            const project = await Project.findById(req.params.id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }

            // Update project fields
            Object.assign(project, req.body);
            await project.save();

            res.status(200).json({
                success: true,
                data: project
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                error: error.message || 'Error updating project'
            });
        }
    },

    // Delete a project
    async deleteProject(req: Request<{ id: string }>, res: Response) {
        try {
            const project = await Project.findById(req.params.id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }

            await project.deleteOne();

            res.status(200).json({
                success: true,
                data: {}
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message || 'Error deleting project'
            });
        }
    },

    // Get project statistics
    async getProjectStats(req: Request, res: Response) {
        try {
            const stats = await Project.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        projects: { $push: '$name' }
                    }
                }
            ]);

            const totalProjects = await Project.countDocuments();
            const activeProjects = await Project.countDocuments({ status: ProjectStatus.ACTIVE });
            const completedProjects = await Project.countDocuments({ status: ProjectStatus.COMPLETED });

            res.status(200).json({
                success: true,
                data: {
                    totalProjects,
                    activeProjects,
                    completedProjects,
                    statusBreakdown: stats
                }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message || 'Error fetching project statistics'
            });
        }
    }
}; 