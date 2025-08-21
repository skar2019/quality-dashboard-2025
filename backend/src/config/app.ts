import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/quality-dashboard',
} as const;

export type Config = typeof config; 