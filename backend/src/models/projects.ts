import mongoose, { Schema } from 'mongoose';
import { IProject, ProjectStatus } from '../types/project';

const projectSchema: Schema<IProject> = new Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Project name must be at least 3 characters long'],
        maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        validate: {
            validator: function(this: IProject, value: Date) {
                // If endDate exists, startDate must be before endDate
                if (this.endDate) {
                    return value < this.endDate;
                }
                return true;
            },
            message: 'Start date must be before end date'
        }
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function(this: IProject, value: Date) {
                // endDate must be after startDate
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    status: {
        type: String,
        enum: {
            values: Object.values(ProjectStatus),
            message: '{VALUE} is not a valid project status'
        },
        default: ProjectStatus.ACTIVE,
        required: true
    }
}, {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
    versionKey: false // This will remove the __v field
});

// Create indexes for frequently queried fields
projectSchema.index({ name: 1 }); // Index on name field
projectSchema.index({ status: 1 }); // Index on status field
projectSchema.index({ startDate: 1, endDate: 1 }); // Compound index for date range queries
projectSchema.index({ createdAt: 1 }); // Index for sorting by creation date

// Add a compound index for name and status if you frequently query by both
projectSchema.index({ name: 1, status: 1 });

// Add a text index on name and description for text search
projectSchema.index({ 
    name: 'text', 
    description: 'text' 
}, {
    weights: {
        name: 10, // Give more weight to matches in name
        description: 5
    }
});

// Add a pre-save middleware to ensure data consistency
projectSchema.pre('save', function(next) {
    // Ensure endDate is after startDate
    if (this.endDate <= this.startDate) {
        next(new Error('End date must be after start date'));
    }
    next();
});

// Add a method to check if project is active
projectSchema.methods.isActive = function(): boolean {
    return this.status === ProjectStatus.ACTIVE;
};

// Add a method to check if project is within date range
projectSchema.methods.isWithinDateRange = function(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
};

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project; 