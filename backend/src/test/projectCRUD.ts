import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import Project from '../models/projects';
import { IProject, ProjectStatus } from '../types/project';

dotenv.config();

const testProject = {
    name: `Test Project ${Date.now()}`, // Unique name using timestamp
    description: 'This is a test project',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: ProjectStatus.ACTIVE
};

const testProjectUpdate = {
    name: `Updated Test Project ${Date.now()}`,
    description: 'This is an updated test project',
    status: ProjectStatus.COMPLETED
};

async function testCreateProject(): Promise<IProject> {
    try {
        console.log('\n=== Testing Project Creation ===');
        const project = new Project(testProject);
        const savedProject = await project.save();
        console.log('✅ Project created successfully:', savedProject.name);
        return savedProject;
    } catch (error) {
        console.error('❌ Error creating project:', error);
        throw error;
    }
}

async function testGetProject(projectId: mongoose.Types.ObjectId | string) {
    try {
        console.log('\n=== Testing Project Retrieval ===');
        const project = await Project.findById(projectId);
        if (project) {
            console.log('✅ Project retrieved successfully:', project.name);
            return project;
        } else {
            console.log('❌ Project not found');
            return null;
        }
    } catch (error) {
        console.error('❌ Error retrieving project:', error);
        throw error;
    }
}

async function testUpdateProject(projectId: mongoose.Types.ObjectId | string) {
    try {
        console.log('\n=== Testing Project Update ===');
        const project = await Project.findById(projectId);
        if (!project) {
            console.log('❌ Project not found for update');
            return null;
        }

        Object.assign(project, testProjectUpdate);
        const updatedProject = await project.save();
        console.log('✅ Project updated successfully:', updatedProject.name);
        return updatedProject;
    } catch (error) {
        console.error('❌ Error updating project:', error);
        throw error;
    }
}

async function testDeleteProject(projectId: mongoose.Types.ObjectId | string) {
    try {
        console.log('\n=== Testing Project Deletion ===');
        const project = await Project.findById(projectId);
        if (!project) {
            console.log('❌ Project not found for deletion');
            return false;
        }

        await project.deleteOne();
        console.log('✅ Project deleted successfully');
        return true;
    } catch (error) {
        console.error('❌ Error deleting project:', error);
        throw error;
    }
}

async function testListProjects() {
    try {
        console.log('\n=== Testing Project Listing ===');
        const projects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5);
        
        console.log(`✅ Retrieved ${projects.length} projects:`);
        projects.forEach(project => {
            console.log(`- ${project.name} (${project.status})`);
        });
        return projects;
    } catch (error) {
        console.error('❌ Error listing projects:', error);
        throw error;
    }
}

async function runTests() {
    try {
        console.log('🚀 Starting Project CRUD Tests...');
        
        // Connect to database
        await connectDatabase();
        
        // Run tests
        const createdProject = await testCreateProject();
        if (!createdProject) {
            throw new Error('Project creation failed');
        }

        const projectId = createdProject._id as mongoose.Types.ObjectId;
        await testGetProject(projectId);
        await testUpdateProject(projectId);
        await testListProjects();
        await testDeleteProject(projectId);

        console.log('\n✨ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
    } finally {
        // Disconnect from database
        await disconnectDatabase();
        process.exit(0);
    }
}

// Run the tests
runTests(); 