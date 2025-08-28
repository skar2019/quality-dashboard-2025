from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import os
import sys
import time
import re
from difflib import get_close_matches

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import LangChain components for RAG functionality (exactly as in run_rag_query.py)
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

try:
    from langchain_ollama import Ollama
except ImportError:
    # Fallback to old import if new package not available
    from langchain_community.llms import Ollama

from langchain.docstore.document import Document

# Import the optimized chatbot service
from app.services.chatbot_service_optimized import get_optimized_chatbot

# Performance optimization imports
import torch
import gc
import os
import sys

# Try to import psutil for system monitoring, fallback to basic monitoring if not available
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

logger = logging.getLogger(__name__)

# Log psutil availability after logger is defined
if not HAS_PSUTIL:
    logger.warning("⚠️ psutil not available, using basic performance monitoring")
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# Request/Response models
class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    sprint: Optional[str] = Field(default=None, description="Filter by sprint (e.g., Sprint-1, Sprint-2, Sprint-3)")
    project: Optional[str] = Field(default=None, description="Filter by project (e.g., Adani)")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Bot response")
    sources: List[Dict[str, str]] = Field(default=[], description="Source documents")
    project_context: Dict[str, Any] = Field(default={}, description="Project context")
    query_time: Optional[float] = Field(default=None, description="Query processing time in seconds")

# New data-only models for structured responses
class TaskData(BaseModel):
    id: str = Field(..., description="Task ID")
    title: str = Field(..., description="Task title")
    description: str = Field(..., description="Task description")
    status: str = Field(..., description="Task status")
    priority: str = Field(..., description="Task priority")
    assignee: str = Field(..., description="Task assignee")
    reporter: str = Field(..., description="Task reporter")
    issue_type: str = Field(..., description="Issue type")
    resolution: str = Field(..., description="Resolution status")
    project: str = Field(..., description="Project name")
    sprint: str = Field(..., description="Sprint name")

class ProjectSummary(BaseModel):
    project_name: str = Field(..., description="Project name")
    task_count: int = Field(..., description="Number of tasks")
    completed_tasks: int = Field(..., description="Number of completed tasks")
    in_progress_tasks: int = Field(..., description="Number of in-progress tasks")
    high_priority_tasks: int = Field(..., description="Number of high priority tasks")
    bugs: int = Field(..., description="Number of bugs")

class StructuredChatResponse(BaseModel):
    message_type: str = Field(..., description="Type of response: 'text', 'task_list', 'project_summary'")
    text_response: Optional[str] = Field(None, description="Text response for non-structured queries")
    tasks: Optional[List[TaskData]] = Field(None, description="List of tasks")
    project_summaries: Optional[List[ProjectSummary]] = Field(None, description="Project summaries")
    statistics: Optional[Dict[str, Any]] = Field(None, description="Overall statistics")
    query_time: Optional[float] = Field(None, description="Query processing time")

class ProcessJiraDataRequest(BaseModel):
    jira_data: List[Dict[str, Any]] = Field(..., description="JIRA data to process")

class ProcessJiraDataResponse(BaseModel):
    success: bool = Field(..., description="Processing success status")
    processed_items: int = Field(..., description="Number of items processed")
    processing_time: float = Field(..., description="Processing time in seconds")
    collection_name: str = Field(default="jira_issues_collection", description="Collection name")
    message: str = Field(..., description="Processing message")

