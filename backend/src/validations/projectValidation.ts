import Joi from 'joi';
import { ProjectStatus } from '../types/project';

export const projectValidation = {
    createProject: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .required()
            .messages({
                'string.min': 'Project name must be at least 3 characters long',
                'string.max': 'Project name cannot exceed 100 characters',
                'any.required': 'Project name is required'
            }),
        description: Joi.string()
            .max(2000)
            .allow('')
            .optional(),
        startDate: Joi.date()
            .required()
            .messages({
                'any.required': 'Start date is required',
                'date.base': 'Start date must be a valid date'
            }),
        endDate: Joi.date()
            .min(Joi.ref('startDate'))
            .required()
            .messages({
                'any.required': 'End date is required',
                'date.base': 'End date must be a valid date',
                'date.min': 'End date must be after start date'
            }),
        status: Joi.string()
            .valid(...Object.values(ProjectStatus))
            .default(ProjectStatus.ACTIVE)
    }),

    updateProject: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .optional(),
        description: Joi.string()
            .max(2000)
            .allow('')
            .optional(),
        startDate: Joi.date()
            .optional(),
        endDate: Joi.date()
            .min(Joi.ref('startDate'))
            .optional(),
        status: Joi.string()
            .valid(...Object.values(ProjectStatus))
            .optional()
    }),

    getProject: Joi.object({
        id: Joi.string()
            .required()
            .messages({
                'any.required': 'Project ID is required'
            })
    }),

    deleteProject: Joi.object({
        id: Joi.string()
            .required()
            .messages({
                'any.required': 'Project ID is required'
            })
    })
}; 