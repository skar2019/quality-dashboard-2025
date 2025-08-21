import { Document } from 'mongoose';

export enum ProjectStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    COMPLETED = 'completed',
    ON_HOLD = 'on_hold',
    CANCELLED = 'cancelled'
}

export interface IProject extends Document {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProjectCreate {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status?: ProjectStatus;
}

export interface IProjectUpdate {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    status?: ProjectStatus;
} 