# 🍃 MongoDB Client Application

A comprehensive, independent MongoDB client application built with React frontend and Node.js backend. This application provides a modern web interface for managing MongoDB databases, collections, and documents.

## ✨ Features

### Collection Management
- **List all collections** with detailed statistics (document count, size, storage, indexes)
- **Create new collections** with custom options
- **Delete collections** with confirmation dialogs
- **Real-time updates** and refresh capabilities

### Document Management
- **View documents** in a responsive data table with pagination
- **Add new documents** using JSON editor
- **Edit existing documents** with full JSON editing capabilities
- **Delete individual documents** with confirmation
- **Bulk delete operations** for multiple selected documents
- **Search and filter** documents using MongoDB query syntax
- **Sort documents** by any field in ascending/descending order

### Advanced Features
- **JSON validation** with real-time error checking
- **Bulk operations** for efficient document management
- **Responsive design** that works on desktop and mobile
- **Real-time feedback** with toast notifications
- **Error handling** with user-friendly error messages
- **Security features** including rate limiting and CORS protection

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB instance running locally or remotely
- npm or yarn package manager

### Installation

1. **Clone and navigate to the project directory**
   ```bash
   cd mongo-client
   ```

2. **Quick Start (Recommended)**
   ```bash
   ./start.sh
   ```
   
   This script will automatically:
   - Create the `.env` file with your MongoDB Atlas connection
   - Install all dependencies
   - Test the MongoDB connection
   - Start the application

3. **Manual Installation**
   ```bash
   # Install all dependencies
   npm run install-all
   
   # Configure environment variables
   cd server
   cp config.env .env
   ```
   
   The `.env` file is already configured with your MongoDB Atlas connection:
   ```env
   MONGO_URL=mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0
   PORT=5000
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

       This will start both the backend server (port 5000) and frontend (port 3010) concurrently.

### Alternative: Manual Start

**Backend Server:**
```bash
cd server
npm install
npm run dev
```

**Frontend Client:**
```bash
cd client
npm install
npm start
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3010
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 📁 Project Structure

```
mongo-client/
├── server/                 # Backend Node.js server
│   ├── index.js           # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment configuration
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── App.js        # Main app component
│   │   └── index.js      # React entry point
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── package.json          # Root package.json with scripts
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

**Server (.env):**
- `MONGO_URL`: MongoDB connection string (default: mongodb://localhost:27017)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

**Frontend:**
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000/api)

### MongoDB Connection

The application supports various MongoDB connection formats:

```env
# Local MongoDB
MONGO_URL=mongodb://localhost:27017

# MongoDB with authentication
MONGO_URL=mongodb://username:password@localhost:27017

# MongoDB Atlas
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net

# MongoDB with specific database
MONGO_URL=mongodb://localhost:27017/your_database
```

## 📖 Usage Guide

### 1. Dashboard
- View all collections with statistics
- Create new collections
- Delete existing collections
- Click on collection cards to view documents

### 2. Collection View
- Browse documents with pagination
- Search documents using text search
- Apply MongoDB filters and sorting
- Select multiple documents for bulk operations
- Add, edit, or delete individual documents

### 3. Document Editor
- Create new documents using JSON format
- Edit existing documents with full JSON editing
- Real-time JSON validation
- Format and copy JSON content
- Reset changes if needed

### 4. Bulk Operations
- Select multiple documents using checkboxes
- Delete selected documents in batch
- Use filters for targeted bulk operations

## 🛠️ API Endpoints

### Collections
- `GET /api/collections` - List all collections
- `POST /api/collections` - Create new collection
- `DELETE /api/collections/:name` - Delete collection

### Documents
- `GET /api/collections/:name/documents` - Get documents with pagination
- `POST /api/collections/:name/documents` - Add single document
- `PUT /api/collections/:name/documents/:id` - Update document
- `DELETE /api/collections/:name/documents/:id` - Delete document
- `POST /api/collections/:name/documents/bulk-delete` - Bulk delete
- `POST /api/collections/:name/documents/bulk-insert` - Bulk insert
- `GET /api/collections/:name/schema` - Get collection schema

## 🔒 Security Features

- **Rate Limiting**: Configurable request limits per IP
- **CORS Protection**: Configurable cross-origin settings
- **Input Validation**: JSON validation and sanitization
- **Error Handling**: Secure error messages without exposing internals
- **Helmet**: Security headers and protection

## 🎨 UI Features

- **Material-UI**: Modern, responsive design system
- **Dark/Light Theme**: Customizable theme support
- **Responsive Layout**: Works on all device sizes
- **Interactive Elements**: Hover effects, animations, and feedback
- **Accessibility**: ARIA labels and keyboard navigation

## 🚀 Deployment

### Production Build

1. **Build the frontend:**
   ```bash
   cd client
   npm run build
   ```

2. **Set production environment:**
   ```bash
   cd server
   NODE_ENV=production npm start
   ```

### Docker Deployment

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Ensure network access to MongoDB instance

2. **Port Already in Use**
   - Change port in `.env` file
   - Kill processes using the port: `lsof -ti:5000 | xargs kill -9`

3. **CORS Errors**
   - Check CORS configuration in server
   - Verify frontend proxy settings

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Debug Mode

Enable debug logging by setting environment variables:

```env
DEBUG=app:*
NODE_ENV=development
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review MongoDB documentation for query syntax

---

**Happy MongoDB Management! 🍃✨**
