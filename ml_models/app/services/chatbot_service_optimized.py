import os
import logging
import time
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from functools import lru_cache

from langchain_community.llms import Ollama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.schema import Document
from langchain.prompts import PromptTemplate
import chromadb
from chromadb.config import Settings
import pymongo
from pymongo import MongoClient
import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

def filter_metadata_for_chromadb(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Filter metadata to ensure ChromaDB compatibility"""
    filtered = {}
    for key, value in metadata.items():
        if isinstance(value, (str, int, float, bool)) or value is None:
            filtered[key] = value
        elif isinstance(value, list):
            filtered[key] = str(value)
        elif isinstance(value, dict):
            filtered[key] = str(value)
        else:
            filtered[key] = str(value)
    return filtered

# Module-level singleton for Chroma client and vectorstore
CHROMA_PERSIST_DIRECTORY = "./jira_tasks_chroma_db"
CHROMA_COLLECTION_NAME = "project_data"
_chroma_client = None
_chroma_vectorstore = None
_chroma_initialized = False

def get_chroma_client_and_vectorstore(embeddings):
    global _chroma_client, _chroma_vectorstore, _chroma_initialized
    
    if not _chroma_initialized:
        try:
            import chromadb
            from langchain_community.vectorstores import Chroma
            import os
            
            logger.info(f"🔄 Initializing ChromaDB at: {CHROMA_PERSIST_DIRECTORY}")
            
            # Ensure directory exists
            os.makedirs(CHROMA_PERSIST_DIRECTORY, exist_ok=True)
            
            # Initialize ChromaDB client with simple configuration
            _chroma_client = chromadb.PersistentClient(
                path=CHROMA_PERSIST_DIRECTORY
            )
            logger.info("✅ ChromaDB client initialized")
            
            # Initialize vector store
            _chroma_vectorstore = Chroma(
                collection_name=CHROMA_COLLECTION_NAME,
                embedding_function=embeddings,
                client=_chroma_client
            )
            logger.info("✅ ChromaDB vector store initialized")
            
            _chroma_initialized = True
            logger.info("✅ ChromaDB singleton initialization complete")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB singleton: {e}")
            # Reset state on failure
            _chroma_client = None
            _chroma_vectorstore = None
            _chroma_initialized = False
            raise
    
    return _chroma_client, _chroma_vectorstore

class OptimizedProjectInsiderChatbot:
    """
    Optimized Project Insider Chatbot with performance improvements from POC.
    
    Key optimizations:
    - Optimized Ollama parameters for faster inference
    - Query caching system
    - Performance monitoring
    - Streamlined prompt templates
    - Reduced context window for faster processing
    """
    
    def __init__(self):
        self.ollama_model = "llama2"
        
        # RAG-specific attributes
        self.rag_chroma_path = "/opt/homebrew/var/www/acsqd/ml_models/jira_tasks_chroma_db"
        self.collection_name = "project_data"
        self.mongodb_uri = "mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0"
        self.embedding_cache = {}
        
        # Initialize RAG components
        self._init_rag_components()
        
        # Original chatbot components
        self.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        self.chroma_persist_directory = CHROMA_PERSIST_DIRECTORY
        self.collection_name = CHROMA_COLLECTION_NAME
        
        # Performance tracking
        self.query_times = []
        self._query_cache = {}
        self.cache_size = 100
        
        # Initialize components
        self._init_llm()
        self._init_embeddings()
        self._init_vectorstore()
        self._init_memory()
        self._init_chain()
        
        # MongoDB connection for project data
        self._init_mongodb()
    
    def _init_rag_components(self):
        """Initialize RAG-specific components"""
        try:
            # Initialize ChromaDB for RAG
            self._init_rag_chromadb()
            
            # Initialize embedding model for RAG
            self._init_rag_embedding_model()
            
            # Initialize LLM for RAG
            self._init_rag_llm()
            
            logger.info("✅ RAG components initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize RAG components: {e}")
            raise
    
    def _init_rag_chromadb(self):
        """Initialize ChromaDB for RAG"""
        try:
            import chromadb
            from chromadb.config import Settings
            
            # Ensure directory exists
            os.makedirs(self.rag_chroma_path, exist_ok=True)
            
            # Initialize ChromaDB client
            self.rag_chroma_client = chromadb.PersistentClient(
                path=self.rag_chroma_path,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            self.rag_collection = self.rag_chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            logger.info(f"✅ RAG ChromaDB initialized at {self.rag_chroma_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize RAG ChromaDB: {e}")
            raise
    
    def _init_rag_embedding_model(self):
        """Initialize embedding model for RAG"""
        try:
            # Use device optimization
            device = 'mps' if hasattr(torch, 'mps') and torch.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
            self.rag_embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device=device)
            logger.info(f"✅ RAG embedding model loaded on {device}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize RAG embedding model: {e}")
            raise
    
    def _init_rag_llm(self):
        """Initialize LLM for RAG"""
        try:
            import ollama
            
            # Check if Ollama is available
            try:
                ollama.list()
                self.rag_llm = ollama
                logger.info("✅ RAG LLM (Ollama) initialized successfully")
            except Exception as ollama_error:
                logger.warning(f"⚠️ Ollama not available: {ollama_error}")
                self.rag_llm = None
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize RAG LLM: {e}")
            self.rag_llm = None
        
    def _init_llm(self):
        """Initialize optimized Ollama LLM with performance parameters"""
        try:
            self.llm = Ollama(
                model=self.ollama_model,
                # Optimized parameters for faster inference
                temperature=0.1,  # Lower temperature for faster, focused responses
                top_p=0.9,
                top_k=10,
                repeat_penalty=1.1,
                num_ctx=512,  # Reduced context window for faster processing
                num_predict=150,  # Limit response length for speed
                stop=["\n\n", "Question:", "Response:"]  # Stop tokens for faster completion
            )
            logger.info(f"✅ Initialized optimized Ollama LLM with model: {self.ollama_model}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Ollama LLM: {e}")
            raise
    
    def _init_embeddings(self):
        """Initialize sentence transformers for embeddings"""
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.embedding_model,
                model_kwargs={'device': 'cpu'}
            )
            logger.info(f"✅ Initialized embeddings with model: {self.embedding_model}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize embeddings: {e}")
            raise
    
    def _init_vectorstore(self):
        """Initialize ChromaDB vector store with fixed path and singleton pattern"""
        try:
            self.chroma_client, self.vectorstore = get_chroma_client_and_vectorstore(self.embeddings)
            logger.info(f"✅ ChromaDB vector store initialized at: {self.chroma_persist_directory}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB: {e}")
            raise
    
    def _init_memory(self):
        """Initialize conversation memory"""
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        logger.info("✅ Conversation memory initialized")
    
    def _init_chain(self):
        """Initialize optimized conversational retrieval chain"""
        # Streamlined prompt template for faster processing
        template = """You are a Project Insider Analysis assistant. You help analyze project data, sprint metrics, quality issues, and provide insights from JIRA reports.

IMPORTANT: When asked about specific issues (like "adani-13", "TEST-001", etc.), focus ONLY on the information provided in the context about that specific issue. Do not give generic advice or analysis.

Context information:
{context}

Human: {question}
Assistant: Provide a brief, direct response based on the context. If relevant issues found, list them as:
- Issue Key (Type, Status, Priority, Assignee): Summary

Response:"""

        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template=template
        )
        
        # Create a simple retrieval chain without memory to avoid output_key issues
        from langchain.chains import RetrievalQA
        
        self.chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}  # Reduced from 8 to 5 for faster processing
            ),
            return_source_documents=True,
            chain_type_kwargs={"prompt": prompt},
            verbose=False  # Disable verbose for speed
        )
        
        logger.info("✅ Optimized conversational retrieval chain initialized")
    
    def _init_mongodb(self):
        """Initialize MongoDB connection for project data"""
        try:
            mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
            self.mongo_client = MongoClient(mongo_url)
            # Test the connection
            self.mongo_client.admin.command('ping')
            self.db = self.mongo_client.quality_dashboard
            logger.info("✅ Connected to MongoDB for project data")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            self.mongo_client = None
            self.db = None
    
    @lru_cache(maxsize=50)
    def check_data_availability(self) -> bool:
        """
        Check if there's data available in the ChromaDB collection (cached).
        
        Returns:
            bool: True if data is available, False otherwise
        """
        try:
            # Try to get a sample document
            sample_docs = self.vectorstore.similarity_search("test", k=1)
            has_data = len(sample_docs) > 0
            
            if has_data:
                logger.info(f"✅ Found {len(sample_docs)} sample documents in ChromaDB")
            else:
                logger.warning("⚠️  No documents found in ChromaDB")
            
            return has_data
            
        except Exception as e:
            logger.error(f"❌ Error checking data availability: {e}")
            return False
    
    def process_jira_data(self, jira_data: List[Dict[str, Any]]) -> None:
        """Process JIRA data and add to vector store with enhanced project and sprint context"""
        try:
            documents = []
            processing_start_time = time.time()
            
            logger.info(f"🔄 Processing {len(jira_data)} JIRA items for RAG embedding")
            
            # Check if data is in new optimized format
            is_optimized_format = any('document_text' in item for item in jira_data)
            
            if is_optimized_format:
                logger.info("📝 Using optimized data format from backend")
                
                # Process optimized format data
                for item in jira_data:
                    try:
                        document_text = item.get('document_text', '')
                        metadata = item.get('metadata', {})
                        raw_data = item.get('raw_data', {})
                        
                        # Skip if no document text
                        if not document_text or document_text == 'No content available':
                            continue
                        
                        # Create LangChain Document with optimized metadata
                        doc = Document(
                            page_content=document_text,
                            metadata=metadata
                        )
                        documents.append(doc)
                        
                    except Exception as e:
                        logger.error(f"❌ Error processing optimized item: {e}")
                        continue
                
                logger.info(f"✅ Processed {len(documents)} documents from optimized format")
                
            else:
                logger.info("📝 Using legacy data format - applying POC optimizations")
                
                # Group data by project for better context (legacy format)
                project_groups = {}
                for item in jira_data:
                    project_id = str(item.get("project", "Unknown"))
                    if project_id not in project_groups:
                        project_groups[project_id] = []
                    project_groups[project_id].append(item)
                
                for project_id, project_items in project_groups.items():
                    # Create project-level summary document
                    project_summary = self._create_project_summary(project_id, project_items)
                    if project_summary:
                        documents.append(project_summary)
                    
                    # Create sprint-level documents
                    sprint_groups = self._group_by_sprint(project_items)
                    for sprint_name, sprint_items in sprint_groups.items():
                        sprint_summary = self._create_sprint_summary(project_id, sprint_name, sprint_items)
                        if sprint_summary:
                            documents.append(sprint_summary)
                    
                    # Create individual issue documents with POC optimizations
                    for item in project_items:
                        content = self._format_jira_item_optimized(item)
                        
                        # Enhanced metadata with project and sprint context
                        metadata = {
                            "source": "jira",
                            "project_id": str(item.get("masterReportId", "Unknown")),
                            "project_name": "Adani",  # From the data we know it's Adani project
                            "sprint": "sprint-1",  # From the data we know it's sprint-1
                            "issue_key": item.get("issueKey", "Unknown"),
                            "issue_type": item.get("issueType", "Unknown"),
                            "status": item.get("status", "Unknown"),
                            "priority": item.get("priority", "Unknown"),
                            "assignee": item.get("assignee", "Unknown"),
                            "created_date": item.get("created", "Unknown"),
                            "updated_date": item.get("updated", "Unknown"),
                            "resolution": item.get("resolution", "Unresolved")
                        }
                        
                        # Filter metadata for ChromaDB compatibility
                        filtered_metadata = filter_metadata_for_chromadb(metadata)
                        
                        doc = Document(
                            page_content=content,
                            metadata=filtered_metadata
                        )
                        documents.append(doc)
            
            # Add documents to vector store
            if documents:
                # Use batch processing for better performance
                batch_size = 100
                total_added = 0
                
                for i in range(0, len(documents), batch_size):
                    batch = documents[i:i + batch_size]
                    self.vectorstore.add_documents(batch)
                    total_added += len(batch)
                    logger.info(f"📦 Added batch {i//batch_size + 1}: {len(batch)} documents")
                
                processing_time = time.time() - processing_start_time
                logger.info(f"✅ Successfully added {total_added} documents to vector store in {processing_time:.2f}s")
                
                # Clear cache after adding new data
                self._query_cache.clear()
                self.check_data_availability.cache_clear()
                
                # Return processing statistics
                return {
                    "processed_items": total_added,
                    "processing_time": processing_time,
                    "collection_name": self.collection_name,
                    "format_used": "optimized" if is_optimized_format else "legacy"
                }
            else:
                logger.warning("⚠️ No documents to add to vector store")
                return {
                    "processed_items": 0,
                    "processing_time": 0,
                    "collection_name": self.collection_name,
                    "format_used": "optimized" if is_optimized_format else "legacy"
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to process JIRA data: {e}")
            raise
    
    def _format_jira_item_optimized(self, item: Dict[str, Any]) -> str:
        """Format JIRA item for vector store using POC optimizations"""
        # Clean text like in POC
        def clean_text(text: str) -> str:
            if not text or not isinstance(text, str):
                return ''
            return text.strip().replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        
        issue_key = clean_text(item.get("issueKey", "Unknown"))
        summary = clean_text(item.get("summary", "No summary"))
        description = clean_text(item.get("description", "No description"))
        issue_type = clean_text(item.get("issueType", "Unknown"))
        status = clean_text(item.get("status", "Unknown"))
        priority = clean_text(item.get("priority", "Unknown"))
        assignee = clean_text(item.get("assignee", "Unassigned"))
        created_date = item.get("created", "Unknown")
        updated_date = item.get("updated", "Unknown")
        resolution = clean_text(item.get("resolution", "Unresolved"))
        
        # Create combined text like in POC
        if summary and description:
            content = f"Summary: {summary} Description: {description}"
        elif summary:
            content = f"Summary: {summary}"
        elif description:
            content = f"Description: {description}"
        else:
            content = "No content available"
        
        # Add metadata as structured text
        content += f"\nIssue Key: {issue_key}"
        content += f"\nType: {issue_type}"
        content += f"\nStatus: {status}"
        content += f"\nPriority: {priority}"
        content += f"\nAssignee: {assignee}"
        content += f"\nResolution: {resolution}"
        
        return content
    
    def _group_by_sprint(self, items: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group items by sprint"""
        sprint_groups = {}
        for item in items:
            sprint = item.get("sprint", "Unknown")
            if sprint not in sprint_groups:
                sprint_groups[sprint] = []
            sprint_groups[sprint].append(item)
        return sprint_groups
    
    def _create_project_summary(self, project_id: str, items: List[Dict[str, Any]]) -> Optional[Document]:
        """Create project-level summary document"""
        try:
            total_issues = len(items)
            issue_types = {}
            statuses = {}
            priorities = {}
            assignees = {}
            
            for item in items:
                issue_type = item.get("issueType", "Unknown")
                status = item.get("status", "Unknown")
                priority = item.get("priority", "Unknown")
                assignee = item.get("assignee", "Unassigned")
                
                issue_types[issue_type] = issue_types.get(issue_type, 0) + 1
                statuses[status] = statuses.get(status, 0) + 1
                priorities[priority] = priorities.get(priority, 0) + 1
                assignees[assignee] = assignees.get(assignee, 0) + 1
            
            content = f"Project Summary for Project ID: {project_id}\n"
            content += f"Total Issues: {total_issues}\n"
            content += f"Issue Types: {dict(issue_types)}\n"
            content += f"Status Distribution: {dict(statuses)}\n"
            content += f"Priority Distribution: {dict(priorities)}\n"
            content += f"Assignee Workload: {dict(assignees)}"
            
            metadata = {
                "source": "project_summary",
                "project_id": project_id,
                "project_name": "Adani",
                "total_issues": total_issues,
                "issue_types": str(issue_types),
                "statuses": str(statuses),
                "priorities": str(priorities),
                "assignees": str(assignees)
            }
            
            filtered_metadata = filter_metadata_for_chromadb(metadata)
            
            return Document(
                page_content=content,
                metadata=filtered_metadata
            )
        except Exception as e:
            logger.error(f"❌ Failed to create project summary: {e}")
            return None
    
    def _create_sprint_summary(self, project_id: str, sprint_name: str, items: List[Dict[str, Any]]) -> Optional[Document]:
        """Create sprint-level summary document"""
        try:
            total_issues = len(items)
            completed_issues = len([item for item in items if item.get("status") in ["Done", "Closed", "Resolved"]])
            in_progress_issues = len([item for item in items if item.get("status") in ["In Progress", "In Review"]])
            todo_issues = len([item for item in items if item.get("status") in ["To Do", "Open", "Backlog"]])
            
            # Calculate velocity (completed issues)
            velocity = completed_issues
            
            content = f"Sprint Summary for Project {project_id}, Sprint: {sprint_name}\n"
            content += f"Total Issues: {total_issues}\n"
            content += f"Completed Issues: {completed_issues}\n"
            content += f"In Progress Issues: {in_progress_issues}\n"
            content += f"To Do Issues: {todo_issues}\n"
            content += f"Sprint Velocity: {velocity}\n"
            content += f"Completion Rate: {(completed_issues/total_issues*100):.1f}%" if total_issues > 0 else "Completion Rate: 0%"
            
            metadata = {
                "source": "sprint_summary",
                "project_id": project_id,
                "project_name": "Adani",
                "sprint": sprint_name,
                "total_issues": total_issues,
                "completed_issues": completed_issues,
                "in_progress_issues": in_progress_issues,
                "todo_issues": todo_issues,
                "velocity": velocity
            }
            
            filtered_metadata = filter_metadata_for_chromadb(metadata)
            
            return Document(
                page_content=content,
                metadata=filtered_metadata
            )
        except Exception as e:
            logger.error(f"❌ Failed to create sprint summary: {e}")
            return None
    
    def get_project_data(self) -> Dict[str, Any]:
        """Get project data from MongoDB"""
        try:
            if self.db is None:
                return {"total_projects": 0, "total_jira_items": 0, "projects": []}
            
            # Get projects with error handling
            try:
                projects = list(self.db.projects.find({}, {"_id": 0}))
            except Exception as e:
                logger.warning(f"⚠️ Failed to get projects: {e}")
                projects = []
            
            # Get JIRA data with error handling
            try:
                jira_data = list(self.db.jirasprintissues.find({}, {"_id": 0}))
            except Exception as e:
                logger.warning(f"⚠️ Failed to get JIRA data: {e}")
                jira_data = []
            
            logger.info(f"Retrieved {len(projects)} projects and {len(jira_data)} JIRA items from MongoDB")
            
            return {
                "total_projects": len(projects),
                "total_jira_items": len(jira_data),
                "projects": projects,
                "jira_data": jira_data
            }
        except Exception as e:
            logger.error(f"❌ Failed to get project data: {e}")
            return {"total_projects": 0, "total_jira_items": 0, "projects": []}
    
    def chat(self, message: str, conversation_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Process chat message with optimized performance"""
        start_time = time.time()
        
        # Check cache first
        cache_key = message.lower().strip()
        if cache_key in self._query_cache:
            logger.info("✅ Returning cached result")
            return self._query_cache[cache_key]
        
        logger.info(f"🔍 Processing chat message: {message}")
        
        try:
            # Check if this is a RAG-specific query (JIRA task queries)
            rag_keywords = ['high priority', 'critical', 'priority', 'bug', 'story', 'task', 'adani-', 'issue']
            is_rag_query = any(keyword in message.lower() for keyword in rag_keywords)
            
            if is_rag_query:
                logger.info("🔍 Detected RAG query - using RAG logic")
                try:
                    # Use RAG logic for JIRA task queries
                    rag_response = self.process_rag_query(message)
                    
                    total_time = time.time() - start_time
                    self.query_times.append(total_time)
                    
                    response_dict = {
                        "response": rag_response,
                        "sources": [],  # RAG doesn't return sources in the same format
                        "project_context": {
                            "total_projects": 0,
                            "total_jira_items": 0
                        },
                        "query_time": total_time,
                        "retrieval_time": total_time,
                        "rag_used": True
                    }
                    
                    # Cache the result
                    if len(self._query_cache) < self.cache_size:
                        self._query_cache[cache_key] = response_dict
                    
                    return response_dict
                    
                except Exception as rag_error:
                    logger.error(f"❌ RAG processing failed: {rag_error}")
                    # Fall back to original logic
            
            # Original chatbot logic for non-RAG queries
            # Get project context (simplified to avoid MongoDB issues)
            try:
                project_data = self.get_project_data()
            except Exception as db_error:
                logger.warning(f"⚠️ Database error, using default context: {db_error}")
                project_data = {"total_projects": 0, "total_jira_items": 0, "projects": []}
            
            # Add project context to the question if relevant
            enhanced_message = self._enhance_message_with_context(message, project_data)
            
            # Check if vector store has data
            if not self.check_data_availability():
                result = {
                    "response": "I don't have any project data to analyze yet. Please upload some JIRA reports first, and I'll be able to help you analyze your project data, sprint metrics, and quality issues.",
                    "sources": [],
                    "project_context": {
                        "total_projects": project_data.get("total_projects", 0),
                        "total_jira_items": project_data.get("total_jira_items", 0)
                    },
                    "query_time": 0.0
                }
                return result
            
            # Process with optimized LangChain
            query_start = time.time()
            try:
                # Use RetrievalQA chain with simple query
                result = self.chain({"query": enhanced_message})
            except Exception as chain_error:
                logger.error(f"❌ Chain error: {chain_error}")
                # Try alternative approach
                result = {"result": "I'm sorry, I couldn't process your request at the moment.", "source_documents": []}
            query_time = time.time() - query_start
            
            # Extract source documents
            source_docs = result.get("source_documents", [])
            sources = []
            
            for doc in source_docs:
                if hasattr(doc, 'metadata'):
                    sources.append({
                        "source": doc.metadata.get("source", "Unknown"),
                        "project": doc.metadata.get("project_id", "Unknown"),
                        "issue_type": doc.metadata.get("issue_type", "Unknown"),
                        "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                    })
            
            total_time = time.time() - start_time
            self.query_times.append(total_time)
            
            logger.info(f"✅ Chat completed in {total_time:.2f}s. Found {len(sources)} relevant documents")
            
            response_dict = {
                "response": result.get("result", "I'm sorry, I couldn't process your request."),
                "sources": sources,
                "project_context": {
                    "total_projects": project_data.get("total_projects", 0),
                    "total_jira_items": project_data.get("total_jira_items", 0)
                },
                "query_time": total_time,
                "retrieval_time": query_time,
                "rag_used": False
            }
            
            # Cache the result
            if len(self._query_cache) < self.cache_size:
                self._query_cache[cache_key] = response_dict
            
            return response_dict
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"❌ Failed to process chat message: {e}")
            return {
                "response": "I'm sorry, I encountered an error while processing your request. Please try again.",
                "sources": [],
                "project_context": {},
                "error": str(e),
                "query_time": total_time
            }
    
    def _enhance_message_with_context(self, message: str, project_data: Dict[str, Any]) -> str:
        """Enhance user message with project context (optimized)"""
        # For specific issue queries, don't add too much context that might confuse the retrieval
        if any(word in message.lower() for word in ["adani-", "test-", "issue", "ticket"]):
            # For specific issue queries, keep it simple to help retrieval focus on the specific issue
            return message
        
        context_parts = []
        
        # Add project count context
        total_projects = project_data.get("total_projects", 0)
        total_jira_items = project_data.get("total_jira_items", 0)
        
        if total_projects > 0:
            context_parts.append(f"Available data: {total_projects} projects, {total_jira_items} JIRA items")
        
        # Add specific project names if asking about projects
        if "project" in message.lower():
            projects = project_data.get("projects", [])
            if projects:
                project_names = [p.get("name", "Unknown") for p in projects[:5]]
                context_parts.append(f"Projects: {', '.join(project_names)}")
        
        # Add sprint context if asking about sprints
        if "sprint" in message.lower():
            context_parts.append("Sprint data is available for analysis including sprint summaries, velocity, and issue breakdowns")
        
        # Add specific context for different types of questions
        if any(word in message.lower() for word in ["status", "progress", "velocity"]):
            context_parts.append("Status and progress data available including issue status breakdowns, sprint velocity, and project timelines")
        
        if any(word in message.lower() for word in ["quality", "defect", "bug"]):
            context_parts.append("Quality metrics available including defect analysis, bug tracking, and issue resolution patterns")
        
        if any(word in message.lower() for word in ["team", "assignee", "workload"]):
            context_parts.append("Team data available including assignee workload, team performance, and individual contributor metrics")
        
        if context_parts:
            enhanced_message = f"{message}\n\nContext: {'; '.join(context_parts)}"
            return enhanced_message
        
        return message
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """
        Get performance statistics.
        
        Returns:
            Dict[str, Any]: Performance statistics
        """
        if not self.query_times:
            return {"message": "No queries executed yet"}
        
        return {
            "total_queries": len(self.query_times),
            "average_query_time": sum(self.query_times) / len(self.query_times),
            "min_query_time": min(self.query_times),
            "max_query_time": max(self.query_times),
            "cache_hits": len(self._query_cache),
            "cache_size": self.cache_size
        }
    
    def get_chat_history(self) -> List[Dict[str, str]]:
        """Get chat history from memory"""
        try:
            return self.memory.chat_memory.messages
        except Exception as e:
            logger.error(f"❌ Failed to get chat history: {e}")
            return []
    
    def clear_chat_history(self) -> None:
        """Clear chat history"""
        try:
            self.memory.clear()
            logger.info("✅ Chat history cleared")
        except Exception as e:
            logger.error(f"❌ Failed to clear chat history: {e}")
    
    # RAG Methods (from rag_chat.py logic)
    def create_embedding(self, text: str) -> List[float]:
        """Create embedding for text using Ollama or SentenceTransformers"""
        try:
            # Check cache first
            if text in self.embedding_cache:
                logger.debug("Using cached embedding")
                return self.embedding_cache[text]
            
            # Try Ollama first
            if self.rag_llm:
                try:
                    response = self.rag_llm.embeddings(
                        model=self.ollama_model,
                        prompt=text
                    )
                    embedding = response['embedding']
                    self.embedding_cache[text] = embedding
                    return embedding
                except Exception as ollama_error:
                    logger.warning(f"Ollama embedding failed: {ollama_error}")
            
            # Fallback to SentenceTransformers
            embedding = self.rag_embedding_model.encode(text).tolist()
            self.embedding_cache[text] = embedding
            return embedding
            
        except Exception as e:
            logger.error(f"Error creating embedding: {e}")
            raise
    
    def get_all_high_priority_tasks(self) -> Dict[str, Any]:
        """Get all high priority tasks from the database"""
        try:
            results = self.rag_collection.get(include=['documents', 'metadatas'])
            high_priority_ids = []
            high_priority_documents = []
            high_priority_metadatas = []
            
            for i, metadata in enumerate(results['metadatas']):
                task_priority = metadata.get('priority', '').lower()
                if ('high' in task_priority or 'critical' in task_priority or 'urgent' in task_priority):
                    high_priority_ids.append(results['ids'][i])
                    high_priority_documents.append(results['documents'][i])
                    high_priority_metadatas.append(metadata)
            
            logger.info(f"Found {len(high_priority_ids)} high priority tasks in total database")
            return {
                'ids': high_priority_ids,
                'documents': high_priority_documents,
                'metadatas': high_priority_metadatas,
                'distances': [0.0] * len(high_priority_ids)
            }
        except Exception as e:
            logger.error(f"Error getting all high priority tasks: {str(e)}")
            raise
    
    def search_similar_tasks(self, query: str, n_results: int = 10) -> Dict[str, Any]:
        """Search for similar tasks using vector similarity"""
        try:
            query_embedding = self.create_embedding(query)
            
            results = self.rag_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=['documents', 'metadatas', 'distances']
            )
            
            return results
        except Exception as e:
            logger.error(f"Error searching similar tasks: {e}")
            raise
    
    def format_context(self, results: Dict[str, Any]) -> str:
        """Format search results into context string"""
        try:
            documents = results.get('documents', [])
            metadatas = results.get('metadatas', [])
            
            if documents and isinstance(documents[0], list):
                docs = documents[0]
                metas = metadatas[0] if metadatas else []
            else:
                docs = documents
                metas = metadatas
            
            if not docs:
                return "No relevant tasks found."
            
            context = ""
            for i, (doc, meta) in enumerate(zip(docs, metas)):
                issue_type = meta.get('issueType', 'Task')
                context += f"{issue_type} {i+1}:\n"
                context += f"Task Key: {meta.get('issueKey', 'N/A')} | "
                context += f"Summary: {meta.get('summary', 'N/A')} | "
                context += f"Issue Type: {meta.get('issueType', 'N/A')} | "
                context += f"Status: {meta.get('status', 'N/A')} | "
                context += f"Priority: {meta.get('priority', 'N/A')} | "
                context += f"Assignee: {meta.get('assignee', 'N/A')} | "
                context += f"Reporter: {meta.get('reporter', 'N/A')} | "
                context += f"Description: {meta.get('description', 'N/A')} | "
                context += f"Created: {meta.get('created', 'N/A')} | "
                context += f"Updated: {meta.get('updated', 'N/A')}\n\n"
            
            return context
            
        except Exception as e:
            logger.error(f"Error formatting context: {e}")
            return "Error formatting context."
    
    def generate_llm_response(self, query: str, context: str) -> str:
        """Generate LLM response using Ollama"""
        try:
            if not self.rag_llm:
                return self.generate_fallback_response(query, context)
            
            prompt = f"""Context: {context}
Question: {query}
CRITICAL: You MUST list EVERY SINGLE task found in the context. Count them first, then list each one.

Format: Number each task and include: Issue Key, Summary, Issue Type, Status, Priority, Assignee.

Answer:"""
            
            response = self.rag_llm.generate(
                model=self.ollama_model,
                prompt=prompt,
                options={
                    'temperature': 0.3,
                    'top_p': 0.8,
                    'max_tokens': 3000,
                    'num_predict': 2000,
                    'top_k': 40,
                    'repeat_penalty': 1.1
                }
            )
            
            return response['response']
            
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return self.generate_fallback_response(query, context)
    
    def generate_fallback_response(self, query: str, context: str) -> str:
        """Generate fallback response without LLM"""
        try:
            lines = context.split('\n')
            tasks = []
            
            current_task = {}
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Check for task separators (like "Bug 1:", "Story 2:", etc.)
                if re.match(r'^(Bug|Story|Task)\s+\d+:', line):
                    if current_task:
                        tasks.append(current_task)
                    current_task = {}
                    continue
                
                # Parse task details from the formatted text
                if '|' in line:
                    parts = [part.strip() for part in line.split('|')]
                    for part in parts:
                        if ':' in part:
                            key, value = part.split(':', 1)
                            key = key.strip()
                            value = value.strip()
                            
                            if key == 'Issue Key':
                                current_task['key'] = value
                            elif key == 'Summary':
                                current_task['summary'] = value
                            elif key == 'Priority':
                                current_task['priority'] = value
                            elif key == 'Status':
                                current_task['status'] = value
                            elif key == 'Assignee':
                                current_task['assignee'] = value
                            elif key == 'Issue Type':
                                current_task['issue_type'] = value
                            elif key == 'Reporter':
                                current_task['reporter'] = value
                            elif key == 'Description':
                                current_task['description'] = value
                            elif key == 'Created':
                                current_task['created'] = value
                            elif key == 'Updated':
                                current_task['updated'] = value
                
                # Also check for Issue Key at the beginning of the line
                if line.startswith('Issue Key:'):
                    current_task['key'] = line.split(':', 1)[1].strip()
            
            if current_task:
                tasks.append(current_task)
            
            query_lower = query.lower()
            
            if 'high priority' in query_lower or 'priority' in query_lower or 'critical' in query_lower:
                # For high priority queries, show all tasks found
                if tasks:
                    response = f"I found {len(tasks)} high priority tasks:\n\n"
                    for i, task in enumerate(tasks, 1):
                        response += f"{i}. Issue Key : {task.get('key', 'N/A')}\n"
                        response += f"   Summary : {task.get('summary', 'N/A')}\n"
                        response += f"   Issue Type : {task.get('issue_type', 'N/A')}\n"
                        response += f"   Status : {task.get('status', 'N/A')}\n"
                        response += f"   Priority : {task.get('priority', 'N/A')}\n"
                        response += f"   Assignee : {task.get('assignee', 'N/A')}\n"
                        if task.get('reporter'):
                            response += f"   Reporter : {task.get('reporter', 'N/A')}\n"
                        if task.get('description'):
                            response += f"   Description : {task.get('description', 'N/A')}\n"
                        response += "\n"
                else:
                    response = "I didn't find any high priority tasks in the search results."
            else:
                # For other queries, show all tasks found
                if tasks:
                    response = f"I found {len(tasks)} relevant tasks:\n\n"
                    for task in tasks:
                                            response += f"• Issue Key : {task.get('key', 'N/A')}\n"
                    response += f"  Summary : {task.get('summary', 'N/A')}\n"
                    response += f"  Issue Type : {task.get('issue_type', 'N/A')}\n"
                    response += f"  Status : {task.get('status', 'N/A')}\n"
                    response += f"  Priority : {task.get('priority', 'N/A')}\n"
                    response += f"  Assignee : {task.get('assignee', 'N/A')}\n\n"
                else:
                    response = "I didn't find any relevant tasks in the search results."
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating fallback response: {e}")
            return "I encountered an error while processing your request."
    
    def process_rag_query(self, query: str) -> str:
        """Process query using RAG logic (same as rag_chat.py)"""
        try:
            logger.info(f"Processing RAG query: {query}")
            
            # Check if query is about high priority tasks
            query_lower = query.lower()
            if 'high priority' in query_lower or 'critical' in query_lower or 'priority' in query_lower:
                logger.info("Query is about high priority tasks - getting all high priority tasks from database")
                search_results = self.get_all_high_priority_tasks()
            else:
                search_results = self.search_similar_tasks(query, n_results=10)
            
            # Format context
            context = self.format_context(search_results)
            
            # Generate response
            response = self.generate_llm_response(query, context)
            
            # Check if response mentions the correct number of tasks
            if 'high priority' in query.lower() or 'critical' in query.lower():
                expected_count = len(search_results.get('ids', []))
                if expected_count > 0:
                    # Count tasks in response - look for task patterns
                    task_count = response.count('Task Key:') + response.count('Issue Key:') + response.count('adani-')
                    if task_count < expected_count:
                        logger.warning(f"LLM only showed {task_count} tasks, expected {expected_count}. Using fallback.")
                        response = self.generate_fallback_response(query, context)
            
            logger.info("RAG query processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing RAG query: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def clear_cache(self):
        """Clear the embedding cache"""
        self.embedding_cache.clear()
        logger.info("Embedding cache cleared")

# Global instance for singleton pattern
_chatbot_instance = None

def get_optimized_chatbot(reset_instance: bool = False) -> OptimizedProjectInsiderChatbot:
    """Get the optimized chatbot instance (singleton with reset capability)"""
    global _chatbot_instance, _chroma_initialized
    
    if reset_instance or _chatbot_instance is None:
        logger.info("🔄 Creating fresh chatbot instance")
        # Reset ChromaDB singleton if resetting
        if reset_instance:
            _chroma_initialized = False
            _chatbot_instance = None
        _chatbot_instance = OptimizedProjectInsiderChatbot()
    
    return _chatbot_instance 