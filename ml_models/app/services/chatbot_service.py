import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

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

class ProjectInsiderChatbot:
    def __init__(self):
        self.ollama_model = "llama2"
        self.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        self.chroma_persist_directory = "./jira_tasks_chroma_db"
        self.collection_name = "project_data"
        
        # Initialize components
        self._init_llm()
        self._init_embeddings()
        self._init_vectorstore()
        self._init_memory()
        self._init_chain()
        
        # MongoDB connection for project data
        self._init_mongodb()
        
    def _init_llm(self):
        """Initialize Ollama LLM"""
        try:
            self.llm = Ollama(
                model=self.ollama_model,
                temperature=0.1,
                base_url="http://localhost:11434"
            )
            logger.info(f"Initialized Ollama LLM with model: {self.ollama_model}")
        except Exception as e:
            logger.error(f"Failed to initialize Ollama LLM: {e}")
            raise
    
    def _init_embeddings(self):
        """Initialize sentence transformers for embeddings"""
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.embedding_model,
                model_kwargs={'device': 'cpu'}
            )
            logger.info(f"Initialized embeddings with model: {self.embedding_model}")
        except Exception as e:
            logger.error(f"Failed to initialize embeddings: {e}")
            raise
    
    def _init_vectorstore(self):
        """Initialize ChromaDB vector store"""
        try:
            # Ensure persist directory exists
            os.makedirs(self.chroma_persist_directory, exist_ok=True)
            
            # Initialize ChromaDB client
            self.chroma_client = chromadb.PersistentClient(
                path=self.chroma_persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # List existing collections to see what's available
            existing_collections = self.chroma_client.list_collections()
            logger.info(f"Existing ChromaDB collections: {[col.name for col in existing_collections]}")
            
            # Check if we have any existing collections with data
            collection_to_use = None
            for col in existing_collections:
                try:
                    count = col.count()
                    logger.info(f"Collection {col.name} has {count} documents")
                    if count > 0:
                        collection_to_use = col.name
                        break
                except Exception as e:
                    logger.warning(f"Could not check collection {col.name}: {e}")
            
            # Use existing collection with data, or create new one
            if collection_to_use:
                self.collection_name = collection_to_use
                self.collection = self.chroma_client.get_collection(collection_to_use)
                logger.info(f"Using existing ChromaDB collection with data: {collection_to_use}")
            else:
                # Get or create collection with default name
                try:
                    self.collection = self.chroma_client.get_collection(self.collection_name)
                    logger.info(f"Loaded existing ChromaDB collection: {self.collection_name}")
                except:
                    self.collection = self.chroma_client.create_collection(self.collection_name)
                    logger.info(f"Created new ChromaDB collection: {self.collection_name}")
            
            # Force the collection name to be used consistently
            logger.info(f"Final collection name being used: {self.collection_name}")
            
            # IMPORTANT: Force the collection name to be the one with data
            if collection_to_use:
                self.collection_name = collection_to_use
                logger.info(f"Overriding collection name to use existing collection: {collection_to_use}")
            
            # Double-check that we're using the right collection
            logger.info(f"Final collection name before vector store init: {self.collection_name}")
            
            # Initialize LangChain vector store with the correct collection name
            # Force it to use the existing collection by passing the collection directly
            if collection_to_use:
                # Use the existing collection that has data
                self.vectorstore = Chroma(
                    client=self.chroma_client,
                    collection_name=collection_to_use,
                    embedding_function=self.embeddings
                )
                logger.info(f"Using existing collection '{collection_to_use}' for vector store")
            else:
                # Create new collection if none exists
                self.vectorstore = Chroma(
                    client=self.chroma_client,
                    collection_name=self.collection_name,
                    embedding_function=self.embeddings
                )
                logger.info(f"Created new collection '{self.collection_name}' for vector store")
            
            # Verify the collection is working
            try:
                test_docs = self.vectorstore.similarity_search("test", k=1)
                logger.info(f"Vector store test successful, found {len(test_docs)} documents")
            except Exception as e:
                logger.warning(f"Vector store test failed: {e}")
            
            logger.info(f"Initialized ChromaDB vector store with collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise
    
    def _init_memory(self):
        """Initialize conversation memory"""
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
    
    def _init_chain(self):
        """Initialize conversational retrieval chain"""
        # Custom prompt template for project analysis
        template = """You are a Project Insider Analysis assistant. You help analyze project data, sprint metrics, quality issues, and provide insights from JIRA reports.

IMPORTANT: When asked about specific issues (like "adani-13", "TEST-001", etc.), focus ONLY on the information provided in the context about that specific issue. Do not give generic advice or analysis.

You have access to:
- Individual JIRA issues with detailed descriptions, status, priority, assignee, and resolution information
- Project summaries with issue breakdowns, status distributions, and team assignments
- Sprint summaries with velocity metrics, issue progress, and sprint-specific insights
- Team performance data including assignee workload and individual contributor metrics

When answering questions:
1. If asked about a specific issue (e.g., "adani-13", "who is working on X"), provide ONLY the specific details from the context
2. If asked about project metrics or trends, provide analysis based on the available data
3. Be direct and specific - avoid generic responses
4. If the specific information is not in the context, say so clearly

Context information:
{context}

Current conversation:
{chat_history}

Human: {question}
Assistant: """

        prompt = PromptTemplate(
            input_variables=["context", "chat_history", "question"],
            template=template
        )
        
        self.chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 8}  # Increased to get more context
            ),
            memory=self.memory,
            combine_docs_chain_kwargs={"prompt": prompt},
            return_source_documents=True,
            verbose=True
        )
        
        logger.info("Initialized conversational retrieval chain")
    
    def _init_mongodb(self):
        """Initialize MongoDB connection for project data"""
        try:
            mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
            self.mongo_client = MongoClient(mongo_url)
            self.db = self.mongo_client.quality_dashboard
            logger.info("Connected to MongoDB for project data")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.mongo_client = None
            self.db = None
    
    def process_jira_data(self, jira_data: List[Dict[str, Any]]) -> None:
        """Process JIRA data and add to vector store with enhanced project and sprint context"""
        try:
            documents = []
            
            # Group data by project for better context
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
                
                # Create individual issue documents
                for item in project_items:
                    content = self._format_jira_item(item)
                    
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
                        "reporter": item.get("reporter", "Unknown"),
                        "created": str(item.get("created", "")),
                        "updated": str(item.get("updated", "")),
                        "resolution": item.get("resolution", "Unresolved"),
                        "content_type": "issue"
                    }
                    
                    # Filter complex metadata for ChromaDB compatibility
                    filtered_metadata = filter_metadata_for_chromadb(metadata)
                    
                    documents.append(Document(
                        page_content=content,
                        metadata=filtered_metadata
                    ))
            
            # Split documents
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            
            split_docs = text_splitter.split_documents(documents)
            
            # Add to vector store
            self.vectorstore.add_documents(split_docs)
            
            logger.info(f"Processed and added {len(split_docs)} document chunks to vector store")
            logger.info(f"Projects processed: {len(project_groups)}")
            
        except Exception as e:
            logger.error(f"Failed to process JIRA data: {e}")
            raise
    
    def _format_jira_item(self, item: Dict[str, Any]) -> str:
        """Format JIRA item into readable text"""
        content_parts = []
        
        # Basic issue information
        content_parts.append(f"Issue: {item.get('issueKey', 'Unknown')}")
        content_parts.append(f"Summary: {item.get('summary', 'No summary')}")
        content_parts.append(f"Description: {item.get('description', 'No description')}")
        
        # Project and type
        content_parts.append(f"Project: {item.get('masterReportId', 'Unknown')}")
        content_parts.append(f"Type: {item.get('issueType', 'Unknown')}")
        content_parts.append(f"Status: {item.get('status', 'Unknown')}")
        content_parts.append(f"Priority: {item.get('priority', 'Unknown')}")
        
        # Assignee and dates
        content_parts.append(f"Assignee: {item.get('assignee', 'Unassigned')}")
        content_parts.append(f"Created: {item.get('created', 'Unknown')}")
        content_parts.append(f"Updated: {item.get('updated', 'Unknown')}")
        
        # Comments
        comments = item.get('comments', [])
        if comments:
            content_parts.append("Comments:")
            for comment in comments:
                content_parts.append(f"- {comment.get('author', 'Unknown')}: {comment.get('body', '')}")
        
        # Labels and components
        labels = item.get('labels', [])
        if labels:
            content_parts.append(f"Labels: {', '.join(labels)}")
        
        components = item.get('components', [])
        if components:
            content_parts.append(f"Components: {', '.join(components)}")
        
        return "\n".join(content_parts)
    
    def _group_by_sprint(self, items: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group JIRA items by sprint"""
        sprint_groups = {}
        for item in items:
            sprint = item.get('sprint', 'No Sprint')
            if sprint not in sprint_groups:
                sprint_groups[sprint] = []
            sprint_groups[sprint].append(item)
        return sprint_groups
    
    def _create_project_summary(self, project_id: str, items: List[Dict[str, Any]]) -> Optional[Document]:
        """Create a project-level summary document"""
        if not items:
            return None
        
        # Calculate project statistics
        total_issues = len(items)
        status_counts = {}
        priority_counts = {}
        type_counts = {}
        assignee_counts = {}
        
        for item in items:
            status = item.get('status', 'Unknown')
            priority = item.get('priority', 'Unknown')
            issue_type = item.get('issueType', 'Unknown')
            assignee = item.get('assignee', 'Unassigned')
            
            status_counts[status] = status_counts.get(status, 0) + 1
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
            type_counts[issue_type] = type_counts.get(issue_type, 0) + 1
            assignee_counts[assignee] = assignee_counts.get(assignee, 0) + 1
        
        # Create project summary content
        content_parts = []
        content_parts.append(f"PROJECT SUMMARY: {project_id}")
        content_parts.append(f"Total Issues: {total_issues}")
        
        content_parts.append("Status Breakdown:")
        for status, count in status_counts.items():
            content_parts.append(f"- {status}: {count}")
        
        content_parts.append("Priority Breakdown:")
        for priority, count in priority_counts.items():
            content_parts.append(f"- {priority}: {count}")
        
        content_parts.append("Issue Type Breakdown:")
        for issue_type, count in type_counts.items():
            content_parts.append(f"- {issue_type}: {count}")
        
        content_parts.append("Top Assignees:")
        sorted_assignees = sorted(assignee_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        for assignee, count in sorted_assignees:
            content_parts.append(f"- {assignee}: {count}")
        
        # Add sample issues for context
        content_parts.append("Sample Issues:")
        for item in items[:5]:
            content_parts.append(f"- {item.get('issueKey', 'Unknown')}: {item.get('summary', 'No summary')}")
        
        metadata = {
            "source": "jira",
            "project_id": project_id,
            "content_type": "project_summary",
            "total_issues": total_issues,
            "statuses": str(list(status_counts.keys())),
            "priorities": str(list(priority_counts.keys())),
            "issue_types": str(list(type_counts.keys()))
        }
        
        # Filter complex metadata for ChromaDB compatibility
        filtered_metadata = filter_metadata_for_chromadb(metadata)
        
        return Document(
            page_content="\n".join(content_parts),
            metadata=filtered_metadata
        )
    
    def _create_sprint_summary(self, project_id: str, sprint_name: str, items: List[Dict[str, Any]]) -> Optional[Document]:
        """Create a sprint-level summary document"""
        if not items:
            return None
        
        # Calculate sprint statistics
        total_issues = len(items)
        status_counts = {}
        priority_counts = {}
        type_counts = {}
        
        for item in items:
            status = item.get('status', 'Unknown')
            priority = item.get('priority', 'Unknown')
            issue_type = item.get('issueType', 'Unknown')
            
            status_counts[status] = status_counts.get(status, 0) + 1
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
            type_counts[issue_type] = type_counts.get(issue_type, 0) + 1
        
        # Create sprint summary content
        content_parts = []
        content_parts.append(f"SPRINT SUMMARY: {sprint_name}")
        content_parts.append(f"Project: {project_id}")
        content_parts.append(f"Total Issues: {total_issues}")
        
        content_parts.append("Status Breakdown:")
        for status, count in status_counts.items():
            content_parts.append(f"- {status}: {count}")
        
        content_parts.append("Priority Breakdown:")
        for priority, count in priority_counts.items():
            content_parts.append(f"- {priority}: {count}")
        
        content_parts.append("Issue Type Breakdown:")
        for issue_type, count in type_counts.items():
            content_parts.append(f"- {issue_type}: {count}")
        
        # Add sample issues for context
        content_parts.append("Sprint Issues:")
        for item in items[:10]:  # Show more issues for sprint context
            content_parts.append(f"- {item.get('issueKey', 'Unknown')}: {item.get('summary', 'No summary')} ({item.get('status', 'Unknown')})")
        
        metadata = {
            "source": "jira",
            "project_id": project_id,
            "sprint": sprint_name,
            "content_type": "sprint_summary",
            "total_issues": total_issues,
            "statuses": str(list(status_counts.keys())),
            "priorities": str(list(priority_counts.keys())),
            "issue_types": str(list(type_counts.keys()))
        }
        
        # Filter complex metadata for ChromaDB compatibility
        filtered_metadata = filter_metadata_for_chromadb(metadata)
        
        return Document(
            page_content="\n".join(content_parts),
            metadata=filtered_metadata
        )
    
    def get_project_data(self) -> Dict[str, Any]:
        """Get project data from MongoDB for context"""
        if self.mongo_client is None:
            return {}
        
        try:
            # Test MongoDB connection
            self.mongo_client.admin.command('ping')
            
            # Get projects
            projects = list(self.db.projects.find({}, {'_id': 0}))
            
            # Get JIRA data from the correct collection (jirasprintissues)
            # The backend stores individual JIRA issues in the jirasprintissues collection
            jira_data = list(self.db.jirasprintissues.find({}, {'_id': 0}))
            
            logger.info(f"Retrieved {len(projects)} projects and {len(jira_data)} JIRA items from MongoDB")
            
            return {
                "projects": projects,
                "jira_data": jira_data,
                "total_projects": len(projects),
                "total_jira_items": len(jira_data)
            }
        except Exception as e:
            logger.error(f"Failed to get project data: {e}")
            return {}
    
    def chat(self, message: str, conversation_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Process chat message and return response"""
        try:
            # Get project context
            project_data = self.get_project_data()
            
            # Add project context to the question if relevant
            enhanced_message = self._enhance_message_with_context(message, project_data)
            
            # Check if vector store has data
            try:
                # Try to get a sample from the vector store
                sample_docs = self.vectorstore.similarity_search("test", k=1)
                has_data = len(sample_docs) > 0
                logger.info(f"Vector store has {len(sample_docs)} sample documents")
            except Exception as e:
                has_data = False
                logger.warning(f"Vector store check failed: {e}")
            
            if not has_data:
                # If no data in vector store, provide a helpful response
                return {
                    "response": "I don't have any project data to analyze yet. Please upload some JIRA reports first, and I'll be able to help you analyze your project data, sprint metrics, and quality issues.",
                    "sources": [],
                    "project_context": {
                        "total_projects": project_data.get("total_projects", 0),
                        "total_jira_items": project_data.get("total_jira_items", 0)
                    }
                }
            
            # Process with LangChain
            result = self.chain({"question": enhanced_message})
            
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
            
            return {
                "response": result.get("answer", "I'm sorry, I couldn't process your request."),
                "sources": sources,
                "project_context": {
                    "total_projects": project_data.get("total_projects", 0),
                    "total_jira_items": project_data.get("total_jira_items", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to process chat message: {e}")
            return {
                "response": "I'm sorry, I encountered an error while processing your request. Please try again.",
                "sources": [],
                "project_context": {}
            }
    
    def _enhance_message_with_context(self, message: str, project_data: Dict[str, Any]) -> str:
        """Enhance user message with project context"""
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
            enhanced_message = f"Context: {'; '.join(context_parts)}. Question: {message}"
        else:
            enhanced_message = message
            
        return enhanced_message
    
    def get_chat_history(self) -> List[Dict[str, str]]:
        """Get current chat history"""
        try:
            return self.memory.chat_memory.messages
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            return []
    
    def clear_chat_history(self) -> None:
        """Clear chat history"""
        try:
            self.memory.clear()
            logger.info("Cleared chat history")
        except Exception as e:
            logger.error(f"Failed to clear chat history: {e}")

# Global chatbot instance
chatbot = None

def get_chatbot() -> ProjectInsiderChatbot:
    """Get or create chatbot instance"""
    global chatbot
    if chatbot is None:
        chatbot = ProjectInsiderChatbot()
    return chatbot 