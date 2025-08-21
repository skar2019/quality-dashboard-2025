import { Document } from 'mongoose';

export interface IUser extends Document {
    id: string;
    name: string;
    email: string;
    password: string;
    userType: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserLogin {
    email: string;
    password: string;
}

// Added new interfaces for Project Admin management
export interface IProjectAdminCreate {
    name: string;
    email: string;
    password: string;
}

export interface IProjectAdminUpdate {
    name: string;
    email: string;
    password?: string;
}