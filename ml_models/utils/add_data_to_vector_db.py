#!/usr/bin/env python3
"""
Script to add data to ChromaDB vector database
Adds JIRA task data from MongoDB to ChromaDB for RAG operations
"""

import os
import sys
import logging
from datetime import datetime

# Add the parent directory to Python path to access app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymongo
from pymongo import MongoClient
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VectorDBAdder:
    def __init__(self):
        self.mongo_url = "mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
        self.chroma_db_path = "/opt/homebrew/var/www/acsqd/ml_models/jira_tasks_chroma_db"
        self.collection_name = "project_data"
        
        # Initialize connections
        self.mongo_client = None
        self.chroma_client = None
        self.collection = None
        self.embedding_model = None
        
        self.setup_connections()
        self.setup_models()
    
    def setup_connections(self):
        """Setup MongoDB and ChromaDB connections"""
        try:
            # MongoDB connection
            logger.info("Connecting to MongoDB...")
            self.mongo_client = MongoClient(self.mongo_url)
            db = self.mongo_client.quality_dashboard
            self.mongo_collection = db.jirasprintissues
            logger.info("MongoDB connection established successfully")
            
            # ChromaDB connection
            logger.info("Connecting to ChromaDB...")
            self.chroma_client = chromadb.PersistentClient(
                path=self.chroma_db_path,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            try:
                self.collection = self.chroma_client.get_collection(name=self.collection_name)
                logger.info("ChromaDB collection retrieved successfully")
            except Exception:
                logger.info("Creating new ChromaDB collection...")
                self.collection = self.chroma_client.create_collection(name=self.collection_name)
                logger.info("ChromaDB collection created successfully")
            
        except Exception as e:
            logger.error(f"Error setting up connections: {str(e)}")
            raise
    
    def setup_models(self):
        """Setup embedding model"""
        try:
            logger.info("Setting up embedding model...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Error setting up embedding model: {str(e)}")
            raise
    
    def create_embedding(self, text: str):
        """Create embedding for text"""
        try:
            embedding = self.embedding_model.encode(text).tolist()
            return embedding
        except Exception as e:
            logger.error(f"Error creating embedding: {str(e)}")
            raise
    
    def add_data_to_vector_db(self):
        """Add JIRA data from MongoDB to ChromaDB"""
        try:
            logger.info("=== Adding Data to Vector Database ===")
            
            # Get data from MongoDB
            mongo_count = self.mongo_collection.count_documents({})
            logger.info(f"Found {mongo_count} documents in MongoDB")
            
            if mongo_count == 0:
                logger.warning("No documents found in MongoDB!")
                return False
            
            # Get all documents
            documents = list(self.mongo_collection.find({}, {'_id': 0}))
            logger.info(f"Retrieved {len(documents)} documents from MongoDB")
            
            # Clear existing data in ChromaDB
            try:
                self.chroma_client.delete_collection(self.collection_name)
                self.collection = self.chroma_client.create_collection(name=self.collection_name)
                logger.info("Cleared existing ChromaDB collection")
            except Exception as e:
                logger.warning(f"Could not clear existing collection: {e}")
            
            # Process documents in batches
            batch_size = 50
            total_added = 0
            
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(documents) + batch_size - 1)//batch_size}")
                
                texts = []
                metadatas = []
                ids = []
                
                for doc in batch:
                    # Create text content
                    text_content = f"""Task ID: {doc.get('taskId', 'N/A')}
Title: {doc.get('summary', 'N/A')}
Description: {doc.get('description', 'N/A')}
Status: {doc.get('status', 'N/A')}
Priority: {doc.get('priority', 'N/A')}
Assignee: {doc.get('assignee', 'N/A')}
Issue Type: {doc.get('issueType', 'N/A')}
Project: {doc.get('project', 'N/A')}
Sprint: {doc.get('sprint', 'N/A')}"""
                    
                    # Create metadata
                    metadata = {
                        "task_id": doc.get('taskId', 'N/A'),
                        "project": doc.get('project', 'N/A'),
                        "sprint": doc.get('sprint', 'N/A'),
                        "status": doc.get('status', 'N/A'),
                        "priority": doc.get('priority', 'N/A'),
                        "assignee": doc.get('assignee', 'N/A'),
                        "issue_type": doc.get('issueType', 'N/A')
                    }
                    
                    texts.append(text_content)
                    metadatas.append(metadata)
                    ids.append(f"doc_{total_added + len(texts)}")
                
                # Add batch to ChromaDB
                try:
                    self.collection.add(
                        documents=texts,
                        metadatas=metadatas,
                        ids=ids
                    )
                    total_added += len(texts)
                    logger.info(f"Added {len(texts)} documents to ChromaDB")
                except Exception as e:
                    logger.error(f"Error adding batch to ChromaDB: {e}")
                    continue
            
            logger.info(f"✅ Successfully added {total_added} documents to ChromaDB")
            return True
            
        except Exception as e:
            logger.error(f"Error adding data to vector database: {str(e)}")
            return False
    
    def cleanup(self):
        """Cleanup connections"""
        try:
            if self.mongo_client:
                self.mongo_client.close()
            logger.info("Connections closed successfully")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

def main():
    """Main function"""
    logger.info("🚀 Starting Vector Database Data Addition...")
    
    adder = VectorDBAdder()
    
    try:
        success = adder.add_data_to_vector_db()
        
        if success:
            logger.info("🎉 Data successfully added to vector database!")
        else:
            logger.error("❌ Failed to add data to vector database")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        adder.cleanup()

if __name__ == "__main__":
    main()
