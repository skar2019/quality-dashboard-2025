from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
import os
import sys
import time
import re
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import LangChain components for RAG functionality
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.docstore.document import Document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deep-summary-report", tags=["deep-summary-report"])

# Request/Response models
class DeepAnalysisRequest(BaseModel):
    message: Optional[str] = Field(default=None, description="User message for deep analysis")
    sprint: Optional[str] = Field(default=None, description="Filter by sprint (e.g., Sprint-1, Sprint-2, Sprint-3)")
    project: Optional[str] = Field(default=None, description="Filter by project (e.g., Adani)")
    analysisType: Optional[str] = Field(default="comprehensive", description="Type of analysis: executive, comprehensive, risk, performance, quality, trends, historical, bottleneck, velocity")
    includeRecommendations: Optional[bool] = Field(default=True, description="Include detailed recommendations")
    includePredictions: Optional[bool] = Field(default=True, description="Include predictive insights")

class DeepAnalysisInsight(BaseModel):
    category: str = Field(..., description="Insight category")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed description")
    severity: str = Field(..., description="Severity: low, medium, high, critical")
    impact: str = Field(..., description="Business impact description")
    evidence: List[str] = Field(..., description="Supporting evidence")
    recommendations: List[str] = Field(..., description="Specific recommendations")

class DeepAnalysisMetrics(BaseModel):
    overallHealth: int = Field(..., description="Overall portfolio health score (0-100)")
    riskScore: int = Field(..., description="Risk assessment score (0-100)")
    performanceScore: int = Field(..., description="Performance score (0-100)")
    qualityScore: int = Field(..., description="Quality score (0-100)")
    trendDirection: str = Field(..., description="Trend direction: improving, declining, stable")
    confidenceLevel: str = Field(..., description="Analysis confidence: high, medium, low")

class DeepAnalysisResponse(BaseModel):
    analysisType: str = Field(..., description="Type of analysis performed")
    summary: str = Field(..., description="Executive summary")
    insights: List[DeepAnalysisInsight] = Field(..., description="Key insights")
    metrics: DeepAnalysisMetrics = Field(..., description="Analysis metrics")
    recommendations: List[str] = Field(..., description="Strategic recommendations")
    predictions: List[str] = Field(..., description="Predictive insights")
    actionItems: List[str] = Field(..., description="Immediate action items")
    generatedAt: str = Field(..., description="Generation timestamp")
    analysisTime: float = Field(..., description="Analysis time in seconds")