# Simple RAG Chat Class (replicating run_rag_query.py logic exactly)
class SimpleRAGChat:
    def __init__(self):
        # Use the same path as in embed_jira_tasks.py and run_rag_query.py
        # Using relative path for better portability
        self.persist_directory = "./jira_tasks_chroma_db"
        
        # Performance optimization: Check for GPU availability
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.gpu_memory = torch.cuda.get_device_properties(0).total_memory if torch.cuda.is_available() else 0
        
        # Performance optimization: Initialize models with optimized parameters
        self.embeddings = OllamaEmbeddings(
            model="nomic-embed-text"
            # Note: OllamaEmbeddings doesn't support device, batch_size, or max_length parameters
            # These optimizations are handled at the system level instead
        )
        
        # Performance optimization: LLM with optimized parameters
        self.llm = Ollama(
            model="llama3",
            # Temperature and sampling optimization for faster responses
            temperature=0.1,  # Lower temperature = faster, more focused responses
            # Note: Some parameters may not be supported by your Ollama version
            # Remove unsupported parameters if they cause errors
        )
        
        # Performance optimization: Vectorstore with optimized settings
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory, 
            embedding_function=self.embeddings, 
            collection_name="project_data"
            # Note: ChromaDB client_settings may vary by version
            # Using default settings for compatibility
        )
        
        # Performance optimization: Memory management
        self._optimize_memory_settings()
        
        # Initialize intelligent text correction system
        self._init_intelligent_corrections()
        
        # Ensure vocabulary is up-to-date on startup
        self._refresh_vocabulary_on_startup()
        
        logger.info(f"✅ Simple RAG Chat initialized with LangChain components (Device: {self.device}, GPU Memory: {self.gpu_memory/1024**3:.1f}GB)")
    
    def _optimize_memory_settings(self):
        """Optimize memory settings for better performance"""
        try:
            # Set PyTorch memory optimization
            if torch.cuda.is_available():
                # GPU memory optimization
                torch.cuda.empty_cache()
                torch.backends.cudnn.benchmark = True  # Optimize CUDNN for speed
                torch.backends.cudnn.deterministic = False  # Allow non-deterministic for speed
                
                # Set memory fraction for Ollama
                gpu_memory_fraction = 0.8  # Use 80% of GPU memory
                torch.cuda.set_per_process_memory_fraction(gpu_memory_fraction)
                
                logger.info(f"🚀 GPU memory optimized: {gpu_memory_fraction*100}% allocation enabled")
            
            # System memory optimization
            if HAS_PSUTIL and hasattr(psutil, 'virtual_memory'):
                memory = psutil.virtual_memory()
                if memory.available < 2 * 1024 * 1024 * 1024:  # Less than 2GB available
                    logger.warning("⚠️ Low memory detected, enabling aggressive garbage collection")
                    gc.set_threshold(100, 5, 5)  # More aggressive GC
                else:
                    gc.set_threshold(700, 10, 10)  # Standard GC
            else:
                # Fallback: use standard GC settings
                gc.set_threshold(700, 10, 10)
                logger.info("ℹ️ Using standard garbage collection settings")
            
            logger.info("✅ Memory optimization completed")
            
        except Exception as e:
            logger.warning(f"⚠️ Memory optimization failed: {e}")
    
    def _refresh_vocabulary_on_startup(self):
        """Refresh vocabulary on system startup to ensure it's current"""
        try:
            logger.info("🔄 Refreshing vocabulary on system startup...")
            self._refresh_dynamic_vocabulary()
            logger.info("✅ Startup vocabulary refresh completed")
        except Exception as e:
            logger.warning(f"⚠️ Could not refresh vocabulary on startup: {e}")
    
    def _ensure_vocabulary_initialized(self):
        """Ensure vocabulary is initialized even if database is empty"""
        try:
            if not hasattr(self, 'dynamic_vocabulary') or not self.dynamic_vocabulary:
                logger.warning("⚠️ Dynamic vocabulary not initialized, initializing now...")
                self._init_intelligent_corrections()
            
            # Check if any vocabulary categories are empty and provide fallbacks
            for category, values in self.dynamic_vocabulary.items():
                if not values:
                    logger.warning(f"⚠️ Empty vocabulary for {category}, adding fallback values")
                    if category == 'priority':
                        self.dynamic_vocabulary[category] = ['high', 'medium', 'low']
                    elif category == 'status':
                        self.dynamic_vocabulary[category] = ['in progress', 'done', 'to do']
                    elif category == 'issue_type':
                        self.dynamic_vocabulary[category] = ['bug', 'story', 'task']
                    elif category == 'assignees':
                        self.dynamic_vocabulary[category] = []
                    elif category == 'projects':
                        self.dynamic_vocabulary[category] = []
                    elif category == 'sprints':
                        self.dynamic_vocabulary[category] = []
            
            # Rebuild known_words if needed
            if not hasattr(self, 'known_words') or not self.known_words:
                self.known_words = []
                for category, words in self.dynamic_vocabulary.items():
                    self.known_words.extend(words)
                    # Add common variations and abbreviations
                    for word in words:
                        if ' ' in word:  # Multi-word terms
                            self.known_words.append(word.replace(' ', ''))
                            self.known_words.append(word.replace(' ', '-'))
                            if len(word.split()) <= 3:
                                abbreviation = ''.join([w[0] for w in word.split()])
                                if len(abbreviation) > 1:
                                    self.known_words.append(abbreviation)
                
                # Add common action words and connectors
                self.known_words.extend([
                    'show', 'list', 'display', 'find', 'search', 'get', 'retrieve',
                    'all', 'some', 'many', 'few', 'none', 'and', 'or', 'with',
                    'assigned', 'to', 'in', 'of', 'the', 'a', 'an'
                ])
            
            logger.info(f"✅ Vocabulary ensured: {len(self.known_words)} known words")
            
        except Exception as e:
            logger.error(f"❌ Error ensuring vocabulary initialization: {e}")
    
    def _refresh_dynamic_vocabulary(self):
        """Refresh dynamic vocabulary from current database state"""
        try:
            logger.info("🔄 Refreshing dynamic vocabulary from database...")
            self._init_intelligent_corrections()
            logger.info("✅ Dynamic vocabulary refreshed successfully")
        except Exception as e:
            logger.error(f"❌ Error refreshing dynamic vocabulary: {e}")
    
    def _init_intelligent_corrections(self):
        """Initialize intelligent text correction system using dynamic learning from data"""
        try:
            # Get actual data from the database to build dynamic vocabulary
            all_docs = self.vectorstore.get()
            
            # Extract real values from the actual data (no hardcoding)
            self.dynamic_vocabulary = {
                'priority': set(),
                'status': set(),
                'issue_type': set(),
                'assignees': set(),
                'projects': set(),
                'sprints': set()
            }
            
            if all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    if metadata.get('priority'):
                        self.dynamic_vocabulary['priority'].add(metadata['priority'].lower())
                    if metadata.get('status'):
                        self.dynamic_vocabulary['status'].add(metadata['status'].lower())
                    if metadata.get('issue_type'):
                        self.dynamic_vocabulary['issue_type'].add(metadata['issue_type'].lower())
                    if metadata.get('assignee'):
                        self.dynamic_vocabulary['assignees'].add(metadata['assignee'].lower())
                    if metadata.get('project_id'):
                        self.dynamic_vocabulary['projects'].add(metadata['project_id'].lower())
                    if metadata.get('sprint_id'):
                        self.dynamic_vocabulary['sprints'].add(metadata['sprint_id'].lower())
            
            # Convert sets to lists for easier processing
            for key in self.dynamic_vocabulary:
                self.dynamic_vocabulary[key] = list(self.dynamic_vocabulary[key])
            
            # Build a comprehensive list of known words for fuzzy matching
            self.known_words = []
            for category, words in self.dynamic_vocabulary.items():
                self.known_words.extend(words)
                # Add common variations and abbreviations
                for word in words:
                    if ' ' in word:  # Multi-word terms
                        self.known_words.append(word.replace(' ', ''))  # Remove spaces
                        self.known_words.append(word.replace(' ', '-'))  # Replace with hyphens
                        # Add first letters of each word
                        if len(word.split()) <= 3:
                            abbreviation = ''.join([w[0] for w in word.split()])
                            if len(abbreviation) > 1:
                                self.known_words.append(abbreviation)
            
            # Add common action words and connectors
            self.known_words.extend([
                'show', 'list', 'display', 'find', 'search', 'get', 'retrieve',
                'all', 'some', 'many', 'few', 'none', 'and', 'or', 'with',
                'assigned', 'to', 'in', 'of', 'the', 'a', 'an'
            ])
            
            logger.info(f"🧠 Dynamic correction system initialized with {len(self.known_words)} known words from actual data")
            logger.info(f"📊 Dynamic vocabulary: {self.dynamic_vocabulary}")
            
            # Ensure vocabulary is properly initialized even if some categories are empty
            self._ensure_vocabulary_initialized()
            
        except Exception as e:
            logger.error(f"❌ Error initializing dynamic corrections: {e}")
            # Fallback to minimal vocabulary
            self.dynamic_vocabulary = {
                'priority': ['high', 'medium', 'low'],
                'status': ['in progress', 'done', 'to do'],
                'issue_type': ['bug', 'story', 'task'],
                'assignees': [],
                'projects': [],
                'sprints': []
            }
            self.known_words = ['high', 'medium', 'low', 'bug', 'story', 'task']
    
    def _intelligent_text_correction(self, text: str) -> str:
        """Intelligently correct text using dynamic vocabulary and fuzzy matching"""
        try:
            if not text or not isinstance(text, str):
                return text
            
            original_text = text
            corrected_text = text.lower().strip()
            
            # Step 1: Use fuzzy matching with dynamic vocabulary
            corrected_text = self._fuzzy_correct_text(corrected_text)
            
            # Step 2: Expand abbreviations based on actual data
            corrected_text = self._expand_dynamic_abbreviations(corrected_text)
            
            # Step 3: Standardize formatting
            corrected_text = self._standardize_formatting(corrected_text)
            
            # Step 4: Remove extra whitespace and normalize
            corrected_text = re.sub(r'\s+', ' ', corrected_text).strip()
            
            # Log corrections if any were made
            if corrected_text != original_text.lower():
                logger.info(f"🔧 Dynamic text correction: '{original_text}' → '{corrected_text}'")
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic text correction: {e}")
            return text
    
    def _fuzzy_correct_text(self, text: str) -> str:
        """Use fuzzy matching to correct text based on dynamic vocabulary"""
        try:
            words = text.split()
            corrected_words = []
            
            for word in words:
                # Clean the word (remove punctuation for matching)
                clean_word = re.sub(r'[^\w\-]', '', word)
                
                if not clean_word:
                    corrected_words.append(word)
                    continue
                
                # Try to find the best match in our dynamic vocabulary
                best_match = self._find_best_dynamic_match(clean_word)
                
                if best_match and best_match != clean_word:
                    # Replace the word with the corrected version
                    corrected_word = word.replace(clean_word, best_match)
                    corrected_words.append(corrected_word)
                    logger.info(f"🔍 Dynamic fuzzy correction: '{clean_word}' → '{best_match}'")
                else:
                    corrected_words.append(word)
            
            return ' '.join(corrected_words)
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic fuzzy text correction: {e}")
            return text
    
    def _find_best_dynamic_match(self, word: str) -> str:
        """Find the best matching word from dynamic vocabulary"""
        try:
            if not word or len(word) < 2:
                return word
            
            # First, try exact matches
            if word in self.known_words:
                return word
            
            # Try fuzzy matching with different cutoffs
            for cutoff in [0.9, 0.8, 0.7, 0.6]:
                matches = get_close_matches(word, self.known_words, n=1, cutoff=cutoff)
                if matches:
                    return matches[0]
            
            # Try partial matching for longer words
            for known_word in self.known_words:
                if len(known_word) > 3 and len(word) > 3:
                    # Check if word is contained in known_word or vice versa
                    if word in known_word or known_word in word:
                        return known_word
            
            return word
            
        except Exception as e:
            logger.error(f"❌ Error finding best dynamic match: {e}")
            return word
    
    def _expand_dynamic_abbreviations(self, text: str) -> str:
        """Intelligently expand abbreviations based on actual data"""
        try:
            corrected_text = text
            
            # Build abbreviation patterns dynamically from actual data
            abbreviation_patterns = {}
            
            # Priority abbreviations
            for priority in self.dynamic_vocabulary['priority']:
                if ' ' in priority:
                    # Create abbreviation from first letters
                    abbr = ''.join([w[0] for w in priority.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = priority
            
            # Status abbreviations
            for status in self.dynamic_vocabulary['status']:
                if ' ' in status:
                    abbr = ''.join([w[0] for w in status.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = status
            
            # Issue type abbreviations
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if len(issue_type) > 3:
                    # Common abbreviations for issue types
                    if issue_type == 'improvement':
                        abbreviation_patterns[r'\bimp\b'] = issue_type
                    elif issue_type == 'story':
                        abbreviation_patterns[r'\bstry\b'] = issue_type
                    elif issue_type == 'epic':
                        abbreviation_patterns[r'\bepc\b'] = issue_type
            
            # Apply all abbreviation patterns
            for pattern, expansion in abbreviation_patterns.items():
                corrected_text = re.sub(pattern, expansion, corrected_text, flags=re.IGNORECASE)
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error expanding dynamic abbreviations: {e}")
            return text
    
    def _standardize_formatting(self, text: str) -> str:
        """Standardize text formatting and remove common issues"""
        try:
            # Remove extra punctuation
            text = re.sub(r'[.!?]+', '.', text)
            
            # Standardize spacing around punctuation
            text = re.sub(r'\s*([,.!?])\s*', r'\1 ', text)
            
            # Fix common formatting issues
            text = text.replace('  ', ' ')  # Double spaces
            text = text.replace(' ,', ',')  # Space before comma
            text = text.replace(' .', '.')  # Space before period
            
            # Standardize priority formats
            text = re.sub(r'\b(hp|h-p|h\s*p)\b', 'high priority', text)
            text = re.sub(r'\b(mp|m-p|m\s*p)\b', 'medium priority', text)
            text = re.sub(r'\b(lp|l-p|l\s*p)\b', 'low priority', text)
            text = re.sub(r'\b(cp|c-p|c\s*p)\b', 'critical priority', text)
            
            # Standardize status formats
            text = re.sub(r'\b(ip|in-p|inp)\b', 'in progress', text)
            text = re.sub(r'\b(td|t-d)\b', 'to do', text)
            text = re.sub(r'\b(dn|cmpl|fin)\b', 'done', text)
            
            return text
            
        except Exception as e:
            logger.error(f"❌ Error in formatting standardization: {e}")
            return text
    
    def _sanitize_query(self, query: str) -> str:
        """Sanitize and clean user query using intelligent correction"""
        try:
            if not query or not isinstance(query, str):
                return query
            
            # Apply intelligent text correction
            corrected_query = self._intelligent_text_correction(query)
            
            # Remove potentially harmful characters (keep alphanumeric, spaces, common punctuation)
            sanitized_query = re.sub(r'[^a-zA-Z0-9\s\-_.,!?]', '', corrected_query)
            
            # Normalize whitespace
            sanitized_query = re.sub(r'\s+', ' ', sanitized_query).strip()
            
            # Log sanitization
            if sanitized_query != query:
                logger.info(f"🧹 Query sanitized: '{query}' → '{sanitized_query}'")
            
            return sanitized_query
            
        except Exception as e:
            logger.error(f"❌ Error in query sanitization: {e}")
            return query
    
    def _extract_structured_tasks(self, query: str, sprint_filter: str = None, project_filter: str = None) -> List[TaskData]:
        """Extract structured task data using the working approach from old code"""
        try:
            logger.info(f"🔍 Extracting structured tasks for query: '{query}' with context: Project={project_filter}, Sprint={sprint_filter}")
            
            # Get all documents from the vectorstore (like old code)
            all_docs = self.vectorstore.get()
            filtered_docs = []
            
            # Filter by sprint and project (like old code)
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                
                # Apply project filter
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    continue
                
                # Apply query-based filtering (like old code)
                query_lower = query.lower()
                content_lower = doc.lower()
                
                include = True
                
                # Check for priority-related keywords
                if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high']):
                    if 'priority: high' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
                    if 'priority: medium' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
                    if 'priority: low' not in content_lower:
                        include = False
                
                # Check for status-related keywords
                elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished']):
                    if 'status: done' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['in progress', 'progress']):
                    if 'status: in progress' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['to do', 'todo', 'pending']):
                    if 'status: to do' not in content_lower:
                        include = False
                
                # Check for issue type keywords
                elif any(keyword in query_lower for keyword in ['bug', 'bugs']):
                    if 'issue type: bug' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['story', 'stories']):
                    if 'issue type: story' not in content_lower:
                        include = False
                elif any(keyword in query_lower for keyword in ['task', 'tasks']):
                    if 'issue type: task' not in content_lower:
                        include = False
                
                # If no specific filter matches, include all docs (like old code)
                if include:
                    filtered_docs.append({
                        'content': doc,
                        'metadata': metadata
                    })
            
            logger.info(f"✅ Found {len(filtered_docs)} documents after filtering")
            
            # Convert to structured TaskData objects (like old code)
            tasks = []
            for result in filtered_docs:
                metadata = result['metadata']
                content = result['content']
                
                # Parse title from document content (like old code)
                title = 'Unknown Title'
                if content:
                    # Look for "Title: " in the document content
                    title_match = content.split('Title: ')
                    if len(title_match) > 1:
                        # Extract title until the next newline
                        title_line = title_match[1].split('\n')[0]
                        title = title_line.strip()
                
                # Create TaskData object (like old code)
                task = TaskData(
                    id=metadata.get('task_id', 'Unknown'),
                    title=title,
                    description=content if content else 'No description available',
                    status=metadata.get('status', 'Unknown'),
                    priority=metadata.get('priority', 'Medium'),
                    assignee=metadata.get('assignee', 'Unassigned'),
                    reporter=metadata.get('reporter', 'Unknown'),
                    issue_type=metadata.get('issue_type', 'Task'),
                    resolution=metadata.get('resolution', 'Unresolved'),
                    project=metadata.get('project_id', 'Unknown Project'),
                    sprint=metadata.get('sprint_id', 'Unknown Sprint')
                )
                
                tasks.append(task)
            
            logger.info(f"📊 Converted to {len(tasks)} structured tasks")
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error extracting structured tasks: {str(e)}")
            return []
    
    def get_dynamic_k(self, query: str, sprint_filter: str = None, project_filter: str = None) -> int:
        """Get dynamic k value based on database size and context with performance optimization"""
        try:
            total_docs = len(self.vectorstore.get()['documents'])
            logger.info(f"Total documents in database: {total_docs}")
            
            # Performance optimization: Adjust k based on device and memory
            device_multiplier = 1.5 if self.device == "cuda" else 1.0
            memory_multiplier = 1.2 if self.gpu_memory > 8 * 1024**3 else 1.0  # 8GB+ GPU
            
            # Intelligent k calculation based on context with performance tuning
            if sprint_filter and project_filter:
                # Both filters provided - more targeted results
                base_k = 20  # Reduced from 30 for speed
                dynamic_k = min(int(base_k * device_multiplier * memory_multiplier), total_docs)
                logger.info(f"🚀 Targeted search (Sprint + Project), using k={dynamic_k} (device: {self.device}, memory: {self.gpu_memory/1024**3:.1f}GB)")
            elif sprint_filter:
                # Sprint filter only - moderate results
                base_k = 25  # Reduced from 40 for speed
                dynamic_k = min(int(base_k * device_multiplier * memory_multiplier), total_docs)
                logger.info(f"🚀 Sprint-filtered search, using k={dynamic_k} (device: {self.device}, memory: {self.gpu_memory/1024**3:.1f}GB)")
            elif 'all' in query.lower() or 'list' in query.lower():
                # Show all queries - more results
                base_k = 15  # Reduced from 25 for speed
                dynamic_k = min(int(base_k * device_multiplier * memory_multiplier), total_docs)
                logger.info(f"🚀 'Show all' query, using k={base_k} (device: {self.device}, memory: {self.gpu_memory/1024**3:.1f}GB)")
            else:
                # Default for specific queries
                base_k = 12  # Reduced from 20 for speed
                dynamic_k = min(int(base_k * device_multiplier * memory_multiplier), total_docs)
                logger.info(f"🚀 Default query, using k={dynamic_k} (device: {self.device}, memory: {self.gpu_memory/1024**3:.1f}GB)")
            
            return dynamic_k
                
        except Exception as e:
            logger.error(f"Error calculating dynamic k: {str(e)}")
            return 12  # Reduced fallback for speed
    
    def process_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Process user query using exact logic from run_rag_query.py with performance optimization"""
        try:
            # Performance monitoring start
            start_time = time.time()
            memory_before = 0  # Simplified monitoring without psutil dependency
            
            # Check if this is a simple query that can skip LLM
            if not self._should_use_llm(query):
                logger.info(f"🚀 Simple query detected, using fast path: {query}")
                return self._fast_simple_query(query, sprint_filter, project_filter)
            
            # Get dynamic k value based on database size and query type
            dynamic_k = self.get_dynamic_k(query, sprint_filter)
            logger.info(f"🚀 Processing complex query: {query} with dynamic_k={dynamic_k}, sprint={sprint_filter} (device: {self.device})")
            
            # If sprint filter is specified, get all documents and filter by sprint (exactly as in run_rag_query.py)
            if sprint_filter:
                logger.info(f"Filtering by sprint: {sprint_filter}")
                # Get all documents from the vectorstore
                all_docs = self.vectorstore.get()
                filtered_docs = []
                
                for i, doc in enumerate(all_docs['documents']):
                    metadata = all_docs['metadatas'][i]
                    if metadata.get('sprint_id', '').lower() == sprint_filter.lower():
                        # Create a Document object for the filtered result
                        filtered_docs.append(Document(page_content=doc, metadata=metadata))
                
                # If we have a specific query, filter the sprint results by query content (exactly as in run_rag_query.py)
                if query.lower() != "show all tasks" and query.lower() != "list all tasks":
                    # Filter by query keywords (replicating run_rag_query.py logic exactly)
                    query_lower = query.lower()
                    priority_filtered_docs = []
                    
                    for doc in filtered_docs:
                        content_lower = doc.page_content.lower()
                        # Check for priority-related keywords
                        if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high']):
                            if 'priority: high' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
                            if 'priority: medium' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
                            if 'priority: low' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for status-related keywords
                        elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished']):
                            if 'status: done' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in progress', 'progress']):
                            if 'status: in progress' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['to do', 'todo', 'pending']):
                            if 'status: to do' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in review', 'review']):
                            if 'status: in review' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for issue type keywords
                        elif any(keyword in query_lower for keyword in ['bug', 'bugs']):
                            if 'issue type: bug' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['story', 'stories']):
                            if 'issue type: story' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['task', 'tasks']):
                            if 'issue type: task' in content_lower:
                                priority_filtered_docs.append(doc)
                        else:
                            # If no specific filter matches, include all docs
                            priority_filtered_docs.append(doc)
                    
                    docs = priority_filtered_docs
                else:
                    docs = filtered_docs
                
                logger.info(f"Found {len(docs)} tasks in {sprint_filter}")
            else:
                # Use semantic search for regular queries (exactly as in run_rag_query.py)
                logger.info(f"Using semantic search for query: {query}")
                query_embedding = self.embeddings.embed_query(query)
                docs = self.vectorstore.similarity_search_by_vector(query_embedding, k=dynamic_k)
            
            if not docs:
                return "No tasks found matching the criteria."
            
            # Format context exactly as in run_rag_query.py
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Use the exact same prompt as in run_rag_query.py
            prompt = f"Context:\n{context}\n\nQuery: {query}\nAnswer in a concise manner:"
            response = self.llm.invoke(prompt)
            
            # Add retrieved tasks information (exactly as in run_rag_query.py)
            result = response + "\n\nRetrieved Tasks:\n"
            for doc in docs:
                result += doc.page_content + "\n---\n"
            result += f"\nTotal tasks retrieved: {len(docs)}"
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
    
    def _fast_simple_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Fast path for simple queries without LLM calls"""
        try:
            # Apply intelligent text correction first
            original_query = query
            corrected_query = self._sanitize_query(query)
            
            if corrected_query != original_query:
                logger.info(f"🔧 Fast query corrected: '{original_query}' → '{corrected_query}'")
                query = corrected_query
            
            logger.info(f"🚀 Fast path for simple query: {query}")
            
            # Extract search criteria using fast pattern matching
            search_criteria = self._extract_search_criteria_fast(query)
            
            # Get all documents and filter directly
            all_docs = self.vectorstore.get()
            filtered_docs = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                
                # Apply project filter
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    continue
                
                # Apply search criteria filters
                include = True
                
                # Priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        if priority != priority_criteria.lower():
                            include = False
                
                # Status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if status != status_criteria.lower():
                        include = False
                
                # Issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if issue_type != issue_type_criteria.lower():
                        include = False
                
                # Assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if assignee_criteria.lower() not in assignee:
                        include = False
                
                if include:
                    filtered_docs.append(doc)
            
            # Generate response without LLM
            if not filtered_docs:
                return f"No tasks found matching your criteria: {query}"
            
            # Count by type for better response
            priority_count = len([d for d in filtered_docs if 'priority: high' in d.lower()])
            bug_count = len([d for d in filtered_docs if 'issue type: bug' in d.lower()])
            done_count = len([d for d in filtered_docs if 'status: done' in d.lower()])
            
            response_parts = [f"Found {len(filtered_docs)} tasks matching your criteria."]
            
            if priority_count > 0:
                response_parts.append(f"High priority tasks: {priority_count}")
            if bug_count > 0:
                response_parts.append(f"Bugs: {bug_count}")
            if done_count > 0:
                response_parts.append(f"Completed tasks: {done_count}")
            
            response = " ".join(response_parts)
            logger.info(f"🚀 Fast response generated: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error in fast simple query: {str(e)}")
            return f"Fast query processing failed: {str(e)}"

    def _parse_complex_query_logic(self, query: str) -> dict:
        """Parse complex queries with AND/OR logic for multiple criteria"""
        try:
            query_lower = query.lower().strip()
            parsed_criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": [],
                "logic_operators": [],
                "criteria_groups": []
            }
            
            # Look for explicit AND/OR operators
            if ' and ' in query_lower:
                parsed_criteria["logic_operators"].append("AND")
                # Split by "and" and process each part
                parts = query_lower.split(' and ')
                for part in parts:
                    part_criteria = self._extract_single_criteria(part.strip())
                    if part_criteria:
                        parsed_criteria["criteria_groups"].append(part_criteria)
            
            elif ' or ' in query_lower:
                parsed_criteria["logic_operators"].append("OR")
                # Split by "or" and process each part
                parts = query_lower.split(' or ')
                for part in parts:
                    part_criteria = self._extract_single_criteria(part.strip())
                    if part_criteria:
                        parsed_criteria["criteria_groups"].append(part_criteria)
            
            else:
                # No explicit operators, treat as single criteria
                single_criteria = self._extract_single_criteria(query_lower)
                if single_criteria:
                    parsed_criteria["criteria_groups"].append(single_criteria)
            
            # If we have multiple criteria groups, this is a complex query
            if len(parsed_criteria["criteria_groups"]) > 1:
                logger.info(f"🧠 Complex query detected with {len(parsed_criteria['criteria_groups'])} criteria groups: {parsed_criteria}")
                return parsed_criteria
            else:
                # Single criteria, use simple extraction
                return self._extract_search_criteria_fast(query)
                
        except Exception as e:
            logger.error(f"❌ Error parsing complex query logic: {e}")
            return self._extract_search_criteria_fast(query)
    
    def _extract_single_criteria(self, query_part: str) -> dict:
        """Extract criteria from a single part of a complex query"""
        try:
            criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": []
            }
            
            # Extract priority
            for priority in self.dynamic_vocabulary['priority']:
                if priority in query_part or priority.replace(' ', '') in query_part:
                    criteria["priority"] = priority
                    break
            
            # Extract status
            for status in self.dynamic_vocabulary['status']:
                if status in query_part or status.replace(' ', '') in query_part:
                    criteria["status"] = status
                    break
            
            # Extract issue type
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if issue_type in query_part or issue_type.replace(' ', '') in query_part:
                    criteria["issue_type"] = issue_type
                    break
            
            # Extract assignee
            for assignee in self.dynamic_vocabulary['assignees']:
                if assignee in query_part:
                    criteria["assignee"] = assignee
                    break
            
            # Check if this part has any meaningful criteria
            has_criteria = any([
                criteria["priority"], criteria["status"], 
                criteria["issue_type"], criteria["assignee"]
            ])
            
            return criteria if has_criteria else None
            
        except Exception as e:
            logger.error(f"❌ Error extracting single criteria: {e}")
            return None
    
    def _apply_complex_criteria_filtering(self, search_results: List[dict], complex_criteria: dict) -> List[dict]:
        """Apply complex criteria filtering with AND/OR logic"""
        try:
            if not complex_criteria.get("criteria_groups") or len(complex_criteria["criteria_groups"]) <= 1:
                # Not a complex query, use simple filtering
                return self._apply_intelligent_filtering(search_results, complex_criteria)
            
            logic_operator = complex_criteria.get("logic_operators", ["AND"])[0]
            criteria_groups = complex_criteria["criteria_groups"]
            
            logger.info(f"🧠 Applying complex filtering with {logic_operator} logic for {len(criteria_groups)} criteria groups")
            
            filtered_results = []
            
            for result in search_results:
                metadata = result['metadata']
                include = True
                
                if logic_operator == "AND":
                    # ALL criteria groups must match
                    for criteria_group in criteria_groups:
                        if not self._criteria_group_matches(metadata, criteria_group):
                            include = False
                            break
                
                elif logic_operator == "OR":
                    # ANY criteria group can match
                    include = False
                    for criteria_group in criteria_groups:
                        if self._criteria_group_matches(metadata, criteria_group):
                            include = True
                            break
                
                if include:
                    filtered_results.append(result)
            
            logger.info(f"🧠 Complex filtering result: {len(search_results)} → {len(filtered_results)} results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in complex criteria filtering: {e}")
            return search_results
    
    def _criteria_group_matches(self, metadata: dict, criteria_group: dict) -> bool:
        """Check if metadata matches a specific criteria group"""
        try:
            # Check assignee
            if criteria_group.get('assignee'):
                assignee = metadata.get('assignee', '').lower()
                if criteria_group['assignee'].lower() not in assignee:
                    return False
            
            # Check priority
            if criteria_group.get('priority'):
                priority = metadata.get('priority', '').lower()
                if isinstance(criteria_group['priority'], list):
                    if priority not in [p.lower() for p in criteria_group['priority']]:
                        return False
                else:
                    if priority != criteria_group['priority'].lower():
                        return False
            
            # Check status
            if criteria_group.get('status'):
                status = metadata.get('status', '').lower()
                if status != criteria_group['status'].lower():
                    return False
            
            # Check issue type
            if criteria_group.get('issue_type'):
                issue_type = metadata.get('issue_type', '').lower()
                if issue_type != criteria_group['issue_type'].lower():
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error checking criteria group match: {e}")
            return False
    
    def _refresh_dynamic_vocabulary(self):
        """Refresh dynamic vocabulary from current database state"""
        try:
            logger.info("🔄 Refreshing dynamic vocabulary from database...")
            self._init_intelligent_corrections()
            logger.info("✅ Dynamic vocabulary refreshed successfully")
        except Exception as e:
            logger.error(f"❌ Error refreshing dynamic vocabulary: {e}")
    
    def _init_intelligent_corrections(self):
        """Initialize intelligent text correction system using dynamic learning from data"""
        try:
            # Get actual data from the database to build dynamic vocabulary
            all_docs = self.vectorstore.get()
            
            # Extract real values from the actual data (no hardcoding)
            self.dynamic_vocabulary = {
                'priority': set(),
                'status': set(),
                'issue_type': set(),
                'assignees': set(),
                'projects': set(),
                'sprints': set()
            }
            
            if all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    if metadata.get('priority'):
                        self.dynamic_vocabulary['priority'].add(metadata['priority'].lower())
                    if metadata.get('status'):
                        self.dynamic_vocabulary['status'].add(metadata['status'].lower())
                    if metadata.get('issue_type'):
                        self.dynamic_vocabulary['issue_type'].add(metadata['issue_type'].lower())
                    if metadata.get('assignee'):
                        self.dynamic_vocabulary['assignees'].add(metadata['assignee'].lower())
                    if metadata.get('project_id'):
                        self.dynamic_vocabulary['projects'].add(metadata['project_id'].lower())
                    if metadata.get('sprint_id'):
                        self.dynamic_vocabulary['sprints'].add(metadata['sprint_id'].lower())
            
            # Convert sets to lists for easier processing
            for key in self.dynamic_vocabulary:
                self.dynamic_vocabulary[key] = list(self.dynamic_vocabulary[key])
            
            # Build a comprehensive list of known words for fuzzy matching
            self.known_words = []
            for category, words in self.dynamic_vocabulary.items():
                self.known_words.extend(words)
                # Add common variations and abbreviations
                for word in words:
                    if ' ' in word:  # Multi-word terms
                        self.known_words.append(word.replace(' ', ''))  # Remove spaces
                        self.known_words.append(word.replace(' ', '-'))  # Replace with hyphens
                        # Add first letters of each word
                        if len(word.split()) <= 3:
                            abbreviation = ''.join([w[0] for w in word.split()])
                            if len(abbreviation) > 1:
                                self.known_words.append(abbreviation)
            
            # Add common action words and connectors
            self.known_words.extend([
                'show', 'list', 'display', 'find', 'search', 'get', 'retrieve',
                'all', 'some', 'many', 'few', 'none', 'and', 'or', 'with',
                'assigned', 'to', 'in', 'of', 'the', 'a', 'an'
            ])
            
            logger.info(f"🧠 Dynamic correction system initialized with {len(self.known_words)} known words from actual data")
            logger.info(f"📊 Dynamic vocabulary: {self.dynamic_vocabulary}")
            
            # Ensure vocabulary is properly initialized even if some categories are empty
            self._ensure_vocabulary_initialized()
            
        except Exception as e:
            logger.error(f"❌ Error initializing dynamic corrections: {e}")
            # Fallback to minimal vocabulary
            self.dynamic_vocabulary = {
                'priority': ['high', 'medium', 'low'],
                'status': ['in progress', 'done', 'to do'],
                'issue_type': ['bug', 'story', 'task'],
                'assignees': [],
                'projects': [],
                'sprints': []
            }
            self.known_words = ['high', 'medium', 'low', 'bug', 'story', 'task']
    
    def _intelligent_text_correction(self, text: str) -> str:
        """Intelligently correct text using dynamic vocabulary and fuzzy matching"""
        try:
            if not text or not isinstance(text, str):
                return text
            
            original_text = text
            corrected_text = text.lower().strip()
            
            # Step 1: Use fuzzy matching with dynamic vocabulary
            corrected_text = self._fuzzy_correct_text(corrected_text)
            
            # Step 2: Expand abbreviations based on actual data
            corrected_text = self._expand_dynamic_abbreviations(corrected_text)
            
            # Step 3: Standardize formatting
            corrected_text = self._standardize_formatting(corrected_text)
            
            # Step 4: Remove extra whitespace and normalize
            corrected_text = re.sub(r'\s+', ' ', corrected_text).strip()
            
            # Log corrections if any were made
            if corrected_text != original_text.lower():
                logger.info(f"🔧 Dynamic text correction: '{original_text}' → '{corrected_text}'")
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic text correction: {e}")
            return text
    
    def _fuzzy_correct_text(self, text: str) -> str:
        """Use fuzzy matching to correct text based on dynamic vocabulary"""
        try:
            words = text.split()
            corrected_words = []
            
            for word in words:
                # Clean the word (remove punctuation for matching)
                clean_word = re.sub(r'[^\w\-]', '', word)
                
                if not clean_word:
                    corrected_words.append(word)
                    continue
                
                # Try to find the best match in our dynamic vocabulary
                best_match = self._find_best_dynamic_match(clean_word)
                
                if best_match and best_match != clean_word:
                    # Replace the word with the corrected version
                    corrected_word = word.replace(clean_word, best_match)
                    corrected_words.append(corrected_word)
                    logger.info(f"🔍 Dynamic fuzzy correction: '{clean_word}' → '{best_match}'")
                else:
                    corrected_words.append(word)
            
            return ' '.join(corrected_words)
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic fuzzy text correction: {e}")
            return text
    
    def _find_best_dynamic_match(self, word: str) -> str:
        """Find the best matching word from dynamic vocabulary"""
        try:
            if not word or len(word) < 2:
                return word
            
            # First, try exact matches
            if word in self.known_words:
                return word
            
            # Try fuzzy matching with different cutoffs
            for cutoff in [0.9, 0.8, 0.7, 0.6]:
                matches = get_close_matches(word, self.known_words, n=1, cutoff=cutoff)
                if matches:
                    return matches[0]
            
            # Try partial matching for longer words
            for known_word in self.known_words:
                if len(known_word) > 3 and len(word) > 3:
                    # Check if word is contained in known_word or vice versa
                    if word in known_word or known_word in word:
                        return known_word
            
            return word
            
        except Exception as e:
            logger.error(f"❌ Error finding best dynamic match: {e}")
            return word
    
    def _expand_dynamic_abbreviations(self, text: str) -> str:
        """Intelligently expand abbreviations based on actual data"""
        try:
            corrected_text = text
            
            # Build abbreviation patterns dynamically from actual data
            abbreviation_patterns = {}
            
            # Priority abbreviations
            for priority in self.dynamic_vocabulary['priority']:
                if ' ' in priority:
                    # Create abbreviation from first letters
                    abbr = ''.join([w[0] for w in priority.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = priority
            
            # Status abbreviations
            for status in self.dynamic_vocabulary['status']:
                if ' ' in status:
                    abbr = ''.join([w[0] for w in status.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = status
            
            # Issue type abbreviations
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if len(issue_type) > 3:
                    # Common abbreviations for issue types
                    if issue_type == 'improvement':
                        abbreviation_patterns[r'\bimp\b'] = issue_type
                    elif issue_type == 'story':
                        abbreviation_patterns[r'\bstry\b'] = issue_type
                    elif issue_type == 'epic':
                        abbreviation_patterns[r'\bepc\b'] = issue_type
            
            # Apply all abbreviation patterns
            for pattern, expansion in abbreviation_patterns.items():
                corrected_text = re.sub(pattern, expansion, corrected_text, flags=re.IGNORECASE)
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error expanding dynamic abbreviations: {e}")
            return text
    
    def _standardize_formatting(self, text: str) -> str:
        """Standardize text formatting and remove common issues"""
        try:
            # Remove extra punctuation
            text = re.sub(r'[.!?]+', '.', text)
            
            # Standardize spacing around punctuation
            text = re.sub(r'\s*([,.!?])\s*', r'\1 ', text)
            
            # Fix common formatting issues
            text = text.replace('  ', ' ')  # Double spaces
            text = text.replace(' ,', ',')  # Space before comma
            text = text.replace(' .', '.')  # Space before period
            
            # Standardize priority formats
            text = re.sub(r'\b(hp|h-p|h\s*p)\b', 'high priority', text)
            text = re.sub(r'\b(mp|m-p|m\s*p)\b', 'medium priority', text)
            text = re.sub(r'\b(lp|l-p|l\s*p)\b', 'low priority', text)
            text = re.sub(r'\b(cp|c-p|c\s*p)\b', 'critical priority', text)
            
            # Standardize status formats
            text = re.sub(r'\b(ip|in-p|inp)\b', 'in progress', text)
            text = re.sub(r'\b(td|t-d)\b', 'to do', text)
            text = re.sub(r'\b(dn|cmpl|fin)\b', 'done', text)
            
            return text
            
        except Exception as e:
            logger.error(f"❌ Error in formatting standardization: {e}")
            return text
    
    def _sanitize_query(self, query: str) -> str:
        """Sanitize and clean user query using intelligent correction"""
        try:
            if not query or not isinstance(query, str):
                return query
            
            # Apply intelligent text correction
            corrected_query = self._intelligent_text_correction(query)
            
            # Remove potentially harmful characters (keep alphanumeric, spaces, common punctuation)
            sanitized_query = re.sub(r'[^a-zA-Z0-9\s\-_.,!?]', '', corrected_query)
            
            # Normalize whitespace
            sanitized_query = re.sub(r'\s+', ' ', sanitized_query).strip()
            
            # Log sanitization
            if sanitized_query != query:
                logger.info(f"🧹 Query sanitized: '{query}' → '{sanitized_query}'")
            
            return sanitized_query
            
        except Exception as e:
            logger.error(f"❌ Error in query sanitization: {e}")
            return query
    
    def _extract_search_criteria_fast(self, context_query: str) -> dict:
        """Dynamic fast pattern matching using actual data - no hardcoding"""
        try:
            logger.info(f"🚀 Using dynamic fast pattern matching for: {context_query}")
            
            # Extract the actual query from context
            if ' | query: ' in context_query:
                query = context_query.split(' | query: ')[-1].lower()
            else:
                query = context_query.lower()
            
            criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": []
            }
            
            # Dynamic priority extraction based on actual data
            for priority in self.dynamic_vocabulary['priority']:
                if priority in query or priority.replace(' ', '') in query:
                    criteria["priority"] = priority
                    break
            
            # Handle "all priority" or "priority tasks" (any priority level)
            if any(phrase in query for phrase in ['all priority', 'priority tasks', 'priority task']):
                criteria["priority"] = self.dynamic_vocabulary['priority']
            
            # Dynamic status extraction based on actual data
            for status in self.dynamic_vocabulary['status']:
                if status in query or status.replace(' ', '') in query:
                    criteria["status"] = status
                    break
            
            # Handle synonyms for "done" status
            done_synonyms = ['done', 'completed', 'finished', 'complete', 'fixed', 'resolved']
            if any(synonym in query for synonym in done_synonyms):
                # Find the actual status value from data
                for status in self.dynamic_vocabulary['status']:
                    if any(synonym in status for synonym in done_synonyms):
                        criteria["status"] = status
                        break
            
            # Dynamic issue type extraction based on actual data
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if issue_type in query or issue_type.replace(' ', '') in query:
                    criteria["issue_type"] = issue_type
                    break
            
            # Handle plurals and variations
            if 'bugs' in query and 'bug' in self.dynamic_vocabulary['issue_type']:
                criteria["issue_type"] = 'bug'
            elif 'stories' in query and 'story' in self.dynamic_vocabulary['issue_type']:
                criteria["issue_type"] = 'story'
            
            # Dynamic assignee extraction based on actual data
            for assignee in self.dynamic_vocabulary['assignees']:
                if assignee in query:
                    criteria["assignee"] = assignee
                    break
            
            # Handle patterns like "with [name]", "assigned to [name]"
            assignee_patterns = ['with ', 'assigned to ', 'tasks assigned to ']
            for pattern in assignee_patterns:
                if pattern in query:
                    parts = query.split(pattern)
                    if len(parts) > 1:
                        potential_name = parts[1].split()[0]
                        # Check if this name exists in our actual assignees
                        for assignee in self.dynamic_vocabulary['assignees']:
                            if potential_name in assignee or assignee in potential_name:
                                criteria["assignee"] = assignee
                                break
                        break
            
            # Special handling for "fixed bugs" - ensure both status and issue_type are set
            if any(phrase in query for phrase in ['fixed bugs', 'resolved bugs', 'completed bugs']):
                if criteria["issue_type"] == "bug" and criteria["status"]:
                    # Status is already set, no need to change
                    pass
                elif criteria["issue_type"] == "bug":
                    # Set status to done equivalent
                    for status in self.dynamic_vocabulary['status']:
                        if any(synonym in status for synonym in done_synonyms):
                            criteria["status"] = status
                            break
            
            # Extract additional keywords that might be useful
            words = query.split()
            for word in words:
                word_clean = re.sub(r'[^\w]', '', word)
                if (word_clean and len(word_clean) > 2 and 
                    word_clean not in criteria.values() and
                    word_clean not in self.known_words):
                    criteria["keywords"].append(word_clean)
            
            logger.info(f"✅ Dynamic fast pattern matching result: {criteria}")
            return criteria
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic fast pattern matching: {e}")
            return self._fallback_criteria_extraction(context_query)
    
    def _should_use_llm(self, query: str) -> bool:
        """Dynamically determine if LLM is needed based on query complexity and data patterns"""
        try:
            query_lower = query.lower().strip()
            
            # If query is very short or empty, use LLM for interpretation
            if len(query_lower) < 3:
                logger.info(f"🧠 Short query detected, using LLM for interpretation: '{query}'")
                return True
            
            # Check if query contains complex patterns that need LLM interpretation
            complex_patterns = [
                # Analytical queries
                'why', 'how', 'explain', 'describe', 'analyze', 'analysis',
                'trend', 'pattern', 'bottleneck', 'delay', 'risk', 'issue',
                'performance', 'velocity', 'quality', 'health', 'summary',
                
                # Complex logical operators
                'and', 'or', 'but', 'however', 'although', 'while',
                'except', 'excluding', 'including', 'combine', 'merge',
                
                # Comparative queries
                'compare', 'versus', 'vs', 'difference', 'similar',
                'better', 'worse', 'faster', 'slower', 'higher', 'lower',
                
                # Temporal queries
                'when', 'since', 'until', 'before', 'after', 'during',
                'recent', 'old', 'new', 'updated', 'created', 'modified',
                
                # Quantitative queries
                'how many', 'how much', 'count', 'total', 'average',
                'percentage', 'ratio', 'proportion', 'majority', 'minority'
            ]
            
            # Check for complex patterns
            has_complex_patterns = any(pattern in query_lower for pattern in complex_patterns)
            
            # Check for multiple criteria (indicates complex query)
            criteria_count = 0
            if any(word in query_lower for word in self.dynamic_vocabulary['priority']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['status']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['issue_type']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['assignees']):
                criteria_count += 1
            
            # Check for natural language complexity
            natural_language_indicators = [
                'which', 'what are', 'show me', 'find all', 'get me',
                'can you', 'please', 'would you', 'could you'
            ]
            has_natural_language = any(indicator in query_lower for indicator in natural_language_indicators)
            
            # Decision logic
            needs_llm = (
                has_complex_patterns or 
                criteria_count > 2 or 
                has_natural_language or
                len(query_lower.split()) > 8  # Long queries are usually complex
            )
            
            if needs_llm:
                logger.info(f"🧠 Complex query detected, LLM needed: '{query}' (patterns: {has_complex_patterns}, criteria: {criteria_count}, natural: {has_natural_language})")
            else:
                logger.info(f"🚀 Simple query detected, skipping LLM: '{query}' (criteria: {criteria_count})")
            
            return needs_llm
            
        except Exception as e:
            logger.error(f"❌ Error determining LLM usage: {e}")
            # Default to LLM if there's an error
            return True

    def _fallback_criteria_extraction(self, query: str) -> dict:
        """Dynamic fallback method for extracting search criteria using actual data"""
        query_lower = query.lower()
        
        criteria = {
            "assignee": None,
            "priority": None,
            "status": None,
            "issue_type": None,
            "keywords": []
        }
        
        # Extract assignee using actual data
        for assignee in self.dynamic_vocabulary['assignees']:
            if assignee in query_lower:
                criteria["assignee"] = assignee
                break
        
        # Handle patterns like "with [name]", "assigned to [name]"
        assignee_patterns = ['with ', 'assigned to ', 'tasks assigned to ']
        for pattern in assignee_patterns:
            if pattern in query_lower:
                parts = query_lower.split(pattern)
                if len(parts) > 1:
                    potential_name = parts[1].split()[0]
                    # Check if this name exists in our actual assignees
                    for assignee in self.dynamic_vocabulary['assignees']:
                        if potential_name in assignee or assignee in potential_name:
                            criteria["assignee"] = assignee
                            break
                    break
        
        # Extract priority using actual data
        for priority in self.dynamic_vocabulary['priority']:
            if priority in query_lower or priority.replace(' ', '') in query_lower:
                criteria["priority"] = priority
                break
        
        # Handle "all priority" or "priority tasks" (any priority level)
        if any(phrase in query_lower for phrase in ['priority tasks', 'all priority tasks', 'priority task']):
            criteria["priority"] = self.dynamic_vocabulary['priority']
        
        # Extract status using actual data
        for status in self.dynamic_vocabulary['status']:
            if status in query_lower or status.replace(' ', '') in query_lower:
                criteria["status"] = status
                break
        
        # Handle synonyms for "done" status
        done_synonyms = ['done', 'completed', 'finished', 'complete', 'fixed', 'resolved']
        if any(synonym in query_lower for synonym in done_synonyms):
            # Find the actual status value from data
            for status in self.dynamic_vocabulary['status']:
                if any(synonym in status for synonym in done_synonyms):
                    criteria["status"] = status
                    break
        
        # Extract issue type using actual data
        for issue_type in self.dynamic_vocabulary['issue_type']:
            if issue_type in query_lower or issue_type.replace(' ', '') in query_lower:
                criteria["issue_type"] = issue_type
                break
        
        # Handle plurals and variations
        if 'bugs' in query_lower and 'bug' in self.dynamic_vocabulary['issue_type']:
            criteria["issue_type"] = 'bug'
        elif 'stories' in query_lower and 'story' in self.dynamic_vocabulary['issue_type']:
            criteria["issue_type"] = 'story'
        
        # Special handling for "fixed bugs" - ensure both status and issue_type are set
        if any(phrase in query_lower for phrase in ['fixed bugs', 'resolved bugs', 'completed bugs']):
            if criteria["issue_type"] == "bug" and not criteria["status"]:
                # Set status to done equivalent
                for status in self.dynamic_vocabulary['status']:
                    if any(synonym in status for synonym in done_synonyms):
                        criteria["status"] = status
                        break
        
        logger.info(f"🔄 Dynamic fallback criteria extraction: {criteria}")
        return criteria
    
    def _perform_intelligent_search(self, context_query: str, search_criteria: dict, sprint_filter: str = None, project_filter: str = None) -> List[dict]:
        """Perform intelligent vector search with context awareness"""
        try:
            # Determine search strategy based on context
            if sprint_filter and project_filter:
                # Both filters provided - use targeted search
                logger.info(f"🎯 Using targeted search for Sprint: {sprint_filter}, Project: {project_filter}")
                search_results = self._targeted_search(sprint_filter, project_filter, search_criteria)
            elif sprint_filter or project_filter:
                # One filter provided - use hybrid search
                logger.info(f"🔀 Using hybrid search with filters: Sprint={sprint_filter}, Project={project_filter}")
                search_results = self._hybrid_search(context_query, sprint_filter, project_filter, search_criteria)
            else:
                # No filters - use semantic search
                logger.info(f"🔍 Using semantic search for query: {context_query}")
                search_results = self._semantic_search(context_query, search_criteria)
            
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Error in intelligent search: {e}")
            return []
    
    def _targeted_search(self, sprint_filter: str, project_filter: str, search_criteria: dict) -> List[dict]:
        """Targeted search when both sprint and project are specified"""
        try:
            # Get all documents and filter by exact matches first
            all_docs = self.vectorstore.get()
            filtered_results = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Must match sprint and project exactly
                if (metadata.get('sprint_id', '').lower() == sprint_filter.lower() and 
                    metadata.get('project_id', '').lower() == project_filter.lower()):
                    
                    # Also apply search criteria filters if specified
                    include = True
                    
                    # Apply assignee filter
                    if search_criteria.get('assignee'):
                        assignee = metadata.get('assignee', '').lower()
                        assignee_criteria = search_criteria['assignee']
                        if isinstance(assignee_criteria, list):
                            # Handle list of assignees
                            if not any(criteria.lower() in assignee for criteria in assignee_criteria):
                                include = False
                        else:
                            # Handle single assignee
                            if assignee_criteria.lower() not in assignee:
                                include = False
                    
                    # Apply priority filter
                    if search_criteria.get('priority'):
                        priority = metadata.get('priority', '').lower()
                        priority_criteria = search_criteria['priority']
                        if isinstance(priority_criteria, list):
                            # Handle list of priorities
                            if priority not in [p.lower() for p in priority_criteria]:
                                include = False
                        else:
                            # Handle single priority
                            if priority != priority_criteria.lower():
                                include = False
                    
                    # Apply status filter
                    if search_criteria.get('status'):
                        status = metadata.get('status', '').lower()
                        status_criteria = search_criteria['status']
                        if isinstance(status_criteria, list):
                            # Handle list of statuses
                            if status not in [s.lower() for s in status_criteria]:
                                include = False
                        else:
                            # Handle single status
                            if status != status_criteria.lower():
                                include = False
                    
                    # Apply issue type filter
                    if search_criteria.get('issue_type'):
                        issue_type = metadata.get('issue_type', '').lower()
                        issue_type_criteria = search_criteria['issue_type']
                        if isinstance(issue_type_criteria, list):
                            # Handle list of issue types
                            if issue_type not in [it.lower() for it in issue_type_criteria]:
                                include = False
                        else:
                            # Handle single issue type
                            if issue_type != issue_type_criteria.lower():
                                include = False
                    
                    if include:
                        # Create result object
                        result = {
                            'content': doc,
                            'metadata': metadata,
                            'relevance_score': 1.0  # High relevance for exact matches
                        }
                        filtered_results.append(result)
            
            logger.info(f"🎯 Targeted search found {len(filtered_results)} exact matches with criteria filtering")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in targeted search: {e}")
            return []
    
    def _hybrid_search(self, context_query: str, sprint_filter: str = None, project_filter: str = None, search_criteria: dict = None) -> List[dict]:
        """Hybrid search combining semantic search with metadata filtering"""
        try:
            # Use semantic search first
            search_results = self.vectorstore.similarity_search_with_relevance_scores(
                context_query, 
                k=50  # Get more results for filtering
            )
            
            # Convert to our format
            results = []
            for result, score in search_results:
                results.append({
                    'content': result.page_content,
                    'metadata': result.metadata,
                    'relevance_score': score
                })
            
            # Apply metadata filters
            filtered_results = []
            for result in results:
                metadata = result['metadata']
                include = True
                
                # Apply sprint filter if specified
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    include = False
                
                # Apply project filter if specified
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    include = False
                
                if include:
                    filtered_results.append(result)
            
            # Sort by relevance score
            filtered_results.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            logger.info(f"🔀 Hybrid search found {len(filtered_results)} relevant results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in hybrid search: {e}")
            return []
    
    def _semantic_search(self, context_query: str, search_criteria: dict) -> List[dict]:
        """Pure semantic search when no filters are specified"""
        try:
            search_results = self.vectorstore.similarity_search_with_relevance_scores(
                context_query, 
                k=25
            )
            
            # Convert to our format
            results = []
            for result, score in search_results:
                results.append({
                    'content': result.page_content,
                    'metadata': result.metadata,
                    'relevance_score': score
                })
            
            logger.info(f"🔍 Semantic search found {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error in semantic search: {e}")
            return []
    
    def _apply_intelligent_filtering(self, search_results: List[dict], search_criteria: dict, sprint_filter: str = None, project_filter: str = None) -> List[dict]:
        """Apply intelligent filtering based on LLM-extracted criteria"""
        try:
            if not search_criteria:
                return search_results
            
            filtered_results = []
            
            for result in search_results:
                metadata = result['metadata']
                include = True
                
                # Apply assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if isinstance(assignee_criteria, list):
                        # Handle list of assignees
                        if not any(criteria.lower() in assignee for criteria in assignee_criteria):
                            include = False
                    else:
                        # Handle single assignee
                        if assignee_criteria.lower() not in assignee:
                            include = False
                
                # Apply priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        # Handle list of priorities
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        # Handle single priority
                        if priority != priority_criteria.lower():
                            include = False
                
                # Apply status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if isinstance(status_criteria, list):
                        # Handle list of statuses
                        if status not in [s.lower() for s in status_criteria]:
                            include = False
                    else:
                        # Handle single status
                        if status != status_criteria.lower():
                            include = False
                
                # Apply issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if isinstance(issue_type_criteria, list):
                        # Handle list of issue types
                        if issue_type not in [it.lower() for it in issue_type_criteria]:
                            include = False
                    else:
                        # Handle single issue type
                        if issue_type != issue_type_criteria.lower():
                            include = False
                
                if include:
                    filtered_results.append(result)
            
            # ENSURE PROJECT FILTER IS ALWAYS RESPECTED
            if project_filter:
                project_filtered = []
                for result in filtered_results:
                    metadata = result['metadata']
                    if metadata.get('project_id', '').lower() == project_filter.lower():
                        project_filtered.append(result)
                filtered_results = project_filtered
                logger.info(f"🔒 Project filter enforced in intelligent filtering: {len(filtered_results)} results")
            
            logger.info(f"🧠 Intelligent filtering: {len(search_results)} → {len(filtered_results)} results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in intelligent filtering: {e}")
            return search_results
    
    def _convert_to_structured_tasks(self, search_results: List[dict]) -> List[TaskData]:
        """Convert search results to structured TaskData objects"""
        try:
            tasks = []
            
            for result in search_results:
                metadata = result['metadata']
                content = result['content']
                
                # Parse title from document content
                title = 'Unknown Title'
                if content:
                    # Look for "Title: " in the document content
                    title_match = content.split('Title: ')
                    if len(title_match) > 1:
                        # Extract title until the next newline
                        title_line = title_match[1].split('\n')[0]
                        title = title_line.strip()
                    else:
                        # Fallback: look for "Task ID:" and extract the next line
                        task_id_match = content.split('Task ID: ')
                        if len(task_id_match) > 1:
                            lines = task_id_match[1].split('\n')
                            if len(lines) > 1:
                                title = lines[1].strip()
                
                # Create TaskData object with proper fallbacks
                task = TaskData(
                    id=metadata.get('task_id', 'Unknown'),
                    title=title,
                    description=content if content else 'No description available',
                    status=metadata.get('status', 'Unknown'),
                    priority=metadata.get('priority', 'Medium'),
                    assignee=metadata.get('assignee', 'Unassigned'),
                    reporter=metadata.get('reporter', 'Unknown'),
                    issue_type=metadata.get('issue_type', 'Task'),
                    resolution=metadata.get('resolution', 'Unresolved'),
                    project=metadata.get('project_id', 'Unknown Project'),
                    sprint=metadata.get('sprint_id', 'Unknown Sprint')
                )
                
                tasks.append(task)
            
            logger.info(f"✅ Converted {len(search_results)} search results to {len(tasks)} TaskData objects")
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error converting to structured tasks: {e}")
            return []
    
    def get_dynamic_k(self, query: str, sprint_filter: str = None, project_filter: str = None) -> int:
        """Get dynamic k value based on database size and context"""
        try:
            total_docs = len(self.vectorstore.get()['documents'])
            logger.info(f"Total documents in database: {total_docs}")
            
            # Intelligent k calculation based on context
            if sprint_filter and project_filter:
                # Both filters provided - more targeted results
                dynamic_k = min(30, total_docs)
                logger.info(f"Targeted search (Sprint + Project), using k={dynamic_k}")
            elif sprint_filter:
                # Sprint filter only - moderate results
                dynamic_k = min(40, total_docs)
                logger.info(f"Sprint-filtered search, using k={dynamic_k}")
            elif 'all' in query.lower() or 'list' in query.lower():
                # Show all queries - more results
                dynamic_k = min(25, total_docs)
                logger.info(f"'Show all' query, using k={dynamic_k}")
            else:
                # Default for specific queries
                dynamic_k = min(20, total_docs)
                logger.info(f"Default query, using k={dynamic_k}")
            
            return dynamic_k
                
        except Exception as e:
            logger.error(f"Error calculating dynamic k: {str(e)}")
            return 20  # Fallback to 20
    
    def process_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Process user query using exact logic from run_rag_query.py"""
        try:
            # Check if this is a simple query that can skip LLM
            if not self._should_use_llm(query):
                logger.info(f"🚀 Simple query detected, using fast path: {query}")
                return self._fast_simple_query(query, sprint_filter, project_filter)
            
            # Get dynamic k value based on database size and query type
            dynamic_k = self.get_dynamic_k(query, sprint_filter)
            logger.info(f"Processing complex query: {query} with dynamic_k={dynamic_k}, sprint={sprint_filter}")
            
            # If sprint filter is specified, get all documents and filter by sprint (exactly as in run_rag_query.py)
            if sprint_filter:
                logger.info(f"Filtering by sprint: {sprint_filter}")
                # Get all documents from the vectorstore
                all_docs = self.vectorstore.get()
                filtered_docs = []
                
                for i, doc in enumerate(all_docs['documents']):
                    metadata = all_docs['metadatas'][i]
                    if metadata.get('sprint_id', '').lower() == sprint_filter.lower():
                        # Create a Document object for the filtered result
                        filtered_docs.append(Document(page_content=doc, metadata=metadata))
                
                # If we have a specific query, filter the sprint results by query content (exactly as in run_rag_query.py)
                if query.lower() != "show all tasks" and query.lower() != "list all tasks":
                    # Filter by query keywords (replicating run_rag_query.py logic exactly)
                    query_lower = query.lower()
                    priority_filtered_docs = []
                    
                    for doc in filtered_docs:
                        content_lower = doc.page_content.lower()
                        # Check for priority-related keywords
                        if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high']):
                            if 'priority: high' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
                            if 'priority: medium' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
                            if 'priority: low' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for status-related keywords
                        elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished']):
                            if 'status: done' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in progress', 'progress']):
                            if 'status: in progress' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['to do', 'todo', 'pending']):
                            if 'status: to do' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in review', 'review']):
                            if 'status: in review' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for issue type keywords
                        elif any(keyword in query_lower for keyword in ['bug', 'bugs']):
                            if 'issue type: bug' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['story', 'stories']):
                            if 'issue type: story' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['task', 'tasks']):
                            if 'issue type: task' in content_lower:
                                priority_filtered_docs.append(doc)
                        else:
                            # If no specific filter matches, include all docs
                            priority_filtered_docs.append(doc)
                    
                    docs = priority_filtered_docs
                else:
                    docs = filtered_docs
                
                logger.info(f"Found {len(docs)} tasks in {sprint_filter}")
            else:
                # Use semantic search for regular queries (exactly as in run_rag_query.py)
                logger.info(f"Using semantic search for query: {query}")
                query_embedding = self.embeddings.embed_query(query)
                docs = self.vectorstore.similarity_search_by_vector(query_embedding, k=dynamic_k)
            
            if not docs:
                return "No tasks found matching the criteria."
            
            # Format context exactly as in run_rag_query.py
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Use the exact same prompt as in run_rag_query.py
            prompt = f"Context:\n{context}\n\nQuery: {query}\nAnswer in a concise manner:"
            response = self.llm.invoke(prompt)
            
            # Add retrieved tasks information (exactly as in run_rag_query.py)
            result = response + "\n\nRetrieved Tasks:\n"
            for doc in docs:
                result += doc.page_content + "\n---\n"
            result += f"\nTotal tasks retrieved: {len(docs)}"
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
    
    def _fast_simple_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Fast path for simple queries without LLM calls"""
        try:
            # Apply intelligent text correction first
            original_query = query
            corrected_query = self._sanitize_query(query)
            
            if corrected_query != original_query:
                logger.info(f"🔧 Fast query corrected: '{original_query}' → '{corrected_query}'")
                query = corrected_query
            
            logger.info(f"🚀 Fast path for simple query: {query}")
            
            # Extract search criteria using fast pattern matching
            search_criteria = self._extract_search_criteria_fast(query)
            
            # Get all documents and filter directly
            all_docs = self.vectorstore.get()
            filtered_docs = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                
                # Apply project filter
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    continue
                
                # Apply search criteria filters
                include = True
                
                # Priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        if priority != priority_criteria.lower():
                            include = False
                
                # Status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if status != status_criteria.lower():
                        include = False
                
                # Issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if issue_type != issue_type_criteria.lower():
                        include = False
                
                # Assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if assignee_criteria.lower() not in assignee:
                        include = False
                
                if include:
                    filtered_docs.append(doc)
            
            # Generate response without LLM
            if not filtered_docs:
                return f"No tasks found matching your criteria: {query}"
            
            # Count by type for better response
            priority_count = len([d for d in filtered_docs if 'priority: high' in d.lower()])
            bug_count = len([d for d in filtered_docs if 'issue type: bug' in d.lower()])
            done_count = len([d for d in filtered_docs if 'status: done' in d.lower()])
            
            response_parts = [f"Found {len(filtered_docs)} tasks matching your criteria."]
            
            if priority_count > 0:
                response_parts.append(f"High priority tasks: {priority_count}")
            if bug_count > 0:
                response_parts.append(f"Bugs: {bug_count}")
            if done_count > 0:
                response_parts.append(f"Completed tasks: {done_count}")
            
            response = " ".join(response_parts)
            logger.info(f"🚀 Fast response generated: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error in fast simple query: {str(e)}")
            return f"Fast query processing failed: {str(e)}"

    def _parse_complex_query_logic(self, query: str) -> dict:
        """Parse complex queries with AND/OR logic for multiple criteria"""
        try:
            query_lower = query.lower().strip()
            parsed_criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": [],
                "logic_operators": [],
                "criteria_groups": []
            }
            
            # Look for explicit AND/OR operators
            if ' and ' in query_lower:
                parsed_criteria["logic_operators"].append("AND")
                # Split by "and" and process each part
                parts = query_lower.split(' and ')
                for part in parts:
                    part_criteria = self._extract_single_criteria(part.strip())
                    if part_criteria:
                        parsed_criteria["criteria_groups"].append(part_criteria)
            
            elif ' or ' in query_lower:
                parsed_criteria["logic_operators"].append("OR")
                # Split by "or" and process each part
                parts = query_lower.split(' or ')
                for part in parts:
                    part_criteria = self._extract_single_criteria(part.strip())
                    if part_criteria:
                        parsed_criteria["criteria_groups"].append(part_criteria)
            
            else:
                # No explicit operators, treat as single criteria
                single_criteria = self._extract_single_criteria(query_lower)
                if single_criteria:
                    parsed_criteria["criteria_groups"].append(single_criteria)
            
            # If we have multiple criteria groups, this is a complex query
            if len(parsed_criteria["criteria_groups"]) > 1:
                logger.info(f"🧠 Complex query detected with {len(parsed_criteria['criteria_groups'])} criteria groups: {parsed_criteria}")
                return parsed_criteria
            else:
                # Single criteria, use simple extraction
                return self._extract_search_criteria_fast(query)
                
        except Exception as e:
            logger.error(f"❌ Error parsing complex query logic: {e}")
            return self._extract_search_criteria_fast(query)
    
    def _extract_single_criteria(self, query_part: str) -> dict:
        """Extract criteria from a single part of a complex query"""
        try:
            criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": []
            }
            
            # Extract priority
            for priority in self.dynamic_vocabulary['priority']:
                if priority in query_part or priority.replace(' ', '') in query_part:
                    criteria["priority"] = priority
                    break
            
            # Extract status
            for status in self.dynamic_vocabulary['status']:
                if status in query_part or status.replace(' ', '') in query_part:
                    criteria["status"] = status
                    break
            
            # Extract issue type
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if issue_type in query_part or issue_type.replace(' ', '') in query_part:
                    criteria["issue_type"] = issue_type
                    break
            
            # Extract assignee
            for assignee in self.dynamic_vocabulary['assignees']:
                if assignee in query_part:
                    criteria["assignee"] = assignee
                    break
            
            # Check if this part has any meaningful criteria
            has_criteria = any([
                criteria["priority"], criteria["status"], 
                criteria["issue_type"], criteria["assignee"]
            ])
            
            return criteria if has_criteria else None
            
        except Exception as e:
            logger.error(f"❌ Error extracting single criteria: {e}")
            return None
    
    def _apply_complex_criteria_filtering(self, search_results: List[dict], complex_criteria: dict) -> List[dict]:
        """Apply complex criteria filtering with AND/OR logic"""
        try:
            if not complex_criteria.get("criteria_groups") or len(complex_criteria["criteria_groups"]) <= 1:
                # Not a complex query, use simple filtering
                return self._apply_intelligent_filtering(search_results, complex_criteria)
            
            logic_operator = complex_criteria.get("logic_operators", ["AND"])[0]
            criteria_groups = complex_criteria["criteria_groups"]
            
            logger.info(f"🧠 Applying complex filtering with {logic_operator} logic for {len(criteria_groups)} criteria groups")
            
            filtered_results = []
            
            for result in search_results:
                metadata = result['metadata']
                include = True
                
                if logic_operator == "AND":
                    # ALL criteria groups must match
                    for criteria_group in criteria_groups:
                        if not self._criteria_group_matches(metadata, criteria_group):
                            include = False
                            break
                
                elif logic_operator == "OR":
                    # ANY criteria group can match
                    include = False
                    for criteria_group in criteria_groups:
                        if self._criteria_group_matches(metadata, criteria_group):
                            include = True
                            break
                
                if include:
                    filtered_results.append(result)
            
            logger.info(f"🧠 Complex filtering result: {len(search_results)} → {len(filtered_results)} results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in complex criteria filtering: {e}")
            return search_results
    
    def _criteria_group_matches(self, metadata: dict, criteria_group: dict) -> bool:
        """Check if metadata matches a specific criteria group"""
        try:
            # Check assignee
            if criteria_group.get('assignee'):
                assignee = metadata.get('assignee', '').lower()
                if criteria_group['assignee'].lower() not in assignee:
                    return False
            
            # Check priority
            if criteria_group.get('priority'):
                priority = metadata.get('priority', '').lower()
                if isinstance(criteria_group['priority'], list):
                    if priority not in [p.lower() for p in criteria_group['priority']]:
                        return False
                else:
                    if priority != criteria_group['priority'].lower():
                        return False
            
            # Check status
            if criteria_group.get('status'):
                status = metadata.get('status', '').lower()
                if status != criteria_group['status'].lower():
                    return False
            
            # Check issue type
            if criteria_group.get('issue_type'):
                issue_type = metadata.get('issue_type', '').lower()
                if issue_type != criteria_group['issue_type'].lower():
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error checking criteria group match: {e}")
            return False
    
    def _refresh_dynamic_vocabulary(self):
        """Refresh dynamic vocabulary from current database state"""
        try:
            logger.info("🔄 Refreshing dynamic vocabulary from database...")
            self._init_intelligent_corrections()
            logger.info("✅ Dynamic vocabulary refreshed successfully")
        except Exception as e:
            logger.error(f"❌ Error refreshing dynamic vocabulary: {e}")
    
    def _init_intelligent_corrections(self):
        """Initialize intelligent text correction system using dynamic learning from data"""
        try:
            # Get actual data from the database to build dynamic vocabulary
            all_docs = self.vectorstore.get()
            
            # Extract real values from the actual data (no hardcoding)
            self.dynamic_vocabulary = {
                'priority': set(),
                'status': set(),
                'issue_type': set(),
                'assignees': set(),
                'projects': set(),
                'sprints': set()
            }
            
            if all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    if metadata.get('priority'):
                        self.dynamic_vocabulary['priority'].add(metadata['priority'].lower())
                    if metadata.get('status'):
                        self.dynamic_vocabulary['status'].add(metadata['status'].lower())
                    if metadata.get('issue_type'):
                        self.dynamic_vocabulary['issue_type'].add(metadata['issue_type'].lower())
                    if metadata.get('assignee'):
                        self.dynamic_vocabulary['assignees'].add(metadata['assignee'].lower())
                    if metadata.get('project_id'):
                        self.dynamic_vocabulary['projects'].add(metadata['project_id'].lower())
                    if metadata.get('sprint_id'):
                        self.dynamic_vocabulary['sprints'].add(metadata['sprint_id'].lower())
            
            # Convert sets to lists for easier processing
            for key in self.dynamic_vocabulary:
                self.dynamic_vocabulary[key] = list(self.dynamic_vocabulary[key])
            
            # Build a comprehensive list of known words for fuzzy matching
            self.known_words = []
            for category, words in self.dynamic_vocabulary.items():
                self.known_words.extend(words)
                # Add common variations and abbreviations
                for word in words:
                    if ' ' in word:  # Multi-word terms
                        self.known_words.append(word.replace(' ', ''))  # Remove spaces
                        self.known_words.append(word.replace(' ', '-'))  # Replace with hyphens
                        # Add first letters of each word
                        if len(word.split()) <= 3:
                            abbreviation = ''.join([w[0] for w in word.split()])
                            if len(abbreviation) > 1:
                                self.known_words.append(abbreviation)
            
            # Add common action words and connectors
            self.known_words.extend([
                'show', 'list', 'display', 'find', 'search', 'get', 'retrieve',
                'all', 'some', 'many', 'few', 'none', 'and', 'or', 'with',
                'assigned', 'to', 'in', 'of', 'the', 'a', 'an'
            ])
            
            logger.info(f"🧠 Dynamic correction system initialized with {len(self.known_words)} known words from actual data")
            logger.info(f"📊 Dynamic vocabulary: {self.dynamic_vocabulary}")
            
            # Ensure vocabulary is properly initialized even if some categories are empty
            self._ensure_vocabulary_initialized()
            
        except Exception as e:
            logger.error(f"❌ Error initializing dynamic corrections: {e}")
            # Fallback to minimal vocabulary
            self.dynamic_vocabulary = {
                'priority': ['high', 'medium', 'low'],
                'status': ['in progress', 'done', 'to do'],
                'issue_type': ['bug', 'story', 'task'],
                'assignees': [],
                'projects': [],
                'sprints': []
            }
            self.known_words = ['high', 'medium', 'low', 'bug', 'story', 'task']
    
    def _intelligent_text_correction(self, text: str) -> str:
        """Intelligently correct text using dynamic vocabulary and fuzzy matching"""
        try:
            if not text or not isinstance(text, str):
                return text
            
            original_text = text
            corrected_text = text.lower().strip()
            
            # Step 1: Use fuzzy matching with dynamic vocabulary
            corrected_text = self._fuzzy_correct_text(corrected_text)
            
            # Step 2: Expand abbreviations based on actual data
            corrected_text = self._expand_dynamic_abbreviations(corrected_text)
            
            # Step 3: Standardize formatting
            corrected_text = self._standardize_formatting(corrected_text)
            
            # Step 4: Remove extra whitespace and normalize
            corrected_text = re.sub(r'\s+', ' ', corrected_text).strip()
            
            # Log corrections if any were made
            if corrected_text != original_text.lower():
                logger.info(f"🔧 Dynamic text correction: '{original_text}' → '{corrected_text}'")
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic text correction: {e}")
            return text
    
    def _fuzzy_correct_text(self, text: str) -> str:
        """Use fuzzy matching to correct text based on dynamic vocabulary"""
        try:
            words = text.split()
            corrected_words = []
            
            for word in words:
                # Clean the word (remove punctuation for matching)
                clean_word = re.sub(r'[^\w\-]', '', word)
                
                if not clean_word:
                    corrected_words.append(word)
                    continue
                
                # Try to find the best match in our dynamic vocabulary
                best_match = self._find_best_dynamic_match(clean_word)
                
                if best_match and best_match != clean_word:
                    # Replace the word with the corrected version
                    corrected_word = word.replace(clean_word, best_match)
                    corrected_words.append(corrected_word)
                    logger.info(f"🔍 Dynamic fuzzy correction: '{clean_word}' → '{best_match}'")
                else:
                    corrected_words.append(word)
            
            return ' '.join(corrected_words)
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic fuzzy text correction: {e}")
            return text
    
    def _find_best_dynamic_match(self, word: str) -> str:
        """Find the best matching word from dynamic vocabulary"""
        try:
            if not word or len(word) < 2:
                return word
            
            # First, try exact matches
            if word in self.known_words:
                return word
            
            # Try fuzzy matching with different cutoffs
            for cutoff in [0.9, 0.8, 0.7, 0.6]:
                matches = get_close_matches(word, self.known_words, n=1, cutoff=cutoff)
                if matches:
                    return matches[0]
            
            # Try partial matching for longer words
            for known_word in self.known_words:
                if len(known_word) > 3 and len(word) > 3:
                    # Check if word is contained in known_word or vice versa
                    if word in known_word or known_word in word:
                        return known_word
            
            return word
            
        except Exception as e:
            logger.error(f"❌ Error finding best dynamic match: {e}")
            return word
    
    def _expand_dynamic_abbreviations(self, text: str) -> str:
        """Intelligently expand abbreviations based on actual data"""
        try:
            corrected_text = text
            
            # Build abbreviation patterns dynamically from actual data
            abbreviation_patterns = {}
            
            # Priority abbreviations
            for priority in self.dynamic_vocabulary['priority']:
                if ' ' in priority:
                    # Create abbreviation from first letters
                    abbr = ''.join([w[0] for w in priority.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = priority
            
            # Status abbreviations
            for status in self.dynamic_vocabulary['status']:
                if ' ' in status:
                    abbr = ''.join([w[0] for w in status.split()])
                    if len(abbr) > 1:
                        abbreviation_patterns[rf'\b{abbr}\b'] = status
            
            # Issue type abbreviations
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if len(issue_type) > 3:
                    # Common abbreviations for issue types
                    if issue_type == 'improvement':
                        abbreviation_patterns[r'\bimp\b'] = issue_type
                    elif issue_type == 'story':
                        abbreviation_patterns[r'\bstry\b'] = issue_type
                    elif issue_type == 'epic':
                        abbreviation_patterns[r'\bepc\b'] = issue_type
            
            # Apply all abbreviation patterns
            for pattern, expansion in abbreviation_patterns.items():
                corrected_text = re.sub(pattern, expansion, corrected_text, flags=re.IGNORECASE)
            
            return corrected_text
            
        except Exception as e:
            logger.error(f"❌ Error expanding dynamic abbreviations: {e}")
            return text
    
    def _standardize_formatting(self, text: str) -> str:
        """Standardize text formatting and remove common issues"""
        try:
            # Remove extra punctuation
            text = re.sub(r'[.!?]+', '.', text)
            
            # Standardize spacing around punctuation
            text = re.sub(r'\s*([,.!?])\s*', r'\1 ', text)
            
            # Fix common formatting issues
            text = text.replace('  ', ' ')  # Double spaces
            text = text.replace(' ,', ',')  # Space before comma
            text = text.replace(' .', '.')  # Space before period
            
            # Standardize priority formats
            text = re.sub(r'\b(hp|h-p|h\s*p)\b', 'high priority', text)
            text = re.sub(r'\b(mp|m-p|m\s*p)\b', 'medium priority', text)
            text = re.sub(r'\b(lp|l-p|l\s*p)\b', 'low priority', text)
            text = re.sub(r'\b(cp|c-p|c\s*p)\b', 'critical priority', text)
            
            # Standardize status formats
            text = re.sub(r'\b(ip|in-p|inp)\b', 'in progress', text)
            text = re.sub(r'\b(td|t-d)\b', 'to do', text)
            text = re.sub(r'\b(dn|cmpl|fin)\b', 'done', text)
            
            return text
            
        except Exception as e:
            logger.error(f"❌ Error in formatting standardization: {e}")
            return text
    
    def _sanitize_query(self, query: str) -> str:
        """Sanitize and clean user query using intelligent correction"""
        try:
            if not query or not isinstance(query, str):
                return query
            
            # Apply intelligent text correction
            corrected_query = self._intelligent_text_correction(query)
            
            # Remove potentially harmful characters (keep alphanumeric, spaces, common punctuation)
            sanitized_query = re.sub(r'[^a-zA-Z0-9\s\-_.,!?]', '', corrected_query)
            
            # Normalize whitespace
            sanitized_query = re.sub(r'\s+', ' ', sanitized_query).strip()
            
            # Log sanitization
            if sanitized_query != query:
                logger.info(f"🧹 Query sanitized: '{query}' → '{sanitized_query}'")
            
            return sanitized_query
            
        except Exception as e:
            logger.error(f"❌ Error in query sanitization: {e}")
            return query
    
    def _extract_search_criteria_fast(self, context_query: str) -> dict:
        """Dynamic fast pattern matching using actual data - no hardcoding"""
        try:
            logger.info(f"🚀 Using dynamic fast pattern matching for: {context_query}")
            
            # Extract the actual query from context
            if ' | query: ' in context_query:
                query = context_query.split(' | query: ')[-1].lower()
            else:
                query = context_query.lower()
            
            criteria = {
                "assignee": None,
                "priority": None,
                "status": None,
                "issue_type": None,
                "keywords": []
            }
            
            # Dynamic priority extraction based on actual data
            for priority in self.dynamic_vocabulary['priority']:
                if priority in query or priority.replace(' ', '') in query:
                    criteria["priority"] = priority
                    break
            
            # Handle "all priority" or "priority tasks" (any priority level)
            if any(phrase in query for phrase in ['all priority', 'priority tasks', 'priority task']):
                criteria["priority"] = self.dynamic_vocabulary['priority']
            
            # Dynamic status extraction based on actual data
            for status in self.dynamic_vocabulary['status']:
                if status in query or status.replace(' ', '') in query:
                    criteria["status"] = status
                    break
            
            # Handle synonyms for "done" status
            done_synonyms = ['done', 'completed', 'finished', 'complete', 'fixed', 'resolved']
            if any(synonym in query for synonym in done_synonyms):
                # Find the actual status value from data
                for status in self.dynamic_vocabulary['status']:
                    if any(synonym in status for synonym in done_synonyms):
                        criteria["status"] = status
                        break
            
            # Dynamic issue type extraction based on actual data
            for issue_type in self.dynamic_vocabulary['issue_type']:
                if issue_type in query or issue_type.replace(' ', '') in query:
                    criteria["issue_type"] = issue_type
                    break
            
            # Handle plurals and variations
            if 'bugs' in query and 'bug' in self.dynamic_vocabulary['issue_type']:
                criteria["issue_type"] = 'bug'
            elif 'stories' in query and 'story' in self.dynamic_vocabulary['issue_type']:
                criteria["issue_type"] = 'story'
            
            # Dynamic assignee extraction based on actual data
            for assignee in self.dynamic_vocabulary['assignees']:
                if assignee in query:
                    criteria["assignee"] = assignee
                    break
            
            # Handle patterns like "with [name]", "assigned to [name]"
            assignee_patterns = ['with ', 'assigned to ', 'tasks assigned to ']
            for pattern in assignee_patterns:
                if pattern in query:
                    parts = query.split(pattern)
                    if len(parts) > 1:
                        potential_name = parts[1].split()[0]
                        # Check if this name exists in our actual assignees
                        for assignee in self.dynamic_vocabulary['assignees']:
                            if potential_name in assignee or assignee in potential_name:
                                criteria["assignee"] = assignee
                                break
                        break
            
            # Special handling for "fixed bugs" - ensure both status and issue_type are set
            if any(phrase in query for phrase in ['fixed bugs', 'resolved bugs', 'completed bugs']):
                if criteria["issue_type"] == "bug" and criteria["status"]:
                    # Status is already set, no need to change
                    pass
                elif criteria["issue_type"] == "bug":
                    # Set status to done equivalent
                    for status in self.dynamic_vocabulary['status']:
                        if any(synonym in status for synonym in done_synonyms):
                            criteria["status"] = status
                            break
            
            # Extract additional keywords that might be useful
            words = query.split()
            for word in words:
                word_clean = re.sub(r'[^\w]', '', word)
                if (word_clean and len(word_clean) > 2 and 
                    word_clean not in criteria.values() and
                    word_clean not in self.known_words):
                    criteria["keywords"].append(word_clean)
            
            logger.info(f"✅ Dynamic fast pattern matching result: {criteria}")
            return criteria
            
        except Exception as e:
            logger.error(f"❌ Error in dynamic fast pattern matching: {e}")
            return self._fallback_criteria_extraction(context_query)
    
    def _should_use_llm(self, query: str) -> bool:
        """Dynamically determine if LLM is needed based on query complexity and data patterns"""
        try:
            query_lower = query.lower().strip()
            
            # If query is very short or empty, use LLM for interpretation
            if len(query_lower) < 3:
                logger.info(f"🧠 Short query detected, using LLM for interpretation: '{query}'")
                return True
            
            # Check if query contains complex patterns that need LLM interpretation
            complex_patterns = [
                # Analytical queries
                'why', 'how', 'explain', 'describe', 'analyze', 'analysis',
                'trend', 'pattern', 'bottleneck', 'delay', 'risk', 'issue',
                'performance', 'velocity', 'quality', 'health', 'summary',
                
                # Complex logical operators
                'and', 'or', 'but', 'however', 'although', 'while',
                'except', 'excluding', 'including', 'combine', 'merge',
                
                # Comparative queries
                'compare', 'versus', 'vs', 'difference', 'similar',
                'better', 'worse', 'faster', 'slower', 'higher', 'lower',
                
                # Temporal queries
                'when', 'since', 'until', 'before', 'after', 'during',
                'recent', 'old', 'new', 'updated', 'created', 'modified',
                
                # Quantitative queries
                'how many', 'how much', 'count', 'total', 'average',
                'percentage', 'ratio', 'proportion', 'majority', 'minority'
            ]
            
            # Check for complex patterns
            has_complex_patterns = any(pattern in query_lower for pattern in complex_patterns)
            
            # Check for multiple criteria (indicates complex query)
            criteria_count = 0
            if any(word in query_lower for word in self.dynamic_vocabulary['priority']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['status']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['issue_type']):
                criteria_count += 1
            if any(word in query_lower for word in self.dynamic_vocabulary['assignees']):
                criteria_count += 1
            
            # Check for natural language complexity
            natural_language_indicators = [
                'which', 'what are', 'show me', 'find all', 'get me',
                'can you', 'please', 'would you', 'could you'
            ]
            has_natural_language = any(indicator in query_lower for indicator in natural_language_indicators)
            
            # Decision logic
            needs_llm = (
                has_complex_patterns or 
                criteria_count > 2 or 
                has_natural_language or
                len(query_lower.split()) > 8  # Long queries are usually complex
            )
            
            if needs_llm:
                logger.info(f"🧠 Complex query detected, LLM needed: '{query}' (patterns: {has_complex_patterns}, criteria: {criteria_count}, natural: {has_natural_language})")
            else:
                logger.info(f"🚀 Simple query detected, skipping LLM: '{query}' (criteria: {criteria_count})")
            
            return needs_llm
            
        except Exception as e:
            logger.error(f"❌ Error determining LLM usage: {e}")
            # Default to LLM if there's an error
            return True

    def _fallback_criteria_extraction(self, query: str) -> dict:
        """Dynamic fallback method for extracting search criteria using actual data"""
        query_lower = query.lower()
        
        criteria = {
            "assignee": None,
            "priority": None,
            "status": None,
            "issue_type": None,
            "keywords": []
        }
        
        # Extract assignee using actual data
        for assignee in self.dynamic_vocabulary['assignees']:
            if assignee in query_lower:
                criteria["assignee"] = assignee
                break
        
        # Handle patterns like "with [name]", "assigned to [name]"
        assignee_patterns = ['with ', 'assigned to ', 'tasks assigned to ']
        for pattern in assignee_patterns:
            if pattern in query_lower:
                parts = query_lower.split(pattern)
                if len(parts) > 1:
                    potential_name = parts[1].split()[0]
                    # Check if this name exists in our actual assignees
                    for assignee in self.dynamic_vocabulary['assignees']:
                        if potential_name in assignee or assignee in potential_name:
                            criteria["assignee"] = assignee
                            break
                    break
        
        # Extract priority using actual data
        for priority in self.dynamic_vocabulary['priority']:
            if priority in query_lower or priority.replace(' ', '') in query_lower:
                criteria["priority"] = priority
                break
        
        # Handle "all priority" or "priority tasks" (any priority level)
        if any(phrase in query_lower for phrase in ['priority tasks', 'all priority tasks', 'priority task']):
            criteria["priority"] = self.dynamic_vocabulary['priority']
        
        # Extract status using actual data
        for status in self.dynamic_vocabulary['status']:
            if status in query_lower or status.replace(' ', '') in query_lower:
                criteria["status"] = status
                break
        
        # Handle synonyms for "done" status
        done_synonyms = ['done', 'completed', 'finished', 'complete', 'fixed', 'resolved']
        if any(synonym in query_lower for synonym in done_synonyms):
            # Find the actual status value from data
            for status in self.dynamic_vocabulary['status']:
                if any(synonym in status for synonym in done_synonyms):
                    criteria["status"] = status
                    break
        
        # Extract issue type using actual data
        for issue_type in self.dynamic_vocabulary['issue_type']:
            if issue_type in query_lower or issue_type.replace(' ', '') in query_lower:
                criteria["issue_type"] = issue_type
                break
        
        # Handle plurals and variations
        if 'bugs' in query_lower and 'bug' in self.dynamic_vocabulary['issue_type']:
            criteria["issue_type"] = 'bug'
        elif 'stories' in query_lower and 'story' in self.dynamic_vocabulary['issue_type']:
            criteria["issue_type"] = 'story'
        
        # Special handling for "fixed bugs" - ensure both status and issue_type are set
        if any(phrase in query_lower for phrase in ['fixed bugs', 'resolved bugs', 'completed bugs']):
            if criteria["issue_type"] == "bug" and not criteria["status"]:
                # Set status to done equivalent
                for status in self.dynamic_vocabulary['status']:
                    if any(synonym in status for synonym in done_synonyms):
                        criteria["status"] = status
                        break
        
        logger.info(f"🔄 Dynamic fallback criteria extraction: {criteria}")
        return criteria
    
    def _perform_intelligent_search(self, context_query: str, search_criteria: dict, sprint_filter: str = None, project_filter: str = None) -> List[dict]:
        """Perform intelligent vector search with context awareness"""
        try:
            # Determine search strategy based on context
            if sprint_filter and project_filter:
                # Both filters provided - use targeted search
                logger.info(f"🎯 Using targeted search for Sprint: {sprint_filter}, Project: {project_filter}")
                search_results = self._targeted_search(sprint_filter, project_filter, search_criteria)
            elif sprint_filter or project_filter:
                # One filter provided - use hybrid search
                logger.info(f"🔀 Using hybrid search with filters: Sprint={sprint_filter}, Project={project_filter}")
                search_results = self._hybrid_search(context_query, sprint_filter, project_filter, search_criteria)
            else:
                # No filters - use semantic search
                logger.info(f"🔍 Using semantic search for query: {context_query}")
                search_results = self._semantic_search(context_query, search_criteria)
            
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Error in intelligent search: {e}")
            return []
    
    def _targeted_search(self, sprint_filter: str, project_filter: str, search_criteria: dict) -> List[dict]:
        """Targeted search when both sprint and project are specified"""
        try:
            # Get all documents and filter by exact matches first
            all_docs = self.vectorstore.get()
            filtered_results = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Must match sprint and project exactly
                if (metadata.get('sprint_id', '').lower() == sprint_filter.lower() and 
                    metadata.get('project_id', '').lower() == project_filter.lower()):
                    
                    # Also apply search criteria filters if specified
                    include = True
                    
                    # Apply assignee filter
                    if search_criteria.get('assignee'):
                        assignee = metadata.get('assignee', '').lower()
                        assignee_criteria = search_criteria['assignee']
                        if isinstance(assignee_criteria, list):
                            # Handle list of assignees
                            if not any(criteria.lower() in assignee for criteria in assignee_criteria):
                                include = False
                        else:
                            # Handle single assignee
                            if assignee_criteria.lower() not in assignee:
                                include = False
                    
                    # Apply priority filter
                    if search_criteria.get('priority'):
                        priority = metadata.get('priority', '').lower()
                        priority_criteria = search_criteria['priority']
                        if isinstance(priority_criteria, list):
                            # Handle list of priorities
                            if priority not in [p.lower() for p in priority_criteria]:
                                include = False
                        else:
                            # Handle single priority
                            if priority != priority_criteria.lower():
                                include = False
                    
                    # Apply status filter
                    if search_criteria.get('status'):
                        status = metadata.get('status', '').lower()
                        status_criteria = search_criteria['status']
                        if isinstance(status_criteria, list):
                            # Handle list of statuses
                            if status not in [s.lower() for s in status_criteria]:
                                include = False
                        else:
                            # Handle single status
                            if status != status_criteria.lower():
                                include = False
                    
                    # Apply issue type filter
                    if search_criteria.get('issue_type'):
                        issue_type = metadata.get('issue_type', '').lower()
                        issue_type_criteria = search_criteria['issue_type']
                        if isinstance(issue_type_criteria, list):
                            # Handle list of issue types
                            if issue_type not in [it.lower() for it in issue_type_criteria]:
                                include = False
                        else:
                            # Handle single issue type
                            if issue_type != issue_type_criteria.lower():
                                include = False
                    
                    if include:
                        # Create result object
                        result = {
                            'content': doc,
                            'metadata': metadata,
                            'relevance_score': 1.0  # High relevance for exact matches
                        }
                        filtered_results.append(result)
            
            logger.info(f"🎯 Targeted search found {len(filtered_results)} exact matches with criteria filtering")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in targeted search: {e}")
            return []
    
    def _hybrid_search(self, context_query: str, sprint_filter: str = None, project_filter: str = None, search_criteria: dict = None) -> List[dict]:
        """Hybrid search combining semantic search with metadata filtering"""
        try:
            # Use semantic search first
            search_results = self.vectorstore.similarity_search_with_relevance_scores(
                context_query, 
                k=50  # Get more results for filtering
            )
            
            # Convert to our format
            results = []
            for result, score in search_results:
                results.append({
                    'content': result.page_content,
                    'metadata': result.metadata,
                    'relevance_score': score
                })
            
            # Apply metadata filters
            filtered_results = []
            for result in results:
                metadata = result['metadata']
                include = True
                
                # Apply sprint filter if specified
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    include = False
                
                # Apply project filter if specified
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    include = False
                
                if include:
                    filtered_results.append(result)
            
            # Sort by relevance score
            filtered_results.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            logger.info(f"🔀 Hybrid search found {len(filtered_results)} relevant results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in hybrid search: {e}")
            return []
    
    def _semantic_search(self, context_query: str, search_criteria: dict) -> List[dict]:
        """Pure semantic search when no filters are specified"""
        try:
            search_results = self.vectorstore.similarity_search_with_relevance_scores(
                context_query, 
                k=25
            )
            
            # Convert to our format
            results = []
            for result, score in search_results:
                results.append({
                    'content': result.page_content,
                    'metadata': result.metadata,
                    'relevance_score': score
                })
            
            logger.info(f"🔍 Semantic search found {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error in semantic search: {e}")
            return []
    
    def _apply_intelligent_filtering(self, search_results: List[dict], search_criteria: dict, sprint_filter: str = None, project_filter: str = None) -> List[dict]:
        """Apply intelligent filtering based on LLM-extracted criteria"""
        try:
            if not search_criteria:
                return search_results
            
            filtered_results = []
            
            for result in search_results:
                metadata = result['metadata']
                include = True
                
                # Apply assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if isinstance(assignee_criteria, list):
                        # Handle list of assignees
                        if not any(criteria.lower() in assignee for criteria in assignee_criteria):
                            include = False
                    else:
                        # Handle single assignee
                        if assignee_criteria.lower() not in assignee:
                            include = False
                
                # Apply priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        # Handle list of priorities
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        # Handle single priority
                        if priority != priority_criteria.lower():
                            include = False
                
                # Apply status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if isinstance(status_criteria, list):
                        # Handle list of statuses
                        if status not in [s.lower() for s in status_criteria]:
                            include = False
                    else:
                        # Handle single status
                        if status != status_criteria.lower():
                            include = False
                
                # Apply issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if isinstance(issue_type_criteria, list):
                        # Handle list of issue types
                        if issue_type not in [it.lower() for it in issue_type_criteria]:
                            include = False
                    else:
                        # Handle single issue type
                        if issue_type != issue_type_criteria.lower():
                            include = False
                
                if include:
                    filtered_results.append(result)
            
            # ENSURE PROJECT FILTER IS ALWAYS RESPECTED
            if project_filter:
                project_filtered = []
                for result in filtered_results:
                    metadata = result['metadata']
                    if metadata.get('project_id', '').lower() == project_filter.lower():
                        project_filtered.append(result)
                filtered_results = project_filtered
                logger.info(f"🔒 Project filter enforced in intelligent filtering: {len(filtered_results)} results")
            
            logger.info(f"🧠 Intelligent filtering: {len(search_results)} → {len(filtered_results)} results")
            return filtered_results
            
        except Exception as e:
            logger.error(f"❌ Error in intelligent filtering: {e}")
            return search_results
    
    def _convert_to_structured_tasks(self, search_results: List[dict]) -> List[TaskData]:
        """Convert search results to structured TaskData objects"""
        try:
            tasks = []
            
            for result in search_results:
                metadata = result['metadata']
                content = result['content']
                
                # Parse title from document content
                title = 'Unknown Title'
                if content:
                    # Look for "Title: " in the document content
                    title_match = content.split('Title: ')
                    if len(title_match) > 1:
                        # Extract title until the next newline
                        title_line = title_match[1].split('\n')[0]
                        title = title_line.strip()
                    else:
                        # Fallback: look for "Task ID:" and extract the next line
                        task_id_match = content.split('Task ID: ')
                        if len(task_id_match) > 1:
                            lines = task_id_match[1].split('\n')
                            if len(lines) > 1:
                                title = lines[1].strip()
                
                # Create TaskData object with proper fallbacks
                task = TaskData(
                    id=metadata.get('task_id', 'Unknown'),
                    title=title,
                    description=content if content else 'No description available',
                    status=metadata.get('status', 'Unknown'),
                    priority=metadata.get('priority', 'Medium'),
                    assignee=metadata.get('assignee', 'Unassigned'),
                    reporter=metadata.get('reporter', 'Unknown'),
                    issue_type=metadata.get('issue_type', 'Task'),
                    resolution=metadata.get('resolution', 'Unresolved'),
                    project=metadata.get('project_id', 'Unknown Project'),
                    sprint=metadata.get('sprint_id', 'Unknown Sprint')
                )
                
                tasks.append(task)
            
            logger.info(f"✅ Converted {len(search_results)} search results to {len(tasks)} TaskData objects")
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error converting to structured tasks: {e}")
            return []
    
    def get_dynamic_k(self, query: str, sprint_filter: str = None, project_filter: str = None) -> int:
        """Get dynamic k value based on database size and context"""
        try:
            total_docs = len(self.vectorstore.get()['documents'])
            logger.info(f"Total documents in database: {total_docs}")
            
            # Intelligent k calculation based on context
            if sprint_filter and project_filter:
                # Both filters provided - more targeted results
                dynamic_k = min(30, total_docs)
                logger.info(f"Targeted search (Sprint + Project), using k={dynamic_k}")
            elif sprint_filter:
                # Sprint filter only - moderate results
                dynamic_k = min(40, total_docs)
                logger.info(f"Sprint-filtered search, using k={dynamic_k}")
            elif 'all' in query.lower() or 'list' in query.lower():
                # Show all queries - more results
                dynamic_k = min(25, total_docs)
                logger.info(f"'Show all' query, using k={dynamic_k}")
            else:
                # Default for specific queries
                dynamic_k = min(20, total_docs)
                logger.info(f"Default query, using k={dynamic_k}")
            
            return dynamic_k
                
        except Exception as e:
            logger.error(f"Error calculating dynamic k: {str(e)}")
            return 20  # Fallback to 20
    
    def process_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Process user query using exact logic from run_rag_query.py"""
        try:
            # Check if this is a simple query that can skip LLM
            if not self._should_use_llm(query):
                logger.info(f"🚀 Simple query detected, using fast path: {query}")
                return self._fast_simple_query(query, sprint_filter, project_filter)
            
            # Get dynamic k value based on database size and query type
            dynamic_k = self.get_dynamic_k(query, sprint_filter)
            logger.info(f"Processing complex query: {query} with dynamic_k={dynamic_k}, sprint={sprint_filter}")
            
            # If sprint filter is specified, get all documents and filter by sprint (exactly as in run_rag_query.py)
            if sprint_filter:
                logger.info(f"Filtering by sprint: {sprint_filter}")
                # Get all documents from the vectorstore
                all_docs = self.vectorstore.get()
                filtered_docs = []
                
                for i, doc in enumerate(all_docs['documents']):
                    metadata = all_docs['metadatas'][i]
                    if metadata.get('sprint_id', '').lower() == sprint_filter.lower():
                        # Create a Document object for the filtered result
                        filtered_docs.append(Document(page_content=doc, metadata=metadata))
                
                # If we have a specific query, filter the sprint results by query content (exactly as in run_rag_query.py)
                if query.lower() != "show all tasks" and query.lower() != "list all tasks":
                    # Filter by query keywords (replicating run_rag_query.py logic exactly)
                    query_lower = query.lower()
                    priority_filtered_docs = []
                    
                    for doc in filtered_docs:
                        content_lower = doc.page_content.lower()
                        # Check for priority-related keywords
                        if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high']):
                            if 'priority: high' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
                            if 'priority: medium' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
                            if 'priority: low' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for status-related keywords
                        elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished']):
                            if 'status: done' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in progress', 'progress']):
                            if 'status: in progress' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['to do', 'todo', 'pending']):
                            if 'status: to do' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['in review', 'review']):
                            if 'status: in review' in content_lower:
                                priority_filtered_docs.append(doc)
                        # Check for issue type keywords
                        elif any(keyword in query_lower for keyword in ['bug', 'bugs']):
                            if 'issue type: bug' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['story', 'stories']):
                            if 'issue type: story' in content_lower:
                                priority_filtered_docs.append(doc)
                        elif any(keyword in query_lower for keyword in ['task', 'tasks']):
                            if 'issue type: task' in content_lower:
                                priority_filtered_docs.append(doc)
                        else:
                            # If no specific filter matches, include all docs
                            priority_filtered_docs.append(doc)
                    
                    docs = priority_filtered_docs
                else:
                    docs = filtered_docs
                
                logger.info(f"Found {len(docs)} tasks in {sprint_filter}")
            else:
                # Use semantic search for regular queries (exactly as in run_rag_query.py)
                logger.info(f"Using semantic search for query: {query}")
                query_embedding = self.embeddings.embed_query(query)
                docs = self.vectorstore.similarity_search_by_vector(query_embedding, k=dynamic_k)
            
            if not docs:
                return "No tasks found matching the criteria."
            
            # Format context exactly as in run_rag_query.py
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Use the exact same prompt as in run_rag_query.py
            prompt = f"Context:\n{context}\n\nQuery: {query}\nAnswer in a concise manner:"
            response = self.llm.invoke(prompt)
            
            # Add retrieved tasks information (exactly as in run_rag_query.py)
            result = response + "\n\nRetrieved Tasks:\n"
            for doc in docs:
                result += doc.page_content + "\n---\n"
            result += f"\nTotal tasks retrieved: {len(docs)}"
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
    
    def _fast_simple_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Fast path for simple queries without LLM calls"""
        try:
            # Apply intelligent text correction first
            original_query = query
            corrected_query = self._sanitize_query(query)
            
            if corrected_query != original_query:
                logger.info(f"🔧 Fast query corrected: '{original_query}' → '{corrected_query}'")
                query = corrected_query
            
            logger.info(f"🚀 Fast path for simple query: {query}")
            
            # Extract search criteria using fast pattern matching
            search_criteria = self._extract_search_criteria_fast(query)
            
            # Get all documents and filter directly
            all_docs = self.vectorstore.get()
            filtered_docs = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                
                # Apply project filter
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    continue
                
                # Apply search criteria filters
                include = True
                
                # Priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        if priority != priority_criteria.lower():
                            include = False
                
                # Status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if status != status_criteria.lower():
                        include = False
                
                # Issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if issue_type != issue_type_criteria.lower():
                        include = False
                
                # Assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if assignee_criteria.lower() not in assignee:
                        include = False
                
                if include:
                    filtered_docs.append(doc)
            
            # Generate response without LLM
            if not filtered_docs:
                return f"No tasks found matching your criteria: {query}"
            
            # Count by type for better response
            priority_count = len([d for d in filtered_docs if 'priority: high' in d.lower()])
            bug_count = len([d for d in filtered_docs if 'issue type: bug' in d.lower()])
            done_count = len([d for d in filtered_docs if 'status: done' in d.lower()])
            
            response_parts = [f"Found {len(filtered_docs)} tasks matching your criteria."]
            
            if priority_count > 0:
                response_parts.append(f"High priority tasks: {priority_count}")
            if bug_count > 0:
                response_parts.append(f"Bugs: {bug_count}")
            if done_count > 0:
                response_parts.append(f"Completed tasks: {done_count}")
            
            response = " ".join(response_parts)
            logger.info(f"🚀 Fast response generated: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error in fast simple query: {str(e)}")
            return f"Fast query processing failed: {str(e)}"

    def _extract_search_criteria_with_llm(self, context_query: str) -> dict:
        """Use Llama 3 to intelligently extract search criteria from the query"""
        try:
            # Create a prompt for the LLM to extract search criteria
            prompt = f"""
            Analyze this search query and extract search criteria in JSON format:
            
            Query: {context_query}
            
            Extract the following information:
            - assignee: person name if mentioned (e.g., "bob.wilson", "john.doe", "alice.jones", "sarah.lee", "emma.wilson")
            - priority: priority level if mentioned (e.g., "high", "medium", "low", "critical")
            - status: status if mentioned (e.g., "in progress", "in-process", "done", "completed", "to do")
            - issue_type: issue type if mentioned (e.g., "bug", "bugs", "story", "epic", "improvement")
            - keywords: any other important keywords
            
            Important: 
            - "in-process" means "in progress" status
            - "completed" means "done" status
            - "critical" means "high" priority
            - "bugs" means "bug" issue type
            - "priority tasks" or "all priority tasks" means tasks with ANY priority level (high, medium, low, critical)
            - "high priority tasks" means only high/critical priority
            - "medium priority tasks" means only medium priority
            - "low priority tasks" means only low priority
            - "fixed" means only with status "done"
            - "fixed bugs" means bugs with status "done" 
            - "resolved bugs" means bugs with status "done"
            - "completed bugs" means bugs with status "done"
            
            Examples:
            - "What are the completed bugs?" → {{"status": "done", "issue_type": "bug"}}
            - "find the fixed bugs" → {{"status": "done", "issue_type": "bug"}}
            - "resolved bugs" → {{"status": "done", "issue_type": "bug"}}
            - "completed bugs" → {{"status": "done", "issue_type": "bug"}}
            - "high priority tasks" → {{"priority": "high"}}
            - "high priority bugs" → {{"priority": "high", "issue_type": "bug"}}
            - "all priority tasks" → {{"priority": ["high", "medium", "low", "critical"]}}
            - "priority tasks" → {{"priority": ["high", "medium", "low", "critical"]}}
            - "in progress with john.doe" → {{"status": "in progress", "assignee": "john.doe"}}
            - "alice.jones" → {{"assignee": "alice.jones"}}
            - "tasks assigned to sarah.lee" → {{"assignee": "sarah.lee"}}
            
            Return only valid JSON like this:
            {{
                "assignee": "bob.wilson",
                "priority": "high",
                "status": "in progress",
                "issue_type": "bug",
                "keywords": ["login", "error"]
            }}
            
            If a field is not mentioned, use null. Only return the JSON, no other text.
            """
            
            # Get LLM response
            response = self.llm.invoke(prompt)
            logger.info(f"🧠 LLM response: {response}")
            
            # Log the prompt for debugging
            logger.info(f"📝 LLM prompt sent: {prompt}")
            
            # Try to extract JSON from response
            try:
                import json
                # Clean the response to extract JSON
                response_text = str(response).strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                criteria = json.loads(response_text.strip())
                logger.info(f"✅ Successfully parsed LLM criteria: {criteria}")
                return criteria
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ Failed to parse LLM JSON response: {e}")
                # Fallback to keyword-based extraction
                return self._fallback_criteria_extraction(context_query)
                
        except Exception as e:
            logger.error(f"❌ Error extracting search criteria with LLM: {e}")
            # Fallback to keyword-based extraction
            return self._fallback_criteria_extraction(context_query)
    
    def _build_context_aware_query(self, query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Build a context-aware query for LLM processing"""
        try:
            context_parts = []
            
            # Add the original query
            context_parts.append(f"Query: {query}")
            
            # Add sprint context if specified
            if sprint_filter:
                context_parts.append(f"Sprint: {sprint_filter}")
            
            # Add project context if specified
            if project_filter:
                context_parts.append(f"Project: {project_filter}")
            
            # Combine all context parts
            context_query = " | ".join(context_parts)
            logger.info(f"🔧 Built context-aware query: '{context_query}'")
            return context_query
            
        except Exception as e:
            logger.error(f"❌ Error building context-aware query: {e}")
            return query
    
    def extract_structured_tasks(self, query: str, sprint_filter: str = None, project_filter: str = None) -> List[TaskData]:
        """Extract structured task data using intelligent criteria extraction"""
        try:
            logger.info(f"🔍 Extracting structured tasks for query: '{query}' with context: Project={project_filter}, Sprint={sprint_filter}")
            
            # Step 1: Build context-aware search query
            context_query = self._build_context_aware_query(query, sprint_filter, project_filter)
            logger.info(f"📝 Context-aware query: '{context_query}'")
            
            # Step 2: Use LLM to extract search criteria for complex queries
            search_criteria = self._extract_search_criteria_with_llm(context_query)
            logger.info(f"🧠 LLM extracted search criteria: {search_criteria}")
            
            # Step 3: Get all documents and apply intelligent filtering
            all_docs = self.vectorstore.get()
            filtered_docs = []
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                
                # Apply project filter
                if project_filter and metadata.get('project_id', '').lower() != project_filter.lower():
                    continue
                
                # Apply LLM-extracted criteria filters
                include = True
                
                # Apply priority filter
                if search_criteria.get('priority'):
                    priority = metadata.get('priority', '').lower()
                    priority_criteria = search_criteria['priority']
                    if isinstance(priority_criteria, list):
                        if priority not in [p.lower() for p in priority_criteria]:
                            include = False
                    else:
                        if priority != priority_criteria.lower():
                            include = False
                
                # Apply status filter
                if search_criteria.get('status'):
                    status = metadata.get('status', '').lower()
                    status_criteria = search_criteria['status']
                    if status != status_criteria.lower():
                        include = False
                
                # Apply issue type filter
                if search_criteria.get('issue_type'):
                    issue_type = metadata.get('issue_type', '').lower()
                    issue_type_criteria = search_criteria['issue_type']
                    if issue_type != issue_type_criteria.lower():
                        include = False
                
                # Apply assignee filter
                if search_criteria.get('assignee'):
                    assignee = metadata.get('assignee', '').lower()
                    assignee_criteria = search_criteria['assignee']
                    if assignee_criteria.lower() not in assignee:
                        include = False
                
                if include:
                    filtered_docs.append({
                        'content': doc,
                        'metadata': metadata
                    })
            
            logger.info(f"✅ Found {len(filtered_docs)} documents after intelligent filtering")
            
            # Convert to structured TaskData objects
            tasks = []
            for result in filtered_docs:
                metadata = result['metadata']
                content = result['content']
                
                # Parse title from document content
                title = 'Unknown Title'
                if content:
                    # Look for "Title: " in the document content
                    title_match = content.split('Title: ')
                    if len(title_match) > 1:
                        # Extract title until the next newline
                        title_line = title_match[1].split('\n')[0]
                        title = title_line.strip()
                
                # Create TaskData object
                task = TaskData(
                    id=metadata.get('task_id', 'Unknown'),
                    title=title,
                    description=content if content else 'No description available',
                    status=metadata.get('status', 'Unknown'),
                    priority=metadata.get('priority', 'Medium'),
                    assignee=metadata.get('assignee', 'Unassigned'),
                    reporter=metadata.get('reporter', 'Unknown'),
                    issue_type=metadata.get('issue_type', 'Task'),
                    resolution=metadata.get('resolution', 'Unresolved'),
                    project=metadata.get('project_id', 'Unknown Project'),
                    sprint=metadata.get('sprint_id', 'Unknown Sprint')
                )
                
                tasks.append(task)
            
            logger.info(f"📊 Converted to {len(tasks)} structured tasks")
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error extracting structured tasks: {str(e)}")
            return []

# Global RAG instance
_rag_instance = None

def get_rag_instance():
    """Get or create RAG instance"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = SimpleRAGChat()
    return _rag_instance

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process chat message and return response"""
    try:
        start_time = time.time()
        logger.info(f"Processing chat message: {request.message}")
        
        # Get RAG instance and process query
        rag_instance = get_rag_instance()
        response = rag_instance.process_query(
            request.message, 
            sprint_filter=request.sprint,
            project_filter=request.project
        )
        
        query_time = time.time() - start_time
        logger.info(f"Query processed in {query_time:.2f}s")
        
        result = {
            "response": response,
            "sources": [],
            "project_context": {
                "total_projects": 0,
                "total_jira_items": 0
            },
            "query_time": query_time
        }
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )

@router.post("/data", response_model=StructuredChatResponse)
async def get_structured_data(request: ChatRequest):
    """Get structured data response instead of formatted text"""
    try:
        start_time = time.time()
        logger.info(f"🚀 Processing structured data request: {request.message}")
        
        # Performance tracking
        llm_start_time = None
        llm_time = 0
        
        # Get RAG instance
        rag_instance = get_rag_instance()
        
        # Apply intelligent text correction to the incoming message
        original_message = request.message
        corrected_message = rag_instance._sanitize_query(request.message)
        
        if corrected_message != original_message:
            logger.info(f"🔧 Incoming message corrected: '{original_message}' → '{corrected_message}'")
            request.message = corrected_message
        
        # Check if this is a task-related query
        query_lower = request.message.lower()
        is_task_query = any(keyword in query_lower for keyword in [
            'task', 'tasks', 'sprint', 'show', 'list', 'all', 'bug', 'story', 'issue'
        ])
        
        if is_task_query:
            # Check if we need LLM for this query
            if rag_instance._should_use_llm(request.message):
                # Complex query: Use LLM for text response
                logger.info(f"🧠 Complex query detected, using LLM: {request.message}")
                llm_start_time = time.time()
                llm_response = rag_instance.process_query(
                    request.message,
                    sprint_filter=request.sprint,
                    project_filter=request.project
                )
                llm_time = time.time() - llm_start_time
                logger.info(f"🧠 LLM processing time: {llm_time:.2f}s")
            else:
                # Simple query: Skip LLM, generate response directly
                logger.info(f"🚀 Simple query detected, skipping LLM: {request.message}")
                llm_response = f"Found tasks matching your criteria: {request.message}"
                llm_time = 0
            
            # Extract structured task data for the frontend (this will use fast pattern matching)
            tasks = rag_instance.extract_structured_tasks(
                request.message,
                sprint_filter=request.sprint,
                project_filter=request.project
            )
            
            # Calculate statistics
            total_tasks = len(tasks)
            completed_tasks = len([t for t in tasks if t.status.lower() == 'done'])
            in_progress_tasks = len([t for t in tasks if t.status.lower() == 'in progress'])
            high_priority_tasks = len([t for t in tasks if t.priority.lower() == 'high' or t.priority.lower() == 'critical'])
            bugs = len([t for t in tasks if t.issue_type.lower() == 'bug'])
            
            # Group tasks by project
            project_tasks = {}
            for task in tasks:
                if task.project not in project_tasks:
                    project_tasks[task.project] = []
                project_tasks[task.project].append(task)
            
            # Create project summaries
            project_summaries = []
            for project_name, project_task_list in project_tasks.items():
                project_summaries.append(ProjectSummary(
                    project_name=project_name,
                    task_count=len(project_task_list),
                    completed_tasks=len([t for t in project_task_list if t.status.lower() == 'done']),
                    in_progress_tasks=len([t for t in project_task_list if t.status.lower() == 'in progress']),
                    high_priority_tasks=len([t for t in project_task_list if t.priority.lower() in ['high', 'critical']]),
                    bugs=len([t for t in project_task_list if t.issue_type.lower() == 'bug'])
                ))
            
            query_time = time.time() - start_time
            
            # Log performance summary
            if llm_time > 0:
                logger.info(f"🧠 Task query completed with LLM: Total={query_time:.2f}s, LLM={llm_time:.2f}s, Other={query_time-llm_time:.2f}s")
            else:
                logger.info(f"🚀 Task query completed without LLM: Total={query_time:.2f}s (LLM skipped)")
            
            return StructuredChatResponse(
                message_type="task_list",
                text_response=llm_response,  # Include LLM response
                tasks=tasks,
                project_summaries=project_summaries,
                statistics={
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "in_progress_tasks": in_progress_tasks,
                    "high_priority_tasks": high_priority_tasks,
                    "bugs": bugs
                },
                query_time=query_time
            )
        else:
            # For non-task queries, check if LLM is needed
            if rag_instance._should_use_llm(request.message):
                # Complex query: Use LLM
                logger.info(f"🧠 Complex non-task query, using LLM: {request.message}")
                llm_start_time = time.time()
                response = rag_instance.process_query(
                    request.message,
                    sprint_filter=request.sprint,
                    project_filter=request.project
                )
                llm_time = time.time() - llm_start_time
                logger.info(f"🧠 LLM processing time: {llm_time:.2f}s")
            else:
                # Simple query: Generate response directly
                logger.info(f"🚀 Simple non-task query, skipping LLM: {request.message}")
                response = f"Processing your request: {request.message}"
                llm_time = 0
            
            query_time = time.time() - start_time
            
            # Log performance summary
            if llm_time > 0:
                logger.info(f"🧠 Query completed with LLM: Total={query_time:.2f}s, LLM={llm_time:.2f}s, Other={query_time-llm_time:.2f}s")
            else:
                logger.info(f"🚀 Query completed without LLM: Total={query_time:.2f}s (LLM skipped)")
            
            return StructuredChatResponse(
                message_type="text",
                text_response=response,
                query_time=query_time
            )
        
    except Exception as e:
        logger.error(f"Error in structured data endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process structured data request: {str(e)}"
        )

@router.get("/status")
async def get_status():
    """Get system status"""
    try:
        return {
            "status": "healthy",
            "model": "llama3",
            "embedding_model": "nomic-embed-text",
            "vectorstore": "ChromaDB",
            "simple_implementation": True
        }
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@router.get("/debug/database")
async def debug_database():
    """Debug endpoint to see what's in the database"""
    try:
        rag_instance = get_rag_instance()
        
        # Get all documents from the vectorstore
        all_docs = rag_instance.vectorstore.get()
        
        return {
            "total_documents": len(all_docs['documents']) if all_docs['documents'] else 0,
            "sample_documents": all_docs['documents'][:3] if all_docs['documents'] else [],
            "sample_metadatas": all_docs['metadatas'][:3] if all_docs['metadatas'] else []
        }
        
    except Exception as e:
        logger.error(f"Error debugging database: {e}")
        return {"error": str(e)}

@router.get("/embedding-count")
async def get_embedding_count():
    """Get the number of records in the embedding database"""
    try:
        rag_instance = get_rag_instance()
        
        # Get all documents from the vectorstore
        all_docs = rag_instance.vectorstore.get()
        total_documents = len(all_docs['documents']) if all_docs['documents'] else 0
        
        # Get unique projects and sprints for additional info
        projects = set()
        sprints = set()
        issue_types = set()
        statuses = set()
        
        if all_docs['metadatas']:
            for metadata in all_docs['metadatas']:
                if metadata.get('project_id'):
                    projects.add(metadata['project_id'])
                if metadata.get('sprint_id'):
                    sprints.add(metadata['sprint_id'])
                if metadata.get('issue_type'):
                    issue_types.add(metadata['issue_type'])
                if metadata.get('status'):
                    statuses.add(metadata['status'])
        
        return {
            "success": True,
            "total_documents": total_documents,
            "persist_directory": rag_instance.persist_directory,
            "statistics": {
                "unique_projects": len(projects),
                "unique_sprints": len(sprints),
                "unique_issue_types": len(issue_types),
                "unique_statuses": len(statuses)
            },
            "projects": list(projects),
            "sprints": list(sprints),
            "issue_types": list(issue_types),
            "statuses": list(statuses)
        }
        
    except Exception as e:
        logger.error(f"Error getting embedding count: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get embedding count: {str(e)}"
        )

@router.get("/embedded-data")
async def get_embedded_data(limit: int = 50, offset: int = 0, project: str = None, sprint: str = None, issue_type: str = None, status: str = None):
    """Get list of embedded data from ChromaDB with optional filtering"""
    try:
        rag_instance = get_rag_instance()
        
        # Get all documents from the vectorstore
        all_docs = rag_instance.vectorstore.get()
        
        if not all_docs['documents']:
            return {
                "success": True,
                "total_documents": 0,
                "documents": [],
                "filters_applied": {
                    "project": project,
                    "sprint": sprint,
                    "issue_type": issue_type,
                    "status": status
                }
            }
        
        # Filter documents based on query parameters
        filtered_docs = []
        for i, doc in enumerate(all_docs['documents']):
            metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
            
            # Apply filters (case-insensitive)
            if project and metadata.get('project_id', '').lower() != project.lower():
                continue
            if sprint and metadata.get('sprint_id', '').lower() != sprint.lower():
                continue
            if issue_type and metadata.get('issue_type', '').lower() != issue_type.lower():
                continue
            if status and metadata.get('status', '').lower() != status.lower():
                continue
            
            # Create document entry
            doc_entry = {
                "index": i,
                "content": doc,
                "metadata": metadata,
                "content_preview": doc[:200] + "..." if len(doc) > 200 else doc
            }
            filtered_docs.append(doc_entry)
        
        # Apply pagination
        total_filtered = len(filtered_docs)
        paginated_docs = filtered_docs[offset:offset + limit]
        
        return {
            "success": True,
            "total_documents": len(all_docs['documents']),
            "total_filtered": total_filtered,
            "documents": paginated_docs,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_filtered,
                "total_pages": (total_filtered + limit - 1) // limit
            },
            "filters_applied": {
                "project": project,
                "sprint": sprint,
                "issue_type": issue_type,
                "status": status
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting embedded data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get embedded data: {str(e)}"
        )

@router.delete("/clear-embeddings")
async def clear_embeddings():
    """Clear all embedding data from the ChromaDB"""
    try:
        rag_instance = get_rag_instance()
        
        # Get current document count
        all_docs = rag_instance.vectorstore.get()
        current_count = len(all_docs['documents']) if all_docs['documents'] else 0
        
        if current_count == 0:
            return {
                "success": True,
                "message": "Database is already empty",
                "documents_cleared": 0,
                "persist_directory": rag_instance.persist_directory
            }
        
        # Clear all documents from the vectorstore
        rag_instance.vectorstore.delete_collection()
        
        # Recreate the collection
        rag_instance.vectorstore = Chroma(
            persist_directory=rag_instance.persist_directory, 
            embedding_function=rag_instance.embeddings,
            collection_name="project_data"
        )
        
        logger.info(f"✅ Cleared {current_count} documents from embedding database")
        
        return {
            "success": True,
            "message": f"Successfully cleared {current_count} documents from embedding database",
            "documents_cleared": current_count,
            "persist_directory": rag_instance.persist_directory
        }
        
    except Exception as e:
        logger.error(f"Error clearing embeddings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear embeddings: {str(e)}"
        )

@router.post("/process-jira-data", response_model=ProcessJiraDataResponse)
async def process_jira_data(request: ProcessJiraDataRequest):
    """
    Process JIRA data and add to vector store for RAG functionality
    Uses the same embedding system as SimpleRAGChat for consistency
    """
    try:
        start_time = time.time()
        logger.info(f"Processing {len(request.jira_data)} JIRA items for RAG embedding")
        
        # Validate data format
        if not request.jira_data or len(request.jira_data) == 0:
            logger.warning("No JIRA data received")
            return ProcessJiraDataResponse(
                success=False,
                processed_items=0,
                processing_time=0.0,
                collection_name="jira_tasks_chroma_db",
                message="No JIRA data received"
            )
        
        # Log sample data for debugging
        if len(request.jira_data) > 0:
            sample_item = request.jira_data[0]
            logger.info(f"Sample data format: {list(sample_item.keys())}")
            logger.info(f"Sample issueKey: {sample_item.get('issueKey', 'Not found')}")
            logger.info(f"Sample projectId: {sample_item.get('projectId', 'Not found')}")
            logger.info(f"Sample sprintId: {sample_item.get('sprintId', 'Not found')}")
        
        # Get the SimpleRAGChat instance to use the same embedding system
        rag_instance = get_rag_instance()
        
        # Process JIRA data using SimpleRAGChat's embedding system
        documents = []
        
        def clean_text(text: str) -> str:
            """Clean and normalize text for better embedding"""
            if not text or not isinstance(text, str):
                return ""
            return text.strip().replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        
        def format_date(date_str: str) -> str:
            """Format date string for consistency"""
            if not date_str or date_str == 'Unknown':
                return 'Unknown'
            try:
                # Try to parse and format the date
                from datetime import datetime
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return parsed_date.strftime('%Y-%m-%d %H:%M:%S')
            except:
                return str(date_str)
        
        for item in request.jira_data:
            try:
                # Extract and clean JIRA item data (matching backend format exactly)
                issue_key = clean_text(item.get('issueKey', 'Unknown'))
                summary = clean_text(item.get('summary', 'No Summary'))
                description = clean_text(item.get('description', 'No Description'))
                issue_type = clean_text(item.get('issueType', 'Unknown'))
                status = clean_text(item.get('status', 'Unknown'))
                priority = clean_text(item.get('priority', 'Unknown'))
                assignee = clean_text(item.get('assignee', 'Unknown'))
                reporter = clean_text(item.get('reporter', 'Unknown'))
                created = format_date(item.get('created', 'Unknown'))
                updated = format_date(item.get('updated', 'Unknown'))
                resolution = clean_text(item.get('resolution', 'Unresolved'))
                project_id = clean_text(item.get('projectId', 'Unknown'))
                sprint_id = clean_text(item.get('sprintId', 'Unknown'))
                
                # Log the received data for debugging
                logger.debug(f"Processing JIRA item: {issue_key} | Project: {project_id} | Sprint: {sprint_id}")
                
                # Skip items with no meaningful content
                if not summary and not description:
                    logger.warning(f"Skipping item {issue_key} - no summary or description")
                    continue
                
                # Create document content exactly as in embed_jira_tasks.py
                content = f"Task ID: {issue_key}\nTitle: {summary}\nDescription: {description}\nStatus: {status}\nPriority: {priority}\nAssignee: {assignee}\nReporter: {reporter}\nIssue Type: {issue_type}\nResolution: {resolution}\nProject: {project_id}\nSprint: {sprint_id}"
                
                # Create metadata exactly as in embed_jira_tasks.py
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
                doc = Document(
                    page_content=content,
                    metadata=metadata
                )
                documents.append(doc)
                
                logger.debug(f"Processed JIRA item: {issue_key} ({len(content)} chars)")
                
            except Exception as e:
                logger.error(f"Error processing JIRA item {item.get('issueKey', 'Unknown')}: {e}")
                continue
        
        # Add documents to SimpleRAGChat's vector store
        if documents:
            logger.info(f"📚 Adding {len(documents)} documents to vector store...")
            
            # Use batch processing for better performance
            batch_size = 50  # Smaller batches for better memory management
            total_added = 0
            failed_batches = 0
            
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                batch_num = i // batch_size + 1
                total_batches = (len(documents) + batch_size - 1) // batch_size
                
                try:
                    rag_instance.vectorstore.add_documents(batch)
                    total_added += len(batch)
                    logger.info(f"✅ Added batch {batch_num}/{total_batches}: {len(batch)} documents")
                except Exception as e:
                    failed_batches += 1
                    logger.error(f"❌ Failed to add batch {batch_num}/{total_batches}: {e}")
                    
                    # Try adding documents individually as fallback
                    individual_success = 0
                    for doc in batch:
                        try:
                            rag_instance.vectorstore.add_documents([doc])
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
        
        # Refresh dynamic vocabulary with new data
        try:
            rag_instance._refresh_dynamic_vocabulary()
            logger.info("🔄 Dynamic vocabulary refreshed with new JIRA data")
        except Exception as e:
            logger.warning(f"⚠️ Could not refresh dynamic vocabulary: {e}")
        
        processing_time = time.time() - start_time
        logger.info(f"JIRA data processing completed in {processing_time:.2f}s")
        
        return ProcessJiraDataResponse(
            success=True,
            processed_items=len(documents),
            processing_time=processing_time,
            collection_name="jira_tasks_chroma_db",
            message=f"Successfully processed {len(documents)} JIRA items for RAG embedding using SimpleRAGChat system"
        )
        
    except Exception as e:
        logger.error(f"Error processing JIRA data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process JIRA data: {str(e)}"
        ) 

@router.get("/debug/rag-test")
async def test_rag_functionality():
    """Test RAG functionality and return sample results"""
    try:
        rag_instance = get_rag_instance()
        
        # Test 1: Check if vectorstore has data
        all_docs = rag_instance.vectorstore.get()
        total_docs = len(all_docs['documents']) if all_docs['documents'] else 0
        
        # Test 2: Test semantic search
        test_query = "sprint tasks"
        semantic_error = None
        try:
            search_results = rag_instance.vectorstore.similarity_search_with_relevance_scores(
                test_query, 
                k=5
            )
            semantic_search_working = len(search_results) > 0
            sample_results = [
                {
                    "content": result[0].page_content[:100] + "...",
                    "metadata": result[0].metadata,
                    "score": result[1]
                }
                for result in search_results[:3]
            ]
        except Exception as e:
            semantic_search_working = False
            sample_results = []
            semantic_error = str(e)
        
        # Test 3: Test structured task extraction
        structured_error = None
        try:
            structured_tasks = rag_instance.extract_structured_tasks(
                "Show me all tasks in Sprint-1",
                sprint_filter="sprint-1"
            )
            structured_extraction_working = len(structured_tasks) > 0
            sample_tasks = [
                {
                    "id": task.id,
                    "title": task.title,
                    "project": task.project,
                    "sprint": task.sprint
                }
                for task in structured_tasks[:3]
            ]
        except Exception as e:
            structured_extraction_working = False
            sample_tasks = []
            structured_error = str(e)
        
        # Test 4: Test LLM call
        llm_error = None
        try:
            llm_response = rag_instance.process_query("What are the main issues in Sprint-1?")
            llm_working = True
            llm_response_preview = llm_response[:200] + "..." if len(llm_response) > 200 else llm_response
            llm_response_length = len(llm_response)
        except Exception as e:
            llm_working = False
            llm_response_preview = ""
            llm_response_length = 0
            llm_error = str(e)
        
        return {
            "rag_status": "healthy",
            "vectorstore": {
                "total_documents": total_docs,
                "has_data": total_docs > 0
            },
            "semantic_search": {
                "working": semantic_search_working,
                "test_query": test_query,
                "sample_results": sample_results,
                "error": semantic_error if not semantic_search_working else None
            },
            "structured_extraction": {
                "working": structured_extraction_working,
                "sample_tasks": sample_tasks,
                "error": structured_error if not structured_extraction_working else None
            },
            "llm_test": {
                "working": llm_working,
                "test_query": "What are the main issues in Sprint-1?",
                "response_preview": llm_response_preview,
                "response_length": llm_response_length,
                "error": llm_error if not llm_working else None
            },
            "models": {
                "embedding_model": "nomic-embed-text",
                "llm_model": "llama3",
                "vectorstore": "ChromaDB"
            }
        }
        
    except Exception as e:
        logger.error(f"Error testing RAG functionality: {e}")
        return {
            "rag_status": "error",
            "error": str(e)
        } 

 