from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import os
import sys
import time

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import LangChain components for RAG functionality (exactly as in run_rag_query.py)
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.docstore.document import Document

# Import the optimized chatbot service
from app.services.chatbot_service_optimized import get_optimized_chatbot

logger = logging.getLogger(__name__)
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
        
        # Initialize models exactly as in run_rag_query.py
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.llm = Ollama(model="llama3")
        self.vectorstore = Chroma(persist_directory=self.persist_directory, embedding_function=self.embeddings, collection_name="project_data")
        
        logger.info("✅ Simple RAG Chat initialized with LangChain components")
    
    def extract_structured_tasks(self, query: str, sprint_filter: str = None, project_filter: str = None) -> List[TaskData]:
        """Extract structured task data using intelligent RAG retrieval with context awareness"""
        try:
            logger.info(f"🔍 Extracting structured tasks for query: '{query}' with context: Project={project_filter}, Sprint={sprint_filter}")
            
            # Step 1: Build context-aware search query
            context_query = self._build_context_aware_query(query, sprint_filter, project_filter)
            logger.info(f"📝 Context-aware query: '{context_query}'")
            
            # Step 2: Use Llama 3 to interpret query intent and extract search criteria
            search_criteria = self._extract_search_criteria_with_llm(context_query)
            logger.info(f"🧠 LLM extracted search criteria: {search_criteria}")
            logger.info(f"🔍 Query: '{query}' → Extracted: {search_criteria}")
            
            # Step 3: Perform intelligent vector search with context
            search_results = self._perform_intelligent_search(context_query, search_criteria, sprint_filter, project_filter)
            logger.info(f"🔎 Found {len(search_results)} relevant documents")
            
            # Step 4: Apply intelligent filtering based on LLM interpretation
            filtered_results = self._apply_intelligent_filtering(search_results, search_criteria, sprint_filter, project_filter)
            
            # Step 4.5: ENSURE PROJECT FILTER IS ALWAYS RESPECTED (CRITICAL FIX)
            if project_filter:
                project_filtered = []
                for result in filtered_results:
                    metadata = result['metadata']
                    if metadata.get('project_id', '').lower() == project_filter.lower():
                        project_filtered.append(result)
                filtered_results = project_filtered
                logger.info(f"🔒 Project filter enforced: {len(filtered_results)} results after project filtering")
            logger.info(f"✅ After intelligent filtering: {len(filtered_results)} documents")
            
            # Step 5: Convert to structured TaskData objects
            tasks = self._convert_to_structured_tasks(filtered_results)
            logger.info(f"📊 Converted to {len(tasks)} structured tasks")
            
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error extracting structured tasks: {str(e)}")
            return []
    
    def _build_context_aware_query(self, user_query: str, sprint_filter: str = None, project_filter: str = None) -> str:
        """Build a context-aware query that combines user input with dropdown context"""
        context_parts = []
        
        # Add project context
        if project_filter:
            context_parts.append(f"project: {project_filter}")
        
        # Add sprint context
        if sprint_filter:
            context_parts.append(f"sprint: {sprint_filter}")
        
        # Add user query
        if user_query.strip():
            context_parts.append(f"query: {user_query}")
        
        # Combine all context
        context_query = " | ".join(context_parts)
        logger.info(f"🔗 Built context query: {context_query}")
        
        return context_query
    
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
    
    def _fallback_criteria_extraction(self, query: str) -> dict:
        """Fallback method for extracting search criteria using keyword matching"""
        query_lower = query.lower()
        
        criteria = {
            "assignee": None,
            "priority": None,
            "status": None,
            "issue_type": None,
            "keywords": []
        }
        
        # Extract assignee (look for patterns like "with bob.wilson", "assigned to john.doe")
        if 'with ' in query_lower:
            parts = query_lower.split('with ')
            if len(parts) > 1:
                assignee = parts[1].split()[0]  # Get first word after "with"
                criteria["assignee"] = assignee
        elif 'assigned to ' in query_lower:
            parts = query_lower.split('assigned to ')
            if len(parts) > 1:
                assignee = parts[1].split()[0]  # Get first word after "assigned to"
                criteria["assignee"] = assignee
        elif 'tasks assigned to ' in query_lower:
            parts = query_lower.split('tasks assigned to ')
            if len(parts) > 1:
                assignee = parts[1].split()[0]  # Get first word after "tasks assigned to"
                criteria["assignee"] = assignee
        # Direct assignee names (common patterns)
        elif any(name in query_lower for name in ['bob.wilson', 'alice.jones', 'david.lee', 'john.doe', 'sarah.lee', 'emma.wilson']):
            for name in ['bob.wilson', 'alice.jones', 'david.lee', 'john.doe', 'sarah.lee', 'emma.wilson']:
                if name in query_lower:
                    criteria["assignee"] = name
                    break
        
        # Extract priority
        if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high', 'critical']):
            criteria["priority"] = "high"
        elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
            criteria["priority"] = "medium"
        elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
            criteria["priority"] = "low"
        elif any(keyword in query_lower for keyword in ['priority tasks', 'all priority tasks', 'priority task']):
            # "priority tasks" means tasks with any priority level
            criteria["priority"] = ["high", "medium", "low", "critical"]
        
        # Extract status
        if any(keyword in query_lower for keyword in ['in progress', 'progress', 'in-process', 'inprocess']):
            criteria["status"] = "in progress"
        elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished', 'complete', 'fixed', 'resolved']):
            criteria["status"] = "done"
        elif any(keyword in query_lower for keyword in ['to do', 'todo', 'open']):
            criteria["status"] = "to do"
        
        # Extract issue type
        if any(keyword in query_lower for keyword in ['bug', 'bugs', 'buggy']):
            criteria["issue_type"] = "bug"
        elif any(keyword in query_lower for keyword in ['story', 'stories']):
            criteria["issue_type"] = "story"
        elif any(keyword in query_lower for keyword in ['epic', 'epics']):
            criteria["issue_type"] = "epic"
        elif any(keyword in query_lower for keyword in ['improvement', 'improvements']):
            criteria["issue_type"] = "improvement"
        
        # Special handling for "fixed bugs" - ensure both status and issue_type are set
        if any(keyword in query_lower for keyword in ['fixed bugs', 'resolved bugs', 'completed bugs']) and criteria["issue_type"] == "bug":
            criteria["status"] = "done"
        
        logger.info(f"🔄 Fallback criteria extraction: {criteria}")
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
            
            return tasks
            
        except Exception as e:
            logger.error(f"❌ Error converting to structured tasks: {e}")
            return []
            
            # All filtering is now handled by the intelligent RAG system above
            # No additional hardcoded filtering needed
            
        except Exception as e:
            logger.error(f"Error extracting structured tasks: {str(e)}")
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
            # Get dynamic k value based on database size and query type
            dynamic_k = self.get_dynamic_k(query, sprint_filter)
            logger.info(f"Processing query: {query} with dynamic_k={dynamic_k}, sprint={sprint_filter}")
            
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
        logger.info(f"Processing structured data request: {request.message}")
        
        # Get RAG instance
        rag_instance = get_rag_instance()
        
        # Check if this is a task-related query
        query_lower = request.message.lower()
        is_task_query = any(keyword in query_lower for keyword in [
            'task', 'tasks', 'sprint', 'show', 'list', 'all', 'bug', 'story', 'issue'
        ])
        
        if is_task_query:
            # First, call the LLM to get a text response (ensuring LLM is used)
            llm_response = rag_instance.process_query(
                request.message,
                sprint_filter=request.sprint,
                project_filter=request.project
            )
            
            # Then extract structured task data for the frontend
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
            # For non-task queries, return text response
            response = rag_instance.process_query(
                request.message,
                sprint_filter=request.sprint,
                project_filter=request.project
            )
            
            query_time = time.time() - start_time
            
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

 