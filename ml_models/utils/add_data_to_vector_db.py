#!/usr/bin/env python3
"""
Script to add data to ChromaDB vector database
Adds JIRA task data from MongoDB to ChromaDB for RAG operations
Uses the same embedding system as SimpleRAGChat for consistency
"""

import os
import sys
import logging
from datetime import datetime
import shutil

# Add the parent directory to Python path to access app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymongo
from pymongo import MongoClient
import chromadb
from chromadb.config import Settings

# Import LangChain components for consistency with chatbot.py
# Updated imports to use new packages and avoid deprecation warnings
try:
    from langchain_ollama import OllamaEmbeddings
except ImportError:
    # Fallback to old import if new package not available
    from langchain_community.embeddings import OllamaEmbeddings

try:
    from langchain_chroma import Chroma
except ImportError:
    # Fallback to old import if new package not available
    from langchain_community.vectorstores import Chroma

from langchain.docstore.document import Document

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VectorDBAdder:
    def __init__(self):
        self.mongo_url = "mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
        
        # Use the jira_tasks_chroma_db directory as requested
        self.chroma_db_path = "./jira_tasks_chroma_db"
        self.collection_name = "project_data"
        
        # Initialize connections
        self.mongo_client = None
        self.chroma_client = None
        self.collection = None
        self.embeddings = None
        self.vectorstore = None
        
        self.setup_connections()
        self.setup_models()
    
    def clear_chromadb_completely(self):
        """Completely clear ChromaDB instance and data"""
        try:
            logger.info("🧹 Clearing ChromaDB completely...")
            
            # Method 1: Try to reset existing client
            try:
                existing_client = chromadb.PersistentClient(
                    path=self.chroma_db_path,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                existing_client.reset()
                logger.info("✅ Reset existing ChromaDB client")
            except Exception as e:
                logger.info(f"ℹ️ No existing client to reset: {e}")
            
            # Method 2: Delete the entire ChromaDB directory
            if os.path.exists(self.chroma_db_path):
                try:
                    shutil.rmtree(self.chroma_db_path)
                    logger.info(f"🗑️ Deleted ChromaDB directory: {self.chroma_db_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not delete ChromaDB directory: {e}")
            
            # Method 3: Force garbage collection to clear any remaining references
            import gc
            gc.collect()
            logger.info("🧹 Garbage collection completed")
            
            # Method 4: Wait a moment for any pending operations
            import time
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"❌ Error clearing ChromaDB: {e}")
    
    def setup_connections(self):
        """Setup MongoDB and ChromaDB connections"""
        try:
            # MongoDB connection
            logger.info("Connecting to MongoDB...")
            self.mongo_client = MongoClient(self.mongo_url)
            db = self.mongo_client.quality_dashboard
            self.mongo_collection = db.jirasprintissues
            logger.info("MongoDB connection established successfully")
            
            # ChromaDB connection - use in-memory client to avoid readonly database issues
            logger.info("Connecting to ChromaDB...")
            
            # Use in-memory ChromaDB client to avoid readonly database issues
            try:
                self.chroma_client = chromadb.Client(
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True,
                        is_persistent=False
                    )
                )
                logger.info("✅ Created in-memory ChromaDB client")
            except Exception as e:
                logger.error(f"❌ Failed to create ChromaDB client: {e}")
                raise
            
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
        """Setup embedding model - using the same as SimpleRAGChat"""
        try:
            logger.info("Setting up embedding model...")
            
            # Use the same embedding model as SimpleRAGChat
            self.embeddings = OllamaEmbeddings(
                model="nomic-embed-text"
            )
            
            # Setup vectorstore using LangChain Chroma with in-memory client
            # Create new vectorstore instance with in-memory ChromaDB
            try:
                self.vectorstore = Chroma(
                    client=self.chroma_client,
                    collection_name=self.collection_name,
                    embedding_function=self.embeddings
                )
                logger.info("✅ Vectorstore created successfully with in-memory client")
            except Exception as e:
                logger.warning(f"⚠️ Failed to create vectorstore with client: {e}")
                # Fallback: create vectorstore without client
                try:
                    self.vectorstore = Chroma(
                        embedding_function=self.embeddings,
                        collection_name=self.collection_name
                    )
                    logger.info("✅ Vectorstore created successfully with fallback approach")
                except Exception as e2:
                    logger.error(f"❌ Failed to create vectorstore: {e2}")
                    raise
            
            logger.info("Embedding model and vectorstore loaded successfully")
        except Exception as e:
            logger.error(f"Error setting up embedding model: {str(e)}")
            raise
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text for better embedding - same as chatbot.py"""
        if not text or not isinstance(text, str):
            return ""
        return text.strip().replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    def format_date(self, date_str: str) -> str:
        """Format date string for consistency - same as chatbot.py"""
        if not date_str or date_str == 'Unknown':
            return 'Unknown'
        try:
            # Try to parse and format the date
            from datetime import datetime
            parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return parsed_date.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return str(date_str)
    
    def add_data_to_vector_db(self):
        """Add JIRA data from MongoDB to ChromaDB using the same format as chatbot.py"""
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
            
            # Clear existing data in ChromaDB completely
            logger.info("🧹 Clearing existing ChromaDB data...")
            self.clear_chromadb_completely()
            
            # Recreate the collection and vectorstore
            try:
                self.collection = self.chroma_client.create_collection(name=self.collection_name)
                self.vectorstore = Chroma(
                    persist_directory=self.chroma_db_path, 
                    embedding_function=self.embeddings, 
                    collection_name=self.collection_name
                )
                logger.info("✅ Recreated ChromaDB collection and vectorstore")
            except Exception as e:
                logger.warning(f"Could not recreate collection: {e}")
            
            # Process documents using the same format as chatbot.py
            langchain_documents = []
            
            for doc in documents:
                try:
                    # Extract and clean JIRA item data (same as chatbot.py)
                    issue_key = self.clean_text(doc.get('taskId', 'Unknown'))
                    summary = self.clean_text(doc.get('summary', 'No Summary'))
                    description = self.clean_text(doc.get('description', 'No Description'))
                    issue_type = self.clean_text(doc.get('issueType', 'Unknown'))
                    status = self.clean_text(doc.get('status', 'Unknown'))
                    priority = self.clean_text(doc.get('priority', 'Unknown'))
                    assignee = self.clean_text(doc.get('assignee', 'Unknown'))
                    reporter = self.clean_text(doc.get('reporter', 'Unknown'))
                    created = self.format_date(doc.get('created', 'Unknown'))
                    updated = self.format_date(doc.get('updated', 'Unknown'))
                    resolution = self.clean_text(doc.get('resolution', 'Unresolved'))
                    project_id = self.clean_text(doc.get('project', 'Unknown'))
                    sprint_id = self.clean_text(doc.get('sprint', 'Unknown'))
                    
                    # Skip items with no meaningful content
                    if not summary and not description:
                        logger.warning(f"Skipping item {issue_key} - no summary or description")
                        continue
                    
                    # Create document content exactly as in chatbot.py
                    content = f"Task ID: {issue_key}\nTitle: {summary}\nDescription: {description}\nStatus: {status}\nPriority: {priority}\nAssignee: {assignee}\nReporter: {reporter}\nIssue Type: {issue_type}\nResolution: {resolution}\nProject: {project_id}\nSprint: {sprint_id}"
                    
                    # Create metadata exactly as in chatbot.py
                    metadata = {
                        "task_id": issue_key,
                        "status": status,
                        "priority": priority,
                        "assignee": assignee,
                        "issue_type": issue_type,
                        "project_id": project_id,
                        "sprint_id": sprint_id
                    }
                    
                    # Create LangChain Document
                    langchain_doc = Document(
                        page_content=content,
                        metadata=metadata
                    )
                    langchain_documents.append(langchain_doc)
                    
                except Exception as e:
                    logger.error(f"Error processing document {doc.get('taskId', 'Unknown')}: {e}")
                    continue
            
            # Add documents to vectorstore using batch processing (same as chatbot.py)
            if langchain_documents:
                logger.info(f"📚 Adding {len(langchain_documents)} documents to vector store...")
                
                # Use batch processing for better performance
                batch_size = 50  # Same as chatbot.py
                total_added = 0
                failed_batches = 0
                
                for i in range(0, len(langchain_documents), batch_size):
                    batch = langchain_documents[i:i + batch_size]
                    batch_num = i // batch_size + 1
                    total_batches = (len(langchain_documents) + batch_size - 1) // batch_size
                    
                    try:
                        self.vectorstore.add_documents(batch)
                        total_added += len(batch)
                        logger.info(f"✅ Added batch {batch_num}/{total_batches}: {len(batch)} documents")
                    except Exception as e:
                        failed_batches += 1
                        logger.error(f"❌ Failed to add batch {batch_num}/{total_batches}: {e}")
                        
                        # Try adding documents individually as fallback
                        individual_success = 0
                        for doc in batch:
                            try:
                                self.vectorstore.add_documents([doc])
                                individual_success += 1
                                total_added += 1
                            except Exception as doc_error:
                                logger.error(f"❌ Failed to add individual document: {doc_error}")
                        
                        if individual_success > 0:
                            logger.info(f"🔄 Recovered {individual_success} documents from failed batch")
                
                if failed_batches == 0:
                    logger.info(f"✅ Successfully added all {total_added} documents to vector store")
                else:
                    logger.warning(f"⚠️ Added {total_added} documents with {failed_batches} failed batches")
            else:
                logger.warning("⚠️ No valid documents to add to vector store")
            
            logger.info(f"✅ Successfully added {len(langchain_documents)} documents to ChromaDB")
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

def fix_permissions():
    """Fix permissions on ChromaDB directory"""
    chroma_db_path = "./jira_tasks_chroma_db"
    try:
        if os.path.exists(chroma_db_path):
            # Fix directory permissions
            os.chmod(chroma_db_path, 0o755)
            
            # Fix permissions on all files and subdirectories
            for root, dirs, files in os.walk(chroma_db_path):
                for d in dirs:
                    os.chmod(os.path.join(root, d), 0o755)
                for f in files:
                    os.chmod(os.path.join(root, f), 0o644)
            
            print(f"✅ Fixed permissions on {chroma_db_path}")
        else:
            print(f"ℹ️ Directory {chroma_db_path} does not exist")
    except Exception as e:
        print(f"❌ Error fixing permissions: {e}")

def main():
    """Main function"""
    logger.info("🚀 Starting Vector Database Data Addition...")
    
    # Check if user wants to fix permissions first
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--fix-permissions":
        fix_permissions()
        return
    
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