# Deep Analysis RAG Class
class DeepAnalysisRAG:
    def __init__(self):
        # Use the same path as in other RAG systems
        self.persist_directory = "./jira_tasks_chroma_db"
        
        # Initialize models
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.llm = Ollama(model="llama3")
        self.vectorstore = Chroma(persist_directory=self.persist_directory, embedding_function=self.embeddings, collection_name="project_data")
        
        logger.info("✅ Deep Analysis RAG initialized with LangChain components")
    
    def extract_project_data(self, sprint_filter: str = None, project_filter: str = None) -> Dict[str, Any]:
        """Extract project data from the vectorstore"""
        try:
            # Get all documents from the vectorstore
            all_docs = self.vectorstore.get()
            
            logger.info(f"Debug: Found {len(all_docs.get('documents', []))} documents in vectorstore")
            logger.info(f"Debug: Document keys: {list(all_docs.keys())}")
            logger.info(f"Debug: Applying filters - Sprint: '{sprint_filter}', Project: '{project_filter}'")
            
            if not all_docs.get('documents'):
                logger.info("No documents found in vectorstore")
                return {"projects": {}, "total_docs": 0}
            
            # Get unique projects and sprints from the data for debugging
            unique_projects = set()
            unique_sprints = set()
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                if metadata.get('project_id'):
                    unique_projects.add(metadata['project_id'])
                if metadata.get('sprint_id'):
                    unique_sprints.add(metadata['sprint_id'])
            
            logger.info(f"Debug: Available projects in database: {list(unique_projects)}")
            logger.info(f"Debug: Available sprints in database: {list(unique_sprints)}")
            
            projects_data = {}
            total_docs_processed = 0
            total_docs_filtered = 0
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply sprint filter
                if sprint_filter:
                    sprint_id = metadata.get('sprint_id', '')
                    sprint_filter_lower = sprint_filter.lower()
                    sprint_id_lower = sprint_id.lower()
                    
                    # Handle different sprint formats
                    if (sprint_filter_lower not in sprint_id_lower and 
                        sprint_id_lower not in sprint_filter_lower and
                        sprint_filter_lower.replace('-', '') not in sprint_id_lower.replace('-', '') and
                        sprint_id_lower.replace('-', '') not in sprint_filter_lower.replace('-', '')):
                        logger.debug(f"Sprint filter '{sprint_filter}' doesn't match '{sprint_id}'")
                        total_docs_filtered += 1
                        continue
                    else:
                        logger.debug(f"Sprint filter '{sprint_filter}' matches '{sprint_id}'")
                
                # Apply project filter - be more flexible
                if project_filter:
                    project_id = metadata.get('project_id', '')
                    project_filter_lower = project_filter.lower()
                    project_id_lower = project_id.lower()
                    
                    # If project_filter looks like a MongoDB ObjectId, skip project filtering
                    # (ObjectIds are 24-character hex strings)
                    if len(project_filter) == 24 and all(c in '0123456789abcdef' for c in project_filter.lower()):
                        logger.info(f"Project filter '{project_filter}' appears to be a MongoDB ObjectId, skipping project filtering")
                        # Don't filter by project, include all projects
                        pass
                    else:
                        # Handle different project name formats
                        if (project_filter_lower not in project_id_lower and 
                            project_id_lower not in project_filter_lower):
                            logger.debug(f"Project filter '{project_filter}' doesn't match '{project_id}'")
                            total_docs_filtered += 1
                            continue
                        else:
                            logger.debug(f"Project filter '{project_filter}' matches '{project_id}'")
                
                total_docs_processed += 1
                
                project_id = metadata.get('project_id', 'Unknown')
                sprint_id = metadata.get('sprint_id', 'Unknown')
                
                if project_id not in projects_data:
                    projects_data[project_id] = {
                        'name': project_id,
                        'tasks': [],
                        'sprints': set(),
                        'statuses': {},
                        'priorities': {},
                        'issue_types': {},
                        'assignees': set(),
                        'story_points': [],
                        'created_dates': [],
                        'updated_dates': []
                    }
                
                # Add task data
                task_data = {
                    'content': doc,
                    'metadata': metadata,
                    'status': metadata.get('status', 'Unknown'),
                    'priority': metadata.get('priority', 'Unknown'),
                    'issue_type': metadata.get('issue_type', 'Unknown'),
                    'assignee': metadata.get('assignee', 'Unknown'),
                    'sprint': sprint_id,
                    'story_points': metadata.get('story_points', 0),
                    'created_date': metadata.get('created', 'Unknown'),
                    'updated_date': metadata.get('updated', 'Unknown')
                }
                
                projects_data[project_id]['tasks'].append(task_data)
                projects_data[project_id]['sprints'].add(sprint_id)
                
                # Count statuses
                status = task_data['status']
                projects_data[project_id]['statuses'][status] = projects_data[project_id]['statuses'].get(status, 0) + 1
                
                # Count priorities
                priority = task_data['priority']
                projects_data[project_id]['priorities'][priority] = projects_data[project_id]['priorities'].get(priority, 0) + 1
                
                # Count issue types
                issue_type = task_data['issue_type']
                projects_data[project_id]['issue_types'][issue_type] = projects_data[project_id]['issue_types'].get(issue_type, 0) + 1
                
                # Add assignee
                if task_data['assignee'] != 'Unknown':
                    projects_data[project_id]['assignees'].add(task_data['assignee'])
                
                # Add story points
                if task_data['story_points'] and task_data['story_points'] > 0:
                    projects_data[project_id]['story_points'].append(task_data['story_points'])
                
                # Add dates
                if task_data['created_date'] != 'Unknown':
                    projects_data[project_id]['created_dates'].append(task_data['created_date'])
                if task_data['updated_date'] != 'Unknown':
                    projects_data[project_id]['updated_dates'].append(task_data['updated_date'])
            
            logger.info(f"Debug: Processed {len(projects_data)} projects")
            logger.info(f"Debug: Project keys: {list(projects_data.keys())}")
            logger.info(f"Debug: Total documents processed: {total_docs_processed}, Total filtered out: {total_docs_filtered}")
            
            # Log detailed project information for debugging
            for project_id, project_data in projects_data.items():
                logger.info(f"Project {project_id}: {len(project_data['tasks'])} tasks, {len(project_data['statuses'])} statuses")
                logger.info(f"  Statuses: {project_data['statuses']}")
                logger.info(f"  Priorities: {project_data['priorities']}")
                logger.info(f"  Issue Types: {project_data['issue_types']}")
            
            return {
                "projects": projects_data,
                "total_docs": len(all_docs['documents'])
            }
            
        except Exception as e:
            logger.error(f"Error extracting project data: {str(e)}")
            return {"projects": {}, "total_docs": 0}
    
    async def generate_deep_analysis(self, request: DeepAnalysisRequest) -> DeepAnalysisResponse:
        """Generate deep analysis using LLM for enhanced insights"""
        try:
            start_time = time.time()
            logger.info(f"Generating deep analysis for sprint={request.sprint}, project={request.project}, type={request.analysisType}")
            
            # Extract project data
            projects_data_result = self.extract_project_data(request.sprint, request.project)
            projects_data = projects_data_result.get("projects", {})
            
            logger.info(f"Extracted data for {len(projects_data)} projects")
            
            if not projects_data:
                logger.info(f"No projects found for sprint={request.sprint}, project={request.project}")
                return DeepAnalysisResponse(
                    analysisType=request.analysisType,
                    summary="No projects found for analysis.",
                    insights=[],
                    metrics=DeepAnalysisMetrics(
                        overallHealth=0,
                        riskScore=0,
                        performanceScore=0,
                        qualityScore=0,
                        trendDirection="unknown",
                        confidenceLevel="low"
                    ),
                    recommendations=["No data available for analysis"],
                    predictions=["Insufficient data for predictions"],
                    actionItems=["Upload project data to enable analysis"],
                    generatedAt=datetime.now().isoformat(),
                    analysisTime=0.0
                )
            
            # Generate LLM-based analysis
            analysis_result = await self._generate_llm_analysis(projects_data, request)
            
            analysis_time = time.time() - start_time
            logger.info(f"Deep analysis generated in {analysis_time:.2f}s")
            
            return DeepAnalysisResponse(
                analysisType=request.analysisType,
                summary=analysis_result["summary"],
                insights=analysis_result["insights"],
                metrics=analysis_result["metrics"],
                recommendations=analysis_result["recommendations"],
                predictions=analysis_result["predictions"],
                actionItems=analysis_result["actionItems"],
                generatedAt=datetime.now().isoformat(),
                analysisTime=analysis_time
            )
            
        except Exception as e:
            logger.error(f"Error generating deep analysis: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate deep analysis: {str(e)}"
            )
    
    async def _generate_llm_analysis(self, projects_data: Dict[str, Any], request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Use LLM to generate intelligent analysis"""
        try:
            # Validate projects_data structure
            if not isinstance(projects_data, dict):
                logger.error(f"Invalid projects_data type: {type(projects_data)}")
                return self._generate_fallback_analysis(projects_data, request)
            
            if not projects_data:
                logger.warning("Empty projects_data provided")
                return self._generate_fallback_analysis(projects_data, request)
            
            # Auto-detect analysis type from message if not explicitly set
            analysis_type = request.analysisType
            logger.info(f"Debug: Original analysis type: {request.analysisType}")
            logger.info(f"Debug: Message content: {request.message}")
            
            if request.message:
                message_lower = request.message.lower()
                logger.info(f"Debug: Message lower: {message_lower}")
                
                # Override analysis type based on message content
                if "executive" in message_lower or "summary" in message_lower:
                    analysis_type = "executive"
                    logger.info("Auto-detected executive analysis type from message")
                elif "historical" in message_lower or "trend" in message_lower or "predictive" in message_lower:
                    analysis_type = "historical"
                    logger.info("Auto-detected historical trends analysis type from message")
                elif "bottleneck" in message_lower or "process" in message_lower:
                    analysis_type = "bottleneck"
                    logger.info("Auto-detected bottleneck analysis type from message")
                elif "velocity" in message_lower or "burn" in message_lower or "sprint" in message_lower:
                    analysis_type = "velocity"
                    logger.info("Auto-detected velocity analysis type from message")
                elif "risk" in message_lower:
                    analysis_type = "risk"
                    logger.info("Auto-detected risk analysis type from message")
                elif "performance" in message_lower:
                    analysis_type = "performance"
                    logger.info("Auto-detected performance analysis type from message")
                elif "quality" in message_lower:
                    analysis_type = "quality"
                    logger.info("Auto-detected quality analysis type from message")
                else:
                    # Only default to executive if no specific type was detected
                    if not request.analysisType or request.analysisType == "comprehensive":
                        analysis_type = "executive"
                        logger.info("Defaulting to executive analysis type")
                    else:
                        logger.info(f"Using provided analysis type: {request.analysisType}")
            else:
                # No message provided, use the requested type
                analysis_type = request.analysisType or "executive"
                logger.info(f"Using requested analysis type: {analysis_type}")
            
            logger.info(f"Debug: Final analysis type: {analysis_type}")
            
            # Prepare context for LLM
            context = self._prepare_analysis_context(projects_data, request)
            logger.info(f"Prepared context for LLM analysis: {len(context)} characters")
            logger.info(f"Using analysis type: {analysis_type}")
            
            # Generate analysis based on type
            if analysis_type == "executive":
                return await self._generate_executive_analysis(context, request)
            elif analysis_type == "comprehensive":
                return await self._generate_comprehensive_analysis(context, request)
            elif analysis_type == "historical":
                return await self._generate_historical_analysis(context, request)
            elif analysis_type == "bottleneck":
                return await self._generate_bottleneck_analysis(context, request)
            elif analysis_type == "velocity":
                return await self._generate_velocity_analysis(context, request)
            elif analysis_type == "risk":
                return await self._generate_risk_analysis(context, request)
            elif analysis_type == "performance":
                return await self._generate_performance_analysis(context, request)
            elif analysis_type == "quality":
                return await self._generate_quality_analysis(context, request)
            elif analysis_type == "trends":
                return await self._generate_trends_analysis(context, request)
            else:
                return await self._generate_executive_analysis(context, request)
                
        except Exception as e:
            logger.error(f"Error in LLM analysis: {str(e)}")
            logger.error(f"Projects data keys: {list(projects_data.keys()) if isinstance(projects_data, dict) else 'Not a dict'}")
            return self._generate_fallback_analysis(projects_data, request)
    
    def _prepare_analysis_context(self, projects_data: Dict[str, Any], request: DeepAnalysisRequest) -> str:
        """Prepare context data for LLM analysis"""
        context_parts = []
        
        # Project overview
        total_projects = len(projects_data)
        
        # Safely calculate total tasks
        total_tasks = 0
        total_story_points = 0
        for project_data in projects_data.values():
            if isinstance(project_data, dict) and 'tasks' in project_data:
                total_tasks += len(project_data['tasks'])
                # Calculate story points
                story_points = project_data.get('story_points', [])
                total_story_points += sum(story_points)
        
        context_parts.append(f"Portfolio Overview:")
        context_parts.append(f"- Total Projects: {total_projects}")
        context_parts.append(f"- Total Tasks: {total_tasks}")
        context_parts.append(f"- Total Story Points: {total_story_points}")
        
        # Project details
        for project_id, project_data in projects_data.items():
            if not isinstance(project_data, dict):
                continue
                
            # Safely get tasks
            tasks = project_data.get('tasks', [])
            total_project_tasks = len(tasks)
            
            # Safely get statuses
            statuses = project_data.get('statuses', {})
            done_tasks = statuses.get('Done', 0) + statuses.get('Closed', 0)
            in_progress_tasks = statuses.get('In Progress', 0) + statuses.get('Active', 0)
            blocked_tasks = statuses.get('Blocked', 0) + statuses.get('On Hold', 0)
            todo_tasks = statuses.get('To Do', 0) + statuses.get('Open', 0)
            
            # Calculate completion rate
            completion_rate = 0
            if total_project_tasks > 0:
                completion_rate = int((done_tasks / total_project_tasks) * 100)
            
            # Safely get priorities
            priorities = project_data.get('priorities', {})
            high_priority = priorities.get('High', 0) + priorities.get('Critical', 0) + priorities.get('Blocker', 0)
            medium_priority = priorities.get('Medium', 0) + priorities.get('Major', 0)
            low_priority = priorities.get('Low', 0) + priorities.get('Minor', 0)
            
            # Safely get issue types
            issue_types = project_data.get('issue_types', {})
            bugs = issue_types.get('Bug', 0) + issue_types.get('Defect', 0)
            stories = issue_types.get('Story', 0) + issue_types.get('Feature', 0)
            task_count = issue_types.get('Task', 0) + issue_types.get('Sub-task', 0)
            epics = issue_types.get('Epic', 0)
            
            # Safely get assignees
            assignees = project_data.get('assignees', set())
            assignee_list = list(assignees) if isinstance(assignees, set) else []
            
            # Calculate story points for this project
            project_story_points = sum(project_data.get('story_points', []))
            
            context_parts.append(f"\nProject: {project_id}")
            context_parts.append(f"- Total Tasks: {total_project_tasks}")
            context_parts.append(f"- Completion Rate: {completion_rate}%")
            context_parts.append(f"- Story Points: {project_story_points}")
            context_parts.append(f"- Status: Done={done_tasks}, In Progress={in_progress_tasks}, Blocked={blocked_tasks}, To Do={todo_tasks}")
            context_parts.append(f"- Priority: High/Critical={high_priority}, Medium={medium_priority}, Low={low_priority}")
            context_parts.append(f"- Issue Types: Bug={bugs}, Story={stories}, Task={task_count}, Epic={epics}")
            context_parts.append(f"- Assignees: {', '.join(assignee_list)}")
            
            # Add sprint information if available
            sprints = project_data.get('sprints', set())
            if sprints:
                sprint_list = list(sprints) if isinstance(sprints, set) else []
                context_parts.append(f"- Sprints: {', '.join(sprint_list)}")
        
        # Filters applied
        if request.sprint:
            context_parts.append(f"\nSprint Filter: {request.sprint}")
        if request.project:
            context_parts.append(f"Project Filter: {request.project}")
        
        # Add summary statistics
        if total_tasks > 0:
            overall_completion = 0
            total_done = 0
            for project_data in projects_data.values():
                if isinstance(project_data, dict):
                    statuses = project_data.get('statuses', {})
                    total_done += statuses.get('Done', 0) + statuses.get('Closed', 0)
            
            if total_tasks > 0:
                overall_completion = int((total_done / total_tasks) * 100)
            
            context_parts.append(f"\nPortfolio Summary:")
            context_parts.append(f"- Overall Completion Rate: {overall_completion}%")
            context_parts.append(f"- Average Tasks per Project: {total_tasks // total_projects if total_projects > 0 else 0}")
            context_parts.append(f"- Total Story Points: {total_story_points}")
        
        return "\n".join(context_parts)
    
    async def _generate_executive_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate executive summary analysis using LLM"""
        prompt = f"""
        You are a senior executive consultant providing a concise executive summary report. Analyze the following project data and provide insights suitable for C-level executives.
        
        Project Data:
        {context}
        
        Please provide an executive-level analysis including:
        
        1. Executive Summary (1-2 sentences summarizing the current state for executives)
        2. Key Insights (2-3 high-level insights with clear business impact)
        3. Metrics (overall health, risk, performance, quality scores 0-100, trend direction, confidence)
        4. Strategic Recommendations (3-5 high-level strategic recommendations for executives)
        5. Predictive Insights (2-3 business-focused predictions about future performance)
        6. Immediate Action Items (2-3 executive-level actions that require attention)
        
        Focus on:
        - Business impact and strategic implications
        - Risk assessment and mitigation
        - Resource allocation and prioritization
        - Timeline and delivery implications
        - Stakeholder communication needs
        
        Format your response as JSON with this structure:
        {{
            "summary": "executive summary for C-level executives",
            "insights": [
                {{
                    "category": "Strategic",
                    "title": "insight title",
                    "description": "high-level description with business impact",
                    "severity": "low/medium/high/critical",
                    "impact": "specific business impact description",
                    "evidence": ["evidence 1", "evidence 2"],
                    "recommendations": ["rec 1", "rec 2"]
                }}
            ],
            "metrics": {{
                "overallHealth": 75,
                "riskScore": 60,
                "performanceScore": 80,
                "qualityScore": 85,
                "trendDirection": "improving/declining/stable",
                "confidenceLevel": "high/medium/low"
            }},
            "recommendations": ["strategic rec 1", "strategic rec 2", "strategic rec 3"],
            "predictions": ["business prediction 1", "business prediction 2"],
            "actionItems": ["executive action 1", "executive action 2"]
        }}
        
        Be concise, strategic, and business-focused. This is for C-level executives who need high-level insights to make strategic decisions.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            # Clean and parse response
            response_text = str(response).strip()
            logger.info(f"Raw LLM executive analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                logger.info(f"Extracted executive analysis JSON: {json_text[:200]}...")
                
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed executive analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError as json_err:
                    logger.error(f"Executive analysis JSON parsing error: {json_err}")
                    logger.error(f"JSON text: {json_text}")
            
            # If JSON extraction fails, try to parse the entire response
            try:
                analysis = json.loads(response_text)
                logger.info("Successfully parsed entire executive analysis LLM response as JSON")
                return analysis
            except json.JSONDecodeError:
                logger.error("Failed to parse entire executive analysis response as JSON")
            
            # If all parsing fails, generate intelligent fallback
            logger.warning("Executive analysis LLM response parsing failed, generating intelligent fallback analysis")
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in executive analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)

    async def _generate_historical_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate historical trends and predictive analytics using LLM"""
        prompt = f"""
        You are a data analyst specializing in historical trends and predictive analytics. Analyze the following project data to identify patterns, trends, and make future predictions.
        
        Project Data:
        {context}
        
        Please provide a comprehensive historical trends analysis including:
        
        1. Executive Summary (1-2 sentences summarizing key trends and predictions)
        2. Key Insights (3-4 insights about historical patterns, trends, and predictive indicators)
        3. Metrics (trend analysis scores, prediction confidence, historical performance, future outlook)
        4. Strategic Recommendations (4-6 recommendations based on trend analysis)
        5. Predictive Insights (4-5 specific predictions about future performance and trends)
        6. Immediate Action Items (3-4 actions to capitalize on trends or mitigate risks)
        
        Focus on:
        - Historical performance patterns and trends
        - Velocity and productivity trends over time
        - Risk patterns and their evolution
        - Quality trends and defect patterns
        - Resource utilization trends
        - Future performance predictions based on historical data
        
        Format your response as JSON with this structure:
        {{
            "summary": "summary of key trends and predictions",
            "insights": [
                {{
                    "category": "Trend Analysis",
                    "title": "insight title",
                    "description": "detailed trend description with historical context",
                    "severity": "low/medium/high/critical",
                    "impact": "business impact of this trend",
                    "evidence": ["evidence 1", "evidence 2"],
                    "recommendations": ["rec 1", "rec 2"]
                }}
            ],
            "metrics": {{
                "overallHealth": 75,
                "riskScore": 60,
                "performanceScore": 80,
                "qualityScore": 85,
                "trendDirection": "improving/declining/stable",
                "confidenceLevel": "high/medium/low"
            }},
            "recommendations": ["trend-based rec 1", "trend-based rec 2", "trend-based rec 3"],
            "predictions": ["prediction 1", "prediction 2", "prediction 3", "prediction 4"],
            "actionItems": ["action 1", "action 2", "action 3"]
        }}
        
        Be data-driven and focus on identifying actionable trends and making specific predictions.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            # Clean and parse response
            response_text = str(response).strip()
            logger.info(f"Raw LLM historical analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                logger.info(f"Extracted historical analysis JSON: {json_text[:200]}...")
                
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed historical analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError as json_err:
                    logger.error(f"Historical analysis JSON parsing error: {json_err}")
                    logger.error(f"JSON text: {json_text}")
            
            # If JSON extraction fails, try to parse the entire response
            try:
                analysis = json.loads(response_text)
                logger.info("Successfully parsed entire historical analysis LLM response as JSON")
                return analysis
            except json.JSONDecodeError:
                logger.error("Failed to parse entire historical analysis response as JSON")
            
            # If all parsing fails, generate intelligent fallback
            logger.warning("Historical analysis LLM response parsing failed, generating intelligent fallback analysis")
            return self._generate_historical_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in historical analysis: {str(e)}")
            return self._generate_historical_fallback_analysis(context, request)

    async def _generate_bottleneck_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate bottleneck and process analysis using LLM"""
        prompt = f"""
        You are a process optimization expert specializing in identifying bottlenecks and process inefficiencies. Analyze the following project data to identify workflow bottlenecks, process issues, and optimization opportunities.
        
        Project Data:
        {context}
        
        Please provide a comprehensive bottleneck analysis including:
        
        1. Executive Summary (1-2 sentences summarizing key bottlenecks and process issues)
        2. Key Insights (3-4 insights about process bottlenecks, workflow inefficiencies, and optimization opportunities)
        3. Metrics (bottleneck severity scores, process efficiency, optimization potential, risk assessment)
        4. Strategic Recommendations (4-6 recommendations to eliminate bottlenecks and improve processes)
        5. Predictive Insights (3-4 predictions about process improvements and their impact)
        6. Immediate Action Items (3-4 actions to address critical bottlenecks)
        
        Focus on:
        - Workflow bottlenecks and their root causes
        - Process inefficiencies and waste identification
        - Resource allocation issues and constraints
        - Communication and coordination problems
        - Quality bottlenecks and rework patterns
        - Optimization opportunities and quick wins
        
        Format your response as JSON with this structure:
        {{
            "summary": "summary of key bottlenecks and process issues",
            "insights": [
                {{
                    "category": "Process Analysis",
                    "title": "insight title",
                    "description": "detailed bottleneck description with process context",
                    "severity": "low/medium/high/critical",
                    "impact": "business impact of this bottleneck",
                    "evidence": ["evidence 1", "evidence 2"],
                    "recommendations": ["rec 1", "rec 2"]
                }}
            ],
            "metrics": {{
                "overallHealth": 75,
                "riskScore": 60,
                "performanceScore": 80,
                "qualityScore": 85,
                "trendDirection": "improving/declining/stable",
                "confidenceLevel": "high/medium/low"
            }},
            "recommendations": ["bottleneck elimination rec 1", "process optimization rec 2", "workflow improvement rec 3"],
            "predictions": ["process improvement prediction 1", "bottleneck resolution prediction 2", "efficiency gain prediction 3"],
            "actionItems": ["immediate bottleneck action 1", "process improvement action 2", "workflow optimization action 3"]
        }}
        
        Be specific about bottlenecks and provide actionable process improvement recommendations.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            # Clean and parse response
            response_text = str(response).strip()
            logger.info(f"Raw LLM bottleneck analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                logger.info(f"Extracted bottleneck analysis JSON: {json_text[:200]}...")
                
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed bottleneck analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError as json_err:
                    logger.error(f"Bottleneck analysis JSON parsing error: {json_err}")
                    logger.error(f"JSON text: {json_text}")
            
            # If JSON extraction fails, try to parse the entire response
            try:
                analysis = json.loads(response_text)
                logger.info("Successfully parsed entire bottleneck analysis LLM response as JSON")
                return analysis
            except json.JSONDecodeError:
                logger.error("Failed to parse entire bottleneck analysis response as JSON")
            
            # If all parsing fails, generate intelligent fallback
            logger.warning("Bottleneck analysis LLM response parsing failed, generating intelligent fallback analysis")
            return self._generate_bottleneck_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in bottleneck analysis: {str(e)}")
            return self._generate_bottleneck_fallback_analysis(context, request)

    async def _generate_velocity_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate sprint velocity and burn-down analysis using LLM"""
        prompt = f"""
        You are an Agile coach specializing in sprint velocity analysis and burn-down charts. Analyze the following project data to assess sprint performance, velocity trends, and provide burn-down insights.
        
        Project Data:
        {context}
        
        Please provide a comprehensive velocity analysis including:
        
        1. Executive Summary (1-2 sentences summarizing sprint velocity and burn-down status)
        2. Key Insights (3-4 insights about velocity patterns, sprint performance, and burn-down trends)
        3. Metrics (velocity scores, sprint efficiency, completion rates, burn-down progress)
        4. Strategic Recommendations (4-6 recommendations to improve velocity and sprint performance)
        5. Predictive Insights (3-4 predictions about future sprint performance and velocity)
        6. Immediate Action Items (3-4 actions to optimize current sprint and improve velocity)
        
        Focus on:
        - Sprint velocity patterns and trends
        - Story point completion rates and accuracy
        - Burn-down chart analysis and progress tracking
        - Sprint planning accuracy and estimation quality
        - Team capacity and resource utilization
        - Sprint goal achievement and scope management
        
        Format your response as JSON with this structure:
        {{
            "summary": "summary of sprint velocity and burn-down status",
            "insights": [
                {{
                    "category": "Velocity Analysis",
                    "title": "insight title",
                    "description": "detailed velocity description with sprint context",
                    "severity": "low/medium/high/critical",
                    "impact": "business impact of velocity issues",
                    "evidence": ["evidence 1", "evidence 2"],
                    "recommendations": ["rec 1", "rec 2"]
                }}
            ],
            "metrics": {{
                "overallHealth": 75,
                "riskScore": 60,
                "performanceScore": 80,
                "qualityScore": 85,
                "trendDirection": "improving/declining/stable",
                "confidenceLevel": "high/medium/low"
            }},
            "recommendations": ["velocity improvement rec 1", "sprint optimization rec 2", "capacity planning rec 3"],
            "predictions": ["velocity prediction 1", "sprint performance prediction 2", "capacity prediction 3"],
            "actionItems": ["immediate velocity action 1", "sprint improvement action 2", "capacity optimization action 3"]
        }}
        
        Be specific about velocity metrics and provide actionable sprint improvement recommendations.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            # Clean and parse response
            response_text = str(response).strip()
            logger.info(f"Raw LLM velocity analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                logger.info(f"Extracted velocity analysis JSON: {json_text[:200]}...")
                
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed velocity analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError as json_err:
                    logger.error(f"Velocity analysis JSON parsing error: {json_err}")
                    logger.error(f"JSON text: {json_text}")
            
            # If JSON extraction fails, try to parse the entire response
            try:
                analysis = json.loads(response_text)
                logger.info("Successfully parsed entire velocity analysis LLM response as JSON")
                return analysis
            except json.JSONDecodeError:
                logger.error("Failed to parse entire velocity analysis response as JSON")
            
            # If all parsing fails, generate intelligent fallback
            logger.warning("Velocity analysis LLM response parsing failed, generating intelligent fallback analysis")
            return self._generate_velocity_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in velocity analysis: {str(e)}")
            return self._generate_velocity_fallback_analysis(context, request)

    async def _generate_comprehensive_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate comprehensive analysis using LLM"""
        prompt = f"""
        You are a senior project portfolio analyst. Analyze the following project data and provide deep insights.
        
        Project Data:
        {context}
        
        Please provide a comprehensive analysis including:
        
        1. Executive Summary (2-3 sentences)
        2. Key Insights (3-5 insights with category, title, description, severity, impact, evidence)
        3. Metrics (overall health, risk, performance, quality scores 0-100, trend direction, confidence)
        4. Strategic Recommendations (5-7 actionable recommendations)
        5. Predictive Insights (3-5 predictions about future performance)
        6. Immediate Action Items (3-5 urgent actions)
        
        Format your response as JSON with this structure:
        {{
            "summary": "executive summary",
            "insights": [
                {{
                    "category": "insight category",
                    "title": "insight title",
                    "description": "detailed description",
                    "severity": "low/medium/high/critical",
                    "impact": "business impact",
                    "evidence": ["evidence 1", "evidence 2"],
                    "recommendations": ["rec 1", "rec 2"]
                }}
            ],
            "metrics": {{
                "overallHealth": 75,
                "riskScore": 60,
                "performanceScore": 80,
                "qualityScore": 85,
                "trendDirection": "improving/declining/stable",
                "confidenceLevel": "high/medium/low"
            }},
            "recommendations": ["rec 1", "rec 2", "rec 3"],
            "predictions": ["prediction 1", "prediction 2", "prediction 3"],
            "actionItems": ["action 1", "action 2", "action 3"]
        }}
        
        Be specific, actionable, and data-driven in your analysis.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            # Clean and parse response
            response_text = str(response).strip()
            logger.info(f"Raw LLM comprehensive analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                logger.info(f"Extracted JSON: {json_text[:200]}...")
                
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed LLM response as JSON")
                    return analysis
                except json.JSONDecodeError as json_err:
                    logger.error(f"JSON parsing error: {json_err}")
                    logger.error(f"JSON text: {json_text}")
            
            # If JSON extraction fails, try to parse the entire response
            try:
                analysis = json.loads(response_text)
                logger.info("Successfully parsed entire LLM response as JSON")
                return analysis
            except json.JSONDecodeError:
                logger.error("Failed to parse entire response as JSON")
            
            # If all parsing fails, generate intelligent fallback
            logger.warning("LLM response parsing failed, generating intelligent fallback analysis")
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in LLM analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)
    
    async def _generate_risk_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate risk-focused analysis"""
        prompt = f"""
        You are a risk management expert. Analyze the following project data for risks and provide risk assessment.
        
        Project Data:
        {context}
        
        Focus on:
        - Risk identification and assessment
        - Risk severity and probability
        - Risk mitigation strategies
        - Early warning indicators
        
        Provide analysis in the same JSON format as comprehensive analysis.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            response_text = str(response).strip()
            logger.info(f"Raw LLM risk analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed risk analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError:
                    logger.error("Failed to parse risk analysis JSON")
            
            # If parsing fails, use intelligent fallback
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in risk analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)
    
    async def _generate_performance_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate performance-focused analysis"""
        prompt = f"""
        You are a performance optimization expert. Analyze the following project data for performance insights.
        
        Project Data:
        {context}
        
        Focus on:
        - Performance bottlenecks
        - Team velocity and capacity
        - Process efficiency
        - Performance improvement opportunities
        
        Provide analysis in the same JSON format as comprehensive analysis.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            response_text = str(response).strip()
            logger.info(f"Raw LLM performance analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed performance analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError:
                    logger.error("Failed to parse performance analysis JSON")
            
            # If parsing fails, use intelligent fallback
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in performance analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)
    
    async def _generate_quality_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate quality-focused analysis"""
        prompt = f"""
        You are a quality assurance expert. Analyze the following project data for quality insights.
        
        Project Data:
        {context}
        
        Focus on:
        - Quality metrics and trends
        - Defect patterns
        - Quality improvement areas
        - Best practices implementation
        
        Provide analysis in the same JSON format as comprehensive analysis.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            response_text = str(response).strip()
            logger.info(f"Raw LLM quality analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed quality analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError:
                    logger.error("Failed to parse quality analysis JSON")
            
            # If parsing fails, use intelligent fallback
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in quality analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)
    
    async def _generate_trends_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate trends-focused analysis"""
        prompt = f"""
        You are a trends and forecasting expert. Analyze the following project data for trend insights.
        
        Project Data:
        {context}
        
        Focus on:
        - Historical trends
        - Pattern recognition
        - Future predictions
        - Trend-based recommendations
        
        Provide analysis in the same JSON format as comprehensive analysis.
        """
        
        try:
            response = self.llm.invoke(prompt)
            import json
            
            response_text = str(response).strip()
            logger.info(f"Raw LLM trends analysis response: {response_text[:200]}...")
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != 0:
                json_text = response_text[json_start:json_end]
                try:
                    analysis = json.loads(json_text)
                    logger.info("Successfully parsed trends analysis LLM response as JSON")
                    return analysis
                except json.JSONDecodeError:
                    logger.error("Failed to parse trends analysis JSON")
            
            # If parsing fails, use intelligent fallback
            return self._generate_intelligent_fallback_analysis(context, request)
            
        except Exception as e:
            logger.error(f"Error in trends analysis: {str(e)}")
            return self._generate_intelligent_fallback_analysis(context, request)
    
    def _generate_fallback_analysis(self, projects_data: Dict[str, Any], request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate fallback analysis when LLM fails"""
        logger.info("Generating fallback analysis due to LLM processing issues")
        
        # Try to extract basic metrics from the data
        total_projects = len(projects_data) if isinstance(projects_data, dict) else 0
        total_tasks = 0
        
        if isinstance(projects_data, dict):
            for project_data in projects_data.values():
                if isinstance(project_data, dict) and 'tasks' in project_data:
                    total_tasks += len(project_data['tasks'])
        
        return {
            "summary": f"Analysis completed with fallback method. Found {total_projects} projects with {total_tasks} total tasks. LLM processing encountered an issue, but basic analysis is available.",
            "insights": [
                {
                    "category": "System",
                    "title": "LLM Processing Issue",
                    "description": "The AI analysis system encountered an error and used fallback analysis. This may be due to data format issues or LLM service unavailability.",
                    "severity": "medium",
                    "impact": "Analysis quality may be reduced, but basic insights are still available",
                    "evidence": ["LLM response parsing failed", f"Data contains {total_projects} projects"],
                    "recommendations": ["Retry the analysis", "Check data format", "Verify LLM service status"]
                },
                {
                    "category": "Data",
                    "title": "Data Overview",
                    "description": f"Portfolio contains {total_projects} projects with {total_tasks} total tasks.",
                    "severity": "low",
                    "impact": "Basic portfolio information available",
                    "evidence": [f"Total projects: {total_projects}", f"Total tasks: {total_tasks}"],
                    "recommendations": ["Review project data quality", "Ensure proper data format"]
                }
            ],
            "metrics": {
                "overallHealth": 50,
                "riskScore": 50,
                "performanceScore": 50,
                "qualityScore": 50,
                "trendDirection": "stable",
                "confidenceLevel": "low"
            },
            "recommendations": [
                "Retry the analysis with different parameters",
                "Check system connectivity and LLM service status",
                "Verify data format and quality",
                "Contact system administrator if issues persist"
            ],
            "predictions": [
                "Unable to generate predictions due to system issues",
                "Recommend retrying analysis once system is stable"
            ],
            "actionItems": [
                "Retry analysis",
                "Check system logs for detailed error information",
                "Verify data availability and format"
            ]
        }

    def _generate_intelligent_fallback_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate intelligent fallback analysis based on actual data"""
        logger.info("Generating intelligent fallback analysis based on data context")
        
        try:
            # Parse the context to extract meaningful information
            lines = context.split('\n')
            project_info = {}
            total_tasks = 0
            total_projects = 0
            
            for line in lines:
                if line.startswith('Project:'):
                    project_name = line.split('Project:')[1].strip()
                    total_projects += 1
                    project_info[project_name] = {'tasks': 0, 'statuses': {}, 'priorities': {}}
                elif 'Total Tasks:' in line:
                    try:
                        task_count = int(line.split('Total Tasks:')[1].strip())
                        if project_name in project_info:
                            project_info[project_name]['tasks'] = task_count
                            total_tasks += task_count
                    except:
                        pass
                elif 'Status:' in line:
                    if project_name in project_info:
                        status_text = line.split('Status:')[1].strip()
                        # Parse status counts
                        if 'Done=' in status_text:
                            try:
                                done_count = int(status_text.split('Done=')[1].split(',')[0])
                                project_info[project_name]['statuses']['Done'] = done_count
                            except:
                                pass
            
            # Calculate metrics based on actual data
            completion_rate = 0
            if total_tasks > 0:
                total_done = sum(p.get('statuses', {}).get('Done', 0) for p in project_info.values())
                completion_rate = int((total_done / total_tasks) * 100)
            
            # Generate meaningful insights
            insights = []
            if total_projects > 0:
                insights.append({
                    "category": "Portfolio",
                    "title": f"Portfolio Overview - {total_projects} Projects",
                    "description": f"Portfolio contains {total_projects} projects with {total_tasks} total tasks. Current completion rate is {completion_rate}%.",
                    "severity": "low" if completion_rate >= 70 else "medium" if completion_rate >= 50 else "high",
                    "impact": f"Portfolio health is {'good' if completion_rate >= 70 else 'moderate' if completion_rate >= 50 else 'concerning'} with {completion_rate}% completion rate.",
                    "evidence": [f"Total projects: {total_projects}", f"Total tasks: {total_tasks}", f"Completion rate: {completion_rate}%"],
                    "recommendations": ["Monitor project progress regularly", "Focus on completing high-priority tasks", "Review blocked or delayed items"]
                })
            
            if total_tasks > 0:
                insights.append({
                    "category": "Performance",
                    "title": "Task Completion Analysis",
                    "description": f"Current task completion status shows {completion_rate}% of tasks are completed across all projects.",
                    "severity": "low" if completion_rate >= 80 else "medium" if completion_rate >= 60 else "high",
                    "impact": "Task completion rate directly impacts project delivery timelines and portfolio success.",
                    "evidence": [f"Total tasks: {total_tasks}", f"Completed tasks: {total_tasks * completion_rate // 100}", f"Completion rate: {completion_rate}%"],
                    "recommendations": ["Prioritize incomplete tasks", "Identify and resolve blockers", "Allocate additional resources if needed"]
                })
            
            # Generate actionable recommendations
            recommendations = []
            if completion_rate < 80:
                recommendations.append("Implement daily standups to track progress and identify blockers early")
            if total_projects > 3:
                recommendations.append("Consider portfolio prioritization to focus resources on high-impact projects")
            recommendations.append("Establish clear success metrics and KPIs for each project")
            recommendations.append("Implement regular portfolio reviews to assess project health and alignment")
            recommendations.append("Create risk mitigation plans for projects with low completion rates")
            
            # Generate predictions based on data
            predictions = []
            if completion_rate >= 70:
                predictions.append("Portfolio is on track to meet most delivery targets if current pace continues")
            else:
                predictions.append("Portfolio may face delivery delays unless completion rate improves")
            predictions.append("Regular monitoring and intervention can improve completion rates by 15-20%")
            predictions.append("Focusing on high-priority tasks can accelerate overall portfolio delivery")
            
            # Generate action items
            action_items = []
            if completion_rate < 80:
                action_items.append("Schedule immediate review of blocked or delayed tasks")
            action_items.append("Review and update project priorities based on business impact")
            action_items.append("Establish weekly portfolio health check meetings")
            action_items.append("Identify and resolve resource constraints affecting project delivery")
            
            return {
                "summary": f"Portfolio analysis shows {total_projects} projects with {total_tasks} total tasks. Current completion rate is {completion_rate}%, indicating {'good' if completion_rate >= 70 else 'moderate' if completion_rate >= 50 else 'needs attention'} portfolio health.",
                "insights": insights,
                "metrics": {
                    "overallHealth": min(100, max(0, completion_rate + 20)),
                    "riskScore": max(0, 100 - completion_rate),
                    "performanceScore": completion_rate,
                    "qualityScore": min(100, completion_rate + 15),
                    "trendDirection": "improving" if completion_rate >= 70 else "stable" if completion_rate >= 50 else "declining",
                    "confidenceLevel": "high" if total_tasks > 10 else "medium" if total_tasks > 5 else "low"
                },
                "recommendations": recommendations,
                "predictions": predictions,
                "actionItems": action_items
            }
            
        except Exception as e:
            logger.error(f"Error in intelligent fallback analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)

    def _generate_historical_fallback_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate historical trends fallback analysis based on actual data"""
        logger.info("Generating historical trends fallback analysis based on data context")
        
        try:
            # Parse the context to extract meaningful information
            lines = context.split('\n')
            project_info = {}
            total_tasks = 0
            total_projects = 0
            
            for line in lines:
                if line.startswith('Project:'):
                    project_name = line.split('Project:')[1].strip()
                    total_projects += 1
                    project_info[project_name] = {'tasks': 0, 'statuses': {}, 'priorities': {}}
                elif 'Total Tasks:' in line:
                    try:
                        task_count = int(line.split('Total Tasks:')[1].strip())
                        if project_name in project_info:
                            project_info[project_name]['tasks'] = task_count
                            total_tasks += task_count
                    except:
                        pass
                elif 'Status:' in line:
                    if project_name in project_info:
                        status_text = line.split('Status:')[1].strip()
                        # Parse status counts
                        if 'Done=' in status_text:
                            try:
                                done_count = int(status_text.split('Done=')[1].split(',')[0])
                                project_info[project_name]['statuses']['Done'] = done_count
                            except:
                                pass
            
            # Calculate metrics based on actual data
            completion_rate = 0
            if total_tasks > 0:
                total_done = sum(p.get('statuses', {}).get('Done', 0) for p in project_info.values())
                completion_rate = int((total_done / total_tasks) * 100)
            
            # Generate historical trends insights
            insights = []
            if total_projects > 0:
                insights.append({
                    "category": "Historical Trends",
                    "title": f"Portfolio Performance Analysis - {total_projects} Projects",
                    "description": f"Historical analysis shows {total_projects} projects with {total_tasks} total tasks. Current completion rate is {completion_rate}%, indicating historical performance patterns.",
                    "severity": "low" if completion_rate >= 70 else "medium" if completion_rate >= 50 else "high",
                    "impact": f"Historical performance indicates {'consistent delivery' if completion_rate >= 70 else 'moderate variability' if completion_rate >= 50 else 'delivery challenges'} with {completion_rate}% completion rate.",
                    "evidence": [f"Total projects: {total_projects}", f"Total tasks: {total_tasks}", f"Completion rate: {completion_rate}%"],
                    "recommendations": ["Analyze historical velocity patterns", "Review sprint performance trends", "Identify seasonal performance variations"]
                })
            
            # Generate trend-based recommendations
            recommendations = []
            if completion_rate < 80:
                recommendations.append("Implement historical trend analysis to identify performance patterns and seasonal variations")
            recommendations.append("Establish historical baseline metrics for velocity and completion rates")
            recommendations.append("Implement trend monitoring to predict future performance and capacity needs")
            
            # Generate predictions based on historical data
            predictions = []
            if completion_rate >= 70:
                predictions.append("Historical performance suggests current completion rates are sustainable with continued process improvements")
            else:
                predictions.append("Historical trends indicate need for significant process improvements to achieve target completion rates")
            predictions.append("Analysis of historical patterns can improve sprint planning accuracy by 20-30%")
            
            # Generate action items
            action_items = []
            if completion_rate < 80:
                action_items.append("Implement historical trend analysis dashboard to track performance patterns")
            action_items.append("Review historical sprint data to identify velocity trends and capacity patterns")
            action_items.append("Establish historical baseline metrics for future performance comparisons")
            
            return {
                "summary": f"Historical trends analysis shows {total_projects} projects with {total_tasks} total tasks. Current completion rate of {completion_rate}% indicates {'consistent historical performance' if completion_rate >= 70 else 'performance variability' if completion_rate >= 50 else 'historical delivery challenges'}.",
                "insights": insights,
                "metrics": {
                    "overallHealth": min(100, max(0, completion_rate + 25)),
                    "riskScore": max(0, 100 - completion_rate),
                    "performanceScore": completion_rate,
                    "qualityScore": min(100, completion_rate + 20),
                    "trendDirection": "improving" if completion_rate >= 70 else "stable" if completion_rate >= 50 else "declining",
                    "confidenceLevel": "high" if total_tasks > 10 else "medium" if total_tasks > 5 else "low"
                },
                "recommendations": recommendations,
                "predictions": predictions,
                "actionItems": action_items
            }
            
        except Exception as e:
            logger.error(f"Error in historical fallback analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)

    def _generate_bottleneck_fallback_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate bottleneck analysis fallback based on actual data"""
        logger.info("Generating bottleneck analysis fallback based on data context")
        
        try:
            # Parse the context to extract meaningful information
            lines = context.split('\n')
            project_info = {}
            total_tasks = 0
            total_projects = 0
            
            for line in lines:
                if line.startswith('Project:'):
                    project_name = line.split('Project:')[1].strip()
                    total_projects += 1
                    project_info[project_name] = {'tasks': 0, 'statuses': {}, 'priorities': {}}
                elif 'Total Tasks:' in line:
                    try:
                        task_count = int(line.split('Total Tasks:')[1].strip())
                        if project_name in project_info:
                            project_info[project_name]['tasks'] = task_count
                            total_tasks += task_count
                    except:
                        pass
                elif 'Status:' in line:
                    if project_name in project_info:
                        status_text = line.split('Status:')[1].strip()
                        # Parse status counts
                        if 'Done=' in status_text:
                            try:
                                done_count = int(status_text.split('Done=')[1].split(',')[0])
                                project_info[project_name]['statuses']['Done'] = done_count
                            except:
                                pass
            
            # Calculate metrics based on actual data
            completion_rate = 0
            if total_tasks > 0:
                total_done = sum(p.get('statuses', {}).get('Done', 0) for p in project_info.values())
                completion_rate = int((total_done / total_tasks) * 100)
            
            # Generate bottleneck insights
            insights = []
            if total_projects > 0:
                insights.append({
                    "category": "Process Analysis",
                    "title": f"Workflow Bottleneck Identification - {total_projects} Projects",
                    "description": f"Process analysis reveals {total_projects} projects with {total_tasks} total tasks. Current completion rate of {completion_rate}% indicates potential workflow bottlenecks.",
                    "severity": "low" if completion_rate >= 70 else "medium" if completion_rate >= 50 else "high",
                    "impact": f"Process bottlenecks are {'minimal' if completion_rate >= 70 else 'moderate' if completion_rate >= 50 else 'significant'}, impacting delivery timelines and resource utilization.",
                    "evidence": [f"Total projects: {total_projects}", f"Total tasks: {total_tasks}", f"Completion rate: {completion_rate}%"],
                    "recommendations": ["Identify workflow choke points", "Analyze process dependencies", "Review resource allocation patterns"]
                })
            
            # Generate bottleneck elimination recommendations
            recommendations = []
            if completion_rate < 80:
                recommendations.append("Conduct process mapping to identify workflow bottlenecks and inefficiencies")
            recommendations.append("Implement process optimization initiatives to eliminate workflow constraints")
            recommendations.append("Review resource allocation to identify capacity bottlenecks")
            recommendations.append("Establish process monitoring to detect emerging bottlenecks early")
            
            # Generate predictions about process improvements
            predictions = []
            if completion_rate >= 70:
                predictions.append("Current process efficiency suggests moderate optimization opportunities for improved delivery")
            else:
                predictions.append("Significant process improvements are needed to achieve target delivery performance")
            predictions.append("Bottleneck elimination can improve completion rates by 15-25% within 2-3 sprints")
            
            # Generate action items
            action_items = []
            if completion_rate < 80:
                action_items.append("Schedule process mapping workshop to identify current workflow bottlenecks")
            action_items.append("Review and optimize resource allocation to eliminate capacity constraints")
            action_items.append("Implement process monitoring dashboard to track workflow efficiency")
            
            return {
                "summary": f"Bottleneck analysis identifies {total_projects} projects with {total_tasks} total tasks. Current completion rate of {completion_rate}% indicates {'minimal' if completion_rate >= 70 else 'moderate' if completion_rate >= 50 else 'significant'} process bottlenecks requiring attention.",
                "insights": insights,
                "metrics": {
                    "overallHealth": min(100, max(0, completion_rate + 30)),
                    "riskScore": max(0, 100 - completion_rate),
                    "performanceScore": completion_rate,
                    "qualityScore": min(100, completion_rate + 25),
                    "trendDirection": "improving" if completion_rate >= 70 else "stable" if completion_rate >= 50 else "declining",
                    "confidenceLevel": "high" if total_tasks > 10 else "medium" if total_tasks > 5 else "low"
                },
                "recommendations": recommendations,
                "predictions": predictions,
                "actionItems": action_items
            }
            
        except Exception as e:
            logger.error(f"Error in bottleneck fallback analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)

    def _generate_velocity_fallback_analysis(self, context: str, request: DeepAnalysisRequest) -> Dict[str, Any]:
        """Generate velocity analysis fallback based on actual data"""
        logger.info("Generating velocity analysis fallback based on data context")
        
        try:
            # Parse the context to extract meaningful information
            lines = context.split('\n')
            project_info = {}
            total_tasks = 0
            total_projects = 0
            
            for line in lines:
                if line.startswith('Project:'):
                    project_name = line.split('Project:')[1].strip()
                    total_projects += 1
                    project_info[project_name] = {'tasks': 0, 'statuses': {}, 'priorities': {}}
                elif 'Total Tasks:' in line:
                    try:
                        task_count = int(line.split('Total Tasks:')[1].strip())
                        if project_name in project_info:
                            project_info[project_name]['tasks'] = task_count
                            total_tasks += task_count
                    except:
                        pass
                elif 'Status:' in line:
                    if project_name in project_info:
                        status_text = line.split('Status:')[1].strip()
                        # Parse status counts
                        if 'Done=' in status_text:
                            try:
                                done_count = int(status_text.split('Done=')[1].split(',')[0])
                                project_info[project_name]['statuses']['Done'] = done_count
                            except:
                                pass
            
            # Calculate metrics based on actual data
            completion_rate = 0
            if total_tasks > 0:
                total_done = sum(p.get('statuses', {}).get('Done', 0) for p in project_info.values())
                completion_rate = int((total_done / total_tasks) * 100)
            
            # Generate velocity insights
            insights = []
            if total_projects > 0:
                insights.append({
                    "category": "Velocity Analysis",
                    "title": f"Sprint Velocity Assessment - {total_projects} Projects",
                    "description": f"Velocity analysis for {total_projects} projects shows {total_tasks} total tasks. Current completion rate of {completion_rate}% indicates sprint velocity performance.",
                    "severity": "low" if completion_rate >= 70 else "medium" if completion_rate >= 50 else "high",
                    "impact": f"Sprint velocity is {'optimal' if completion_rate >= 70 else 'adequate' if completion_rate >= 50 else 'suboptimal'}, affecting sprint goal achievement and delivery predictability.",
                    "evidence": [f"Total projects: {total_projects}", f"Total tasks: {total_tasks}", f"Completion rate: {completion_rate}%"],
                    "recommendations": ["Track sprint velocity trends", "Analyze capacity utilization", "Review sprint planning accuracy"]
                })
            
            # Generate velocity improvement recommendations
            recommendations = []
            if completion_rate < 80:
                recommendations.append("Implement velocity tracking to measure sprint performance and identify improvement opportunities")
            recommendations.append("Establish velocity baselines for improved sprint planning and capacity estimation")
            recommendations.append("Implement burn-down chart tracking to monitor sprint progress and identify risks")
            recommendations.append("Review and optimize sprint planning processes to improve velocity accuracy")
            
            # Generate predictions about velocity improvements
            predictions = []
            if completion_rate >= 70:
                predictions.append("Current velocity suggests moderate improvement opportunities for enhanced sprint performance")
            else:
                predictions.append("Significant velocity improvements are needed to achieve target sprint performance")
            predictions.append("Velocity tracking and optimization can improve sprint completion rates by 20-30%")
            
            # Generate action items
            action_items = []
            if completion_rate < 80:
                action_items.append("Implement velocity tracking dashboard to monitor sprint performance trends")
            action_items.append("Review and optimize sprint planning processes to improve estimation accuracy")
            action_items.append("Establish velocity baselines for improved capacity planning and sprint goal setting")
            
            return {
                "summary": f"Velocity analysis for {total_projects} projects shows {total_tasks} total tasks. Current completion rate of {completion_rate}% indicates {'optimal' if completion_rate >= 70 else 'adequate' if completion_rate >= 50 else 'suboptimal'} sprint velocity requiring attention.",
                "insights": insights,
                "metrics": {
                    "overallHealth": min(100, max(0, completion_rate + 35)),
                    "riskScore": max(0, 100 - completion_rate),
                    "performanceScore": completion_rate,
                    "qualityScore": min(100, completion_rate + 30),
                    "trendDirection": "improving" if completion_rate >= 70 else "stable" if completion_rate >= 50 else "declining",
                    "confidenceLevel": "high" if total_tasks > 10 else "medium" if total_tasks > 5 else "low"
                },
                "recommendations": recommendations,
                "predictions": predictions,
                "actionItems": action_items
            }
            
        except Exception as e:
            logger.error(f"Error in velocity fallback analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)

# Global RAG instance
_deep_analysis_rag_instance = None

def get_deep_analysis_rag_instance():
    """Get or create Deep Analysis RAG instance"""
    global _deep_analysis_rag_instance
    if _deep_analysis_rag_instance is None:
        _deep_analysis_rag_instance = DeepAnalysisRAG()
    return _deep_analysis_rag_instance

@router.post("/generate", response_model=DeepAnalysisResponse)
async def generate_deep_analysis(request: DeepAnalysisRequest):
    """Generate deep analysis with LLM-powered insights"""
    try:
        logger.info(f"Received deep analysis request:")
        logger.info(f"  Message: {request.message}")
        logger.info(f"  Project: {request.project}")
        logger.info(f"  Sprint: {request.sprint}")
        logger.info(f"  Analysis Type: {request.analysisType}")
        logger.info(f"  Include Recommendations: {request.includeRecommendations}")
        logger.info(f"  Include Predictions: {request.includePredictions}")
        
        # Validate required fields for executive summary
        if request.message and "executive" in request.message.lower() or "summary" in request.message.lower():
            if not request.project or not request.sprint:
                logger.warning("Executive summary requested but missing project or sprint filter")
                return DeepAnalysisResponse(
                    analysisType="executive",
                    summary="Executive summary requires both project and sprint filters to be specified.",
                    insights=[],
                    metrics=DeepAnalysisMetrics(
                        overallHealth=0,
                        riskScore=0,
                        performanceScore=0,
                        qualityScore=0,
                        trendDirection="unknown",
                        confidenceLevel="low"
                    ),
                    recommendations=["Please specify both project and sprint filters"],
                    predictions=["Insufficient data for predictions"],
                    actionItems=["Add project and sprint filters to generate executive summary"],
                    generatedAt=datetime.now().isoformat(),
                    analysisTime=0.0
                )
        
        rag = DeepAnalysisRAG()
        return await rag.generate_deep_analysis(request)
        
    except Exception as e:
        logger.error(f"Error generating deep analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status():
    """Get deep analysis service status"""
    try:
        return {
            "status": "healthy",
            "service": "deep-analysis",
            "model": "llama3",
            "embedding_model": "nomic-embed-text",
            "vectorstore": "ChromaDB"
        }
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@router.post("/refresh")
async def refresh_deep_analysis():
    """Refresh the deep analysis service"""
    try:
        global _deep_analysis_rag_instance
        _deep_analysis_rag_instance = None
        
        return {
            "success": True,
            "message": "Deep analysis service refreshed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing deep analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh deep analysis: {str(e)}"
        )

@router.post("/debug", response_model=Dict[str, Any])
async def debug_data_extraction(request: DeepAnalysisRequest):
    """Debug endpoint to test data extraction and filtering"""
    try:
        rag = DeepAnalysisRAG()
        
        # Extract project data
        projects_data_result = rag.extract_project_data(request.sprint, request.project)
        projects_data = projects_data_result.get("projects", {})
        
        # Prepare context
        context = rag._prepare_analysis_context(projects_data, request)
        
        return {
            "request": {
                "message": request.message,
                "sprint": request.sprint,
                "project": request.project,
                "analysisType": request.analysisType
            },
            "data_extraction": {
                "total_docs": projects_data_result.get("total_docs", 0),
                "projects_found": len(projects_data),
                "project_keys": list(projects_data.keys()) if projects_data else []
            },
            "context_preview": context[:500] + "..." if len(context) > 500 else context,
            "context_length": len(context)
        }
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
