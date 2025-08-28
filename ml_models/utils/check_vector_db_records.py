#!/usr/bin/env python3
"""
Script to check records and details in ChromaDB vector database
Shows count, sample records, and detailed information about stored data
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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VectorDBChecker:
    def __init__(self):
        self.mongo_url = "mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
        self.chroma_db_path = "./jira_tasks_chroma_db"
        self.collection_name = "project_data"
        
        # Initialize connections
        self.mongo_client = None
        self.chroma_client = None
        self.collection = None
        self.mongo_collection = None
        
        self.setup_connections()
    
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
    
    def check_mongodb_records(self):
        """Check MongoDB records"""
        try:
            logger.info("=" * 60)
            logger.info("📊 MONGODB RECORDS CHECK")
            logger.info("=" * 60)
            
            # Count documents
            mongo_count = self.mongo_collection.count_documents({})
            logger.info(f"Total documents in MongoDB: {mongo_count}")
            
            if mongo_count == 0:
                logger.warning("❌ No documents found in MongoDB!")
                return False
            
            # Sample document
            sample_doc = self.mongo_collection.find_one()
            if sample_doc:
                logger.info("📋 Sample MongoDB document structure:")
                logger.info(f"Keys: {list(sample_doc.keys())}")
                logger.info(f"Sample Task ID: {sample_doc.get('taskId', 'N/A')}")
                logger.info(f"Sample Project: {sample_doc.get('project', 'N/A')}")
                logger.info(f"Sample Sprint: {sample_doc.get('sprint', 'N/A')}")
            
            # Project distribution
            pipeline = [
                {"$group": {"_id": "$project", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            project_stats = list(self.mongo_collection.aggregate(pipeline))
            
            logger.info("📈 Project Distribution:")
            for stat in project_stats:
                logger.info(f"  {stat['_id']}: {stat['count']} tasks")
            
            # Sprint distribution
            pipeline = [
                {"$group": {"_id": "$sprint", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            sprint_stats = list(self.mongo_collection.aggregate(pipeline))
            
            logger.info("📈 Sprint Distribution:")
            for stat in sprint_stats:
                logger.info(f"  {stat['_id']}: {stat['count']} tasks")
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking MongoDB records: {str(e)}")
            return False
    
    def check_chromadb_records(self):
        """Check ChromaDB records"""
        try:
            logger.info("=" * 60)
            logger.info("🔍 CHROMADB RECORDS CHECK")
            logger.info("=" * 60)
            
            # Count documents
            chroma_count = self.collection.count()
            logger.info(f"Total documents in ChromaDB: {chroma_count}")
            
            if chroma_count == 0:
                logger.warning("❌ No documents found in ChromaDB!")
                return False
            
            # Get sample records
            sample_results = self.collection.get(
                limit=3,
                include=['documents', 'metadatas', 'embeddings']
            )
            
            logger.info("📋 Sample ChromaDB records:")
            for i, (doc, metadata) in enumerate(zip(sample_results['documents'], sample_results['metadatas'])):
                logger.info(f"\n--- Record {i+1} ---")
                logger.info(f"Task ID: {metadata.get('task_id', 'N/A')}")
                logger.info(f"Project: {metadata.get('project', 'N/A')}")
                logger.info(f"Sprint: {metadata.get('sprint', 'N/A')}")
                logger.info(f"Status: {metadata.get('status', 'N/A')}")
                logger.info(f"Priority: {metadata.get('priority', 'N/A')}")
                logger.info(f"Assignee: {metadata.get('assignee', 'N/A')}")
                logger.info(f"Issue Type: {metadata.get('issue_type', 'N/A')}")
                logger.info(f"Document length: {len(doc)} characters")
                logger.info(f"Content preview: {doc[:200]}...")
            
            # Metadata distribution
            all_metadata = self.collection.get(include=['metadatas'])['metadatas']
            
            # Project distribution
            project_counts = {}
            for meta in all_metadata:
                project = meta.get('project', 'Unknown')
                project_counts[project] = project_counts.get(project, 0) + 1
            
            logger.info("📈 ChromaDB Project Distribution:")
            for project, count in sorted(project_counts.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  {project}: {count} tasks")
            
            # Sprint distribution
            sprint_counts = {}
            for meta in all_metadata:
                sprint = meta.get('sprint', 'Unknown')
                sprint_counts[sprint] = sprint_counts.get(sprint, 0) + 1
            
            logger.info("📈 ChromaDB Sprint Distribution:")
            for sprint, count in sorted(sprint_counts.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  {sprint}: {count} tasks")
            
            # Status distribution
            status_counts = {}
            for meta in all_metadata:
                status = meta.get('status', 'Unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            logger.info("📈 ChromaDB Status Distribution:")
            for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
                logger.info(f"  {status}: {count} tasks")
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking ChromaDB records: {str(e)}")
            return False
    
    def compare_databases(self):
        """Compare MongoDB and ChromaDB data"""
        try:
            logger.info("=" * 60)
            logger.info("🔄 DATABASE COMPARISON")
            logger.info("=" * 60)
            
            mongo_count = self.mongo_collection.count_documents({})
            chroma_count = self.collection.count()
            
            logger.info(f"MongoDB documents: {mongo_count}")
            logger.info(f"ChromaDB documents: {chroma_count}")
            
            if mongo_count == chroma_count:
                logger.info("✅ MongoDB and ChromaDB have the same number of documents")
            elif mongo_count > chroma_count:
                logger.warning(f"⚠️ MongoDB has {mongo_count - chroma_count} more documents than ChromaDB")
            else:
                logger.warning(f"⚠️ ChromaDB has {chroma_count - mongo_count} more documents than MongoDB")
            
            # Check for specific tasks
            if mongo_count > 0 and chroma_count > 0:
                mongo_sample = self.mongo_collection.find_one()
                if mongo_sample:
                    task_id = mongo_sample.get('taskId')
                    if task_id:
                        # Search in ChromaDB
                        results = self.collection.query(
                            query_texts=[f"Task ID: {task_id}"],
                            n_results=1
                        )
                        if results['documents'] and len(results['documents'][0]) > 0:
                            logger.info(f"✅ Sample task {task_id} found in both databases")
                        else:
                            logger.warning(f"⚠️ Sample task {task_id} not found in ChromaDB")
            
        except Exception as e:
            logger.error(f"Error comparing databases: {str(e)}")
    
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
    logger.info("🔍 Starting Vector Database Records Check...")
    
    checker = VectorDBChecker()
    
    try:
        # Check MongoDB
        mongo_success = checker.check_mongodb_records()
        
        # Check ChromaDB
        chroma_success = checker.check_chromadb_records()
        
        # Compare databases
        checker.compare_databases()
        
        # Summary
        logger.info("=" * 60)
        logger.info("📋 CHECK SUMMARY")
        logger.info("=" * 60)
        logger.info(f"MongoDB check: {'✅ SUCCESS' if mongo_success else '❌ FAILED'}")
        logger.info(f"ChromaDB check: {'✅ SUCCESS' if chroma_success else '❌ FAILED'}")
        
        if mongo_success and chroma_success:
            logger.info("🎉 All checks completed successfully!")
        else:
            logger.warning("⚠️ Some checks failed. Check logs above.")
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        checker.cleanup()

if __name__ == "__main__":
    main()
