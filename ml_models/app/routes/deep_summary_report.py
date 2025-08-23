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
    analysisType: Optional[str] = Field(default="comprehensive", description="Type of analysis: comprehensive, risk, performance, quality, trends")
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
            
            if not all_docs.get('documents'):
                logger.info("No documents found in vectorstore")
                return {"projects": {}, "total_docs": 0}
            
            projects_data = {}
            
            for i, doc in enumerate(all_docs['documents']):
                metadata = all_docs['metadatas'][i] if all_docs['metadatas'] else {}
                
                # Apply filters
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                if project_filter:
                    project_id = metadata.get('project_id', '').lower()
                    project_filter_lower = project_filter.lower()
                    
                    if project_id != project_filter_lower and project_filter_lower not in project_id:
                        continue
                
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
                        'assignees': set()
                    }
                
                # Add task data
                task_data = {
                    'content': doc,
                    'metadata': metadata,
                    'status': metadata.get('status', 'Unknown'),
                    'priority': metadata.get('priority', 'Unknown'),
                    'issue_type': metadata.get('issue_type', 'Unknown'),
                    'assignee': metadata.get('assignee', 'Unknown'),
                    'sprint': sprint_id
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
            
            logger.info(f"Debug: Processed {len(projects_data)} projects")
            logger.info(f"Debug: Project keys: {list(projects_data.keys())}")
            
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
            
            # Prepare context for LLM
            context = self._prepare_analysis_context(projects_data, request)
            logger.info(f"Prepared context for LLM analysis: {len(context)} characters")
            
            # Generate analysis based on type
            if request.analysisType == "comprehensive":
                return await self._generate_comprehensive_analysis(context, request)
            elif request.analysisType == "risk":
                return await self._generate_risk_analysis(context, request)
            elif request.analysisType == "performance":
                return await self._generate_performance_analysis(context, request)
            elif request.analysisType == "quality":
                return await self._generate_quality_analysis(context, request)
            elif request.analysisType == "trends":
                return await self._generate_trends_analysis(context, request)
            else:
                return await self._generate_comprehensive_analysis(context, request)
                
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
        for project_data in projects_data.values():
            if isinstance(project_data, dict) and 'tasks' in project_data:
                total_tasks += len(project_data['tasks'])
        
        context_parts.append(f"Portfolio Overview:")
        context_parts.append(f"- Total Projects: {total_projects}")
        context_parts.append(f"- Total Tasks: {total_tasks}")
        
        # Project details
        for project_id, project_data in projects_data.items():
            if not isinstance(project_data, dict):
                continue
                
            # Safely get tasks
            tasks = project_data.get('tasks', [])
            total_project_tasks = len(tasks)
            
            # Safely get statuses
            statuses = project_data.get('statuses', {})
            done_tasks = statuses.get('Done', 0)
            in_progress_tasks = statuses.get('In Progress', 0)
            blocked_tasks = statuses.get('Blocked', 0)
            todo_tasks = statuses.get('To Do', 0)
            
            # Safely get priorities
            priorities = project_data.get('priorities', {})
            high_priority = priorities.get('High', 0) + priorities.get('Critical', 0)
            medium_priority = priorities.get('Medium', 0)
            low_priority = priorities.get('Low', 0)
            
            # Safely get issue types
            issue_types = project_data.get('issue_types', {})
            bugs = issue_types.get('Bug', 0)
            stories = issue_types.get('Story', 0)
            task_count = issue_types.get('Task', 0)
            
            # Safely get assignees
            assignees = project_data.get('assignees', set())
            assignee_list = list(assignees) if isinstance(assignees, set) else []
            
            context_parts.append(f"\nProject: {project_id}")
            context_parts.append(f"- Total Tasks: {total_project_tasks}")
            context_parts.append(f"- Status: Done={done_tasks}, In Progress={in_progress_tasks}, Blocked={blocked_tasks}, To Do={todo_tasks}")
            context_parts.append(f"- Priority: High/Critical={high_priority}, Medium={medium_priority}, Low={low_priority}")
            context_parts.append(f"- Issue Types: Bug={bugs}, Story={stories}, Task={task_count}")
            context_parts.append(f"- Assignees: {', '.join(assignee_list)}")
        
        # Filters applied
        if request.sprint:
            context_parts.append(f"\nSprint Filter: {request.sprint}")
        if request.project:
            context_parts.append(f"Project Filter: {request.project}")
        
        return "\n".join(context_parts)
    
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
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return self._generate_fallback_analysis({}, request)
    
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
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing risk analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)
    
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
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing performance analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)
    
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
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing quality analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)
    
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
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            return analysis
            
        except Exception as e:
            logger.error(f"Error parsing trends analysis: {str(e)}")
            return self._generate_fallback_analysis({}, request)
    
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
