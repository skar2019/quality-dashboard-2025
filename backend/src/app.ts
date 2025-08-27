import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDatabase } from './config/database';
import projectRoutes from './routes/projectRoutes';
import userRoutes from './routes/user';
import jiraImportRouter from './routes/jiraImport';
import chatbotRouter from './routes/chatbot';
import summaryReportRouter from './routes/summaryReport';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
//app.use(limiter);

// Logging middleware
app.use(morgan('dev')); // Log HTTP requests

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - using MongoDB store consistently
const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/quality-dashboard',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native' // Use MongoDB's TTL index
});

// Add error handling for session store
sessionStore.on('error', (error) => {
    console.error('❌ Session store error:', error);
});

sessionStore.on('connect', () => {
    console.log('✅ Session store connected to MongoDB');
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Debug middleware to log session information
app.use((req, res, next) => {
    console.log('🔍 Request session debug:', {
        sessionId: req.session?.id,
        hasSession: !!req.session,
        isAuthenticated: req.session?.isAuthenticated,
        hasUser: !!req.session?.user,
        userType: req.session?.user?.userType,
        cookie: req.headers.cookie ? 'present' : 'missing',
        sessionCookie: req.headers.cookie?.includes('connect.sid') ? 'present' : 'missing',
        fullCookie: req.headers.cookie || 'none'
    });
    next();
});

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/user', userRoutes);
app.use('/api', jiraImportRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/summary-report', summaryReportRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Debug endpoint to check session store
app.get('/debug/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        console.log('🔍 Debug: Looking for session ID:', sessionId);
        
        // Try to get session from store
        sessionStore.get(sessionId, (err, session) => {
            if (err) {
                console.error('❌ Debug: Error getting session:', err);
                res.status(500).json({ error: 'Session store error', details: err.message });
                return;
            }
            
            console.log('🔍 Debug: Session from store:', session);
            res.json({ 
                sessionId, 
                session, 
                hasSession: !!session,
                hasUser: !!session?.user 
            });
        });
    } catch (error) {
        console.error('❌ Debug: Error in debug endpoint:', error);
        res.status(500).json({ error: 'Debug endpoint error' });
    }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// Connect to database and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;