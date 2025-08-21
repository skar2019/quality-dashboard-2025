import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types/user';

const userSchema: Schema<IUser> = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    userType: { 
        type: String,
        required: true,
        enum: ['super_admin', 'project_admin', 'user'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;