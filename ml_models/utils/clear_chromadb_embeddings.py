#!/usr/bin/env python3
"""
Script to clear all embedding data from ChromaDB vector store.
This script clears:
1. ChromaDB vector store collection
"""

import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clear_chromadb_embeddings():
    """Clear ChromaDB vector store"""
    try:
        import chromadb
        from chromadb.config import Settings
        
        # ChromaDB connection
        chroma_path = "../jira_tasks_chroma_db"
        client = chromadb.PersistentClient(path=chroma_path)
        
        # Get all collections
        collections = client.list_collections()
        logger.info(f"Found {len(collections)} collections in ChromaDB")
        
        if len(collections) == 0:
            logger.info("✅ ChromaDB is already empty - no collections found")
            return True
        
        total_cleared = 0
        for collection in collections:
            try:
                # Get document count before deletion
                count = collection.count()
                logger.info(f"Collection '{collection.name}' has {count} documents")
                
                # Delete the collection
                client.delete_collection(collection.name)
                logger.info(f"✅ Deleted collection '{collection.name}' with {count} documents")
                total_cleared += count
                
            except Exception as e:
                logger.error(f"❌ Error deleting collection '{collection.name}': {e}")
        
        logger.info(f"✅ Total documents cleared from ChromaDB: {total_cleared}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error clearing ChromaDB: {e}")
        return False

def main():
    """Main function to clear ChromaDB embedding data"""
    logger.info("🧹 Starting ChromaDB embedding data cleanup...")
    
    # Clear ChromaDB embeddings
    logger.info("🔍 Clearing ChromaDB embeddings...")
    chroma_success = clear_chromadb_embeddings()
    
    # Summary
    logger.info("=" * 50)
    logger.info("📋 CLEANUP SUMMARY")
    logger.info("=" * 50)
    logger.info(f"ChromaDB cleanup: {'✅ SUCCESS' if chroma_success else '❌ FAILED'}")
    
    if chroma_success:
        logger.info("🎉 ChromaDB embedding data cleared successfully!")
    else:
        logger.error("⚠️ ChromaDB cleanup failed. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
