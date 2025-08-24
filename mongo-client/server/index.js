const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// MongoDB connection
let db;
let client;

async function connectToMongo() {
    try {
        const mongoUrl = process.env.MONGO_URL;
        
        console.log('🔌 Connecting to MongoDB...');
        
        client = new MongoClient(mongoUrl, {
            // MongoDB Atlas connection options
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            writeConcern: { w: 'majority' }
        });
        
        await client.connect();
        
        // Extract database name from connection string
        const dbName = client.db().databaseName;
        db = client.db();
        
        // Test the connection
        await db.admin().ping();
        
        console.log('✅ Connected to MongoDB Atlas successfully!');
        console.log(`📊 Database: ${dbName}`);
        console.log(`🌐 Cluster: ${mongoUrl.split('@')[1]?.split('/')[0] || 'Connected'}`);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.error('💡 Please check your connection string and network access');
        process.exit(1);
    }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ===== COLLECTION MANAGEMENT =====

// List all collections
app.get('/api/collections', async (req, res) => {
    try {
        const collections = await db.listCollections().toArray();
        const collectionsWithStats = await Promise.all(
            collections.map(async (collection) => {
                try {
                    const count = await db.collection(collection.name).countDocuments();
                    const indexes = await db.collection(collection.name).indexes();
                    
                    return {
                        name: collection.name,
                        count: count,
                        size: 0, // Not available in MongoDB 6.x
                        avgObjSize: 0, // Not available in MongoDB 6.x
                        storageSize: 0, // Not available in MongoDB 6.x
                        indexes: indexes.length
                    };
                } catch (collectionError) {
                    // If we can't get stats for a collection, return basic info
                    return {
                        name: collection.name,
                        count: 0,
                        size: 0,
                        avgObjSize: 0,
                        storageSize: 0,
                        indexes: 0
                    };
                }
            })
        );
        res.json(collectionsWithStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new collection
app.post('/api/collections', async (req, res) => {
    try {
        const { name, options = {} } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Collection name is required' });
        }
        
        await db.createCollection(name, options);
        res.json({ message: `Collection '${name}' created successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete collection
app.delete('/api/collections/:name', async (req, res) => {
    try {
        const { name } = req.params;
        await db.collection(name).drop();
        res.json({ message: `Collection '${name}' deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== DOCUMENT MANAGEMENT =====

// Get documents from collection with pagination and filtering
app.get('/api/collections/:name/documents', async (req, res) => {
    try {
        const { name } = req.params;
        const { page = 1, limit = 50, sort = '{}', filter = '{}' } = req.query;
        
        const collection = db.collection(name);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let filterObj = {};
        let sortObj = {};
        
        try {
            filterObj = JSON.parse(filter);
            sortObj = JSON.parse(sort);
        } catch (e) {
            // Use default if parsing fails
        }
        
        const [documents, total] = await Promise.all([
            collection.find(filterObj)
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit))
                .toArray(),
            collection.countDocuments(filterObj)
        ]);
        
        res.json({
            documents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add single document
app.post('/api/collections/:name/documents', async (req, res) => {
    try {
        const { name } = req.params;
        const document = req.body;
        
        const result = await db.collection(name).insertOne(document);
        res.json({
            message: 'Document added successfully',
            insertedId: result.insertedId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update single document
app.put('/api/collections/:name/documents/:id', async (req, res) => {
    try {
        const { name, id } = req.params;
        const update = req.body;
        
        // Handle ObjectId conversion
        let objectId;
        try {
            objectId = new require('mongodb').ObjectId(id);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid ObjectId format' });
        }
        
        const result = await db.collection(name).updateOne(
            { _id: objectId },
            { $set: update }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ message: 'Document updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete single document
app.delete('/api/collections/:name/documents/:id', async (req, res) => {
    try {
        const { name, id } = req.params;
        
        let objectId;
        try {
            objectId = new require('mongodb').ObjectId(id);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid ObjectId format' });
        }
        
        const result = await db.collection(name).deleteOne({ _id: objectId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete documents
app.post('/api/collections/:name/documents/bulk-delete', async (req, res) => {
    try {
        const { name } = req.params;
        const { ids, filter } = req.body;
        
        let deleteFilter = {};
        
        if (ids && ids.length > 0) {
            // Delete by specific IDs
            const objectIds = ids.map(id => {
                try {
                    return new require('mongodb').ObjectId(id);
                } catch (e) {
                    throw new Error(`Invalid ObjectId: ${id}`);
                }
            });
            deleteFilter = { _id: { $in: objectIds } };
        } else if (filter) {
            // Delete by filter
            try {
                deleteFilter = JSON.parse(filter);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid filter format' });
            }
        } else {
            return res.status(400).json({ error: 'Either ids or filter must be provided' });
        }
        
        const result = await db.collection(name).deleteMany(deleteFilter);
        
        res.json({
            message: `${result.deletedCount} documents deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk insert documents
app.post('/api/collections/:name/documents/bulk-insert', async (req, res) => {
    try {
        const { name } = req.params;
        const { documents } = req.body;
        
        if (!Array.isArray(documents) || documents.length === 0) {
            return res.status(400).json({ error: 'Documents array is required and must not be empty' });
        }
        
        const result = await db.collection(name).insertMany(documents);
        
        res.json({
            message: `${result.insertedCount} documents inserted successfully`,
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get collection schema (sample of documents)
app.get('/api/collections/:name/schema', async (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 10 } = req.query;
        
        const documents = await db.collection(name)
            .find({})
            .limit(parseInt(limit))
            .toArray();
        
        if (documents.length === 0) {
            return res.json({ schema: {}, sampleDocuments: [] });
        }
        
        // Analyze schema from sample documents
        const schema = {};
        documents.forEach(doc => {
            Object.keys(doc).forEach(key => {
                if (!schema[key]) {
                    schema[key] = typeof doc[key];
                } else if (schema[key] !== typeof doc[key]) {
                    schema[key] = 'mixed';
                }
            });
        });
        
        res.json({ schema, sampleDocuments: documents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
async function startServer() {
    await connectToMongo();
    
    app.listen(PORT, () => {
        console.log(`🚀 MongoDB Client Server running on port ${PORT}`);
        console.log(`📊 Database: ${db.databaseName}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

startServer().catch(console.error);
