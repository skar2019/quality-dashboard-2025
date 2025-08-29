#!/usr/bin/env python3
"""
Script to add data to ChromaDB vector database
Adds JIRA task data from MongoDB to ChromaDB for RAG operations
Uses the EXACT same approach as chatbot.py for perfect compatibility
"""

import os
import sys
import logging
from datetime import datetime

# Add the parent directory to Python path to access app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymongo
from pymongo import MongoClient

# Import the SimpleRAGChat class directly from chatbot.py
from app.routes.chatbot import SimpleRAGChat

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VectorDBAdder:
    def __init__(self):
        self.mongo_url = "mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
        
        # Use the EXACT same SimpleRAGChat instance as chatbot.py
        self.rag_instance = SimpleRAGChat()
        
        # Initialize MongoDB connection
        self.mongo_client = None
        self.mongo_collection = None
        
        self.setup_mongodb()
    
    def setup_mongodb(self):
        """Setup MongoDB connection"""
        try:
            logger.info("Connecting to MongoDB...")
            self.mongo_client = MongoClient(self.mongo_url)
            db = self.mongo_client.quality_dashboard
            self.mongo_collection = db.jirasprintissues
            logger.info("MongoDB connection established successfully")
        except Exception as e:
            logger.error(f"Error setting up MongoDB: {str(e)}")
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
        """Add JIRA data from MongoDB to ChromaDB using the EXACT same approach as chatbot.py"""
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
            
            # Clear existing data in vectorstore (same as chatbot.py approach)
            logger.info("🧹 Clearing existing vectorstore data...")
            try:
                # Use the same approach as chatbot.py - delete collection and recreate
                self.rag_instance.vectorstore.delete_collection()
                logger.info("✅ Deleted existing collection")
                
                # Recreate the vectorstore using the same approach as SimpleRAGChat
                self.rag_instance.vectorstore = self.rag_instance.vectorstore.__class__(
                    persist_directory=self.rag_instance.persist_directory, 
                    embedding_function=self.rag_instance.embeddings, 
                    collection_name="project_data"
                )
                logger.info("✅ Recreated vectorstore")
            except Exception as e:
                logger.warning(f"Could not clear vectorstore: {e}")
            
            # Process documents using the EXACT same format as chatbot.py
            langchain_documents = []
            
            for doc in documents:
                try:
                    # Extract and clean JIRA item data (EXACT same as chatbot.py)
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
                    
                    # Create document content EXACTLY as in chatbot.py
                    content = f"Task ID: {issue_key}\nTitle: {summary}\nDescription: {description}\nStatus: {status}\nPriority: {priority}\nAssignee: {assignee}\nReporter: {reporter}\nIssue Type: {issue_type}\nResolution: {resolution}\nProject: {project_id}\nSprint: {sprint_id}"
                    
                    # Create metadata EXACTLY as in chatbot.py
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
                    from langchain.docstore.document import Document
                    langchain_doc = Document(
                        page_content=content,
                        metadata=metadata
                    )
                    langchain_documents.append(langchain_doc)
                    
                    logger.debug(f"Processed JIRA item: {issue_key} ({len(content)} chars)")
                    
                except Exception as e:
                    logger.error(f"Error processing document {doc.get('taskId', 'Unknown')}: {e}")
                    continue
            
            # Add documents to vectorstore using EXACT same batch processing as chatbot.py
            if langchain_documents:
                logger.info(f"📚 Adding {len(langchain_documents)} documents to vector store...")
                
                # Use batch processing for better performance (same as chatbot.py)
                batch_size = 50
                total_added = 0
                failed_batches = 0
                
                for i in range(0, len(langchain_documents), batch_size):
                    batch = langchain_documents[i:i + batch_size]
                    batch_num = i // batch_size + 1
                    total_batches = (len(langchain_documents) + batch_size - 1) // batch_size
                    
                    try:
                        self.rag_instance.vectorstore.add_documents(batch)
                        total_added += len(batch)
                        logger.info(f"✅ Added batch {batch_num}/{total_batches}: {len(batch)} documents")
                    except Exception as e:
                        failed_batches += 1
                        logger.error(f"❌ Failed to add batch {batch_num}/{total_batches}: {e}")
                        
                        # Try adding documents individually as fallback (same as chatbot.py)
                        individual_success = 0
                        for doc in batch:
                            try:
                                self.rag_instance.vectorstore.add_documents([doc])
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
            
            # Refresh dynamic vocabulary with new data (same as chatbot.py)
            try:
                self.rag_instance._refresh_dynamic_vocabulary()
                logger.info("🔄 Dynamic vocabulary refreshed with new JIRA data")
            except Exception as e:
                logger.warning(f"⚠️ Could not refresh dynamic vocabulary: {e}")
            
            # Verify the data was added correctly
            try:
                all_docs = self.rag_instance.vectorstore.get()
                total_docs = len(all_docs['documents']) if all_docs['documents'] else 0
                logger.info(f"✅ Verification: {total_docs} documents now in vectorstore")
                
                # Log sample metadata for debugging
                if all_docs['metadatas'] and len(all_docs['metadatas']) > 0:
                    sample_metadata = all_docs['metadatas'][0]
                    logger.info(f"📊 Sample metadata: {sample_metadata}")
                    
                    # Check for projects
                    projects = set()
                    for metadata in all_docs['metadatas']:
                        if metadata.get('project_id'):
                            projects.add(metadata['project_id'])
                    logger.info(f"📊 Found {len(projects)} unique projects: {list(projects)}")
                
            except Exception as e:
                logger.warning(f"⚠️ Could not verify data: {e}")
            
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

def main():
    """Main function"""
    logger.info("🚀 Starting Vector Database Data Addition...")
    
    adder = VectorDBAdder()
    
    try:
        success = adder.add_data_to_vector_db()
        
        if success:
            logger.info("🎉 Data successfully added to vector database!")
            
            # Test the data with a simple query using the same RAG instance
            logger.info("🧪 Testing data with sample query...")
            try:
                test_response = adder.rag_instance.process_query("Show me all tasks in Sprint-1")
                logger.info(f"✅ Test query successful: {test_response[:200]}...")
                
                # Test structured data extraction
                from app.routes.chatbot import TaskData
                structured_tasks = adder.rag_instance.extract_structured_tasks("Show me all tasks")
                logger.info(f"✅ Structured extraction: {len(structured_tasks)} tasks found")
                
            except Exception as e:
                logger.warning(f"⚠️ Test query failed: {e}")
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
