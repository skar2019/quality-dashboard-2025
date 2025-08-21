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
router = APIRouter(prefix="/api/summary-report", tags=["summary-report"])

# Request/Response models
class SummaryReportRequest(BaseModel):
    message: Optional[str] = Field(default=None, description="User message for summary report")
    sprint: Optional[str] = Field(default=None, description="Filter by sprint (e.g., Sprint-1, Sprint-2, Sprint-3)")
    project: Optional[str] = Field(default=None, description="Filter by project (e.g., Adani)")
    includeMetrics: Optional[bool] = Field(default=True, description="Include detailed metrics")
    reportType: Optional[str] = Field(default=None, description="Type of report: status, bottleneck, executive, historical, predictive")

class ProjectStatus(BaseModel):
    projectId: str = Field(..., description="Project ID")
    projectName: str = Field(..., description="Project name")
    status: str = Field(..., description="Project status: on-track, slight-issues, critical")
    completionPercentage: int = Field(..., description="Completion percentage")
    totalTasks: int = Field(..., description="Total number of tasks")
    completedTasks: int = Field(..., description="Number of completed tasks")
    overdueTasks: int = Field(..., description="Number of overdue tasks")
    blockedTasks: int = Field(..., description="Number of blocked tasks")
    sprintVelocity: int = Field(..., description="Sprint velocity")
    qualityScore: int = Field(..., description="Quality score (0-100)")
    riskLevel: str = Field(..., description="Risk level: low, medium, high")
    lastUpdated: str = Field(..., description="Last updated timestamp")
    summary: str = Field(..., description="Project summary")

class ReportData(BaseModel):
    reportType: str = Field(..., description="Type of report generated")
    metrics: Dict[str, Any] = Field(..., description="Report metrics and data")
    sections: List[Dict[str, Any]] = Field(..., description="Report sections with data")
    recommendations: List[str] = Field(..., description="List of recommendations")
    generatedAt: str = Field(..., description="Generation timestamp")

class SummaryReportResponse(BaseModel):
    projectStatuses: List[ProjectStatus] = Field(..., description="List of project statuses")
    overallStatus: str = Field(..., description="Overall status: on-track, slight-issues, critical")
    totalProjects: int = Field(..., description="Total number of projects")
    onTrackProjects: int = Field(..., description="Number of on-track projects")
    issuesProjects: int = Field(..., description="Number of projects with slight issues")
    criticalProjects: int = Field(..., description="Number of critical projects")
    summary: str = Field(..., description="Overall summary")
    reportData: Optional[ReportData] = Field(None, description="Structured report data")
    generatedAt: str = Field(..., description="Generation timestamp")

# New data-only models for clean separation
class PortfolioMetrics(BaseModel):
    totalProjects: int
    onTrackProjects: int
    issuesProjects: int
    criticalProjects: int
    averageCompletion: float
    averageQuality: float
    averageVelocity: float
    highRiskProjects: int
    mediumRiskProjects: int
    lowRiskProjects: int

class ProjectData(BaseModel):
    projectId: str
    projectName: str
    status: str
    completionPercentage: int
    totalTasks: int
    completedTasks: int
    overdueTasks: int
    blockedTasks: int
    sprintVelocity: int
    qualityScore: int
    riskLevel: str
    lastUpdated: str

class DataOnlySummaryReport(BaseModel):
    portfolioMetrics: PortfolioMetrics
    projects: List[ProjectData]
    recommendations: List[str]
    generatedAt: str

# Summary Report RAG Class
class SummaryReportRAG:
    def __init__(self):
        # Use the same path as in chatbot.py
        self.persist_directory = "./jira_tasks_chroma_db"
        
        # Initialize models
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.llm = Ollama(model="llama3")
        self.vectorstore = Chroma(persist_directory=self.persist_directory, embedding_function=self.embeddings, collection_name="project_data")
        
        logger.info("✅ Summary Report RAG initialized with LangChain components")
    
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
                metadata = all_docs['metadatas'][i]
                
                # Apply filters
                if sprint_filter and metadata.get('sprint_id', '').lower() != sprint_filter.lower():
                    continue
                if project_filter:
                    # Handle different project name formats
                    project_id = metadata.get('project_id', '').lower()
                    project_filter_lower = project_filter.lower()
                    
                    # Check for exact match or partial match
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
            
            return {
                "projects": projects_data,
                "total_docs": len(all_docs['documents'])
            }
            
        except Exception as e:
            logger.error(f"Error extracting project data: {str(e)}")
            return {"projects": {}, "total_docs": 0}
    
    def calculate_project_metrics(self, project_data: Dict[str, Any]) -> ProjectStatus:
        """Calculate metrics for a single project"""
        try:
            # Ensure project_data has the required structure
            if not isinstance(project_data, dict):
                logger.error(f"Invalid project_data type: {type(project_data)}")
                return self._create_default_project_status("Invalid Project")
            
            if 'tasks' not in project_data:
                logger.error(f"Missing 'tasks' key in project_data. Keys: {list(project_data.keys())}")
                return self._create_default_project_status(project_data.get('name', 'Unknown Project'))
            
            tasks = project_data['tasks']
            total_tasks = len(tasks)
            
            if total_tasks == 0:
                return ProjectStatus(
                    projectId=project_data['name'],
                    projectName=project_data['name'],
                    status='on-track',
                    completionPercentage=0,
                    totalTasks=0,
                    completedTasks=0,
                    overdueTasks=0,
                    blockedTasks=0,
                    sprintVelocity=0,
                    qualityScore=100,
                    riskLevel='low',
                    lastUpdated=datetime.now().isoformat(),
                    summary=f"No tasks found for {project_data['name']}."
                )
            
            # Calculate completion percentage
            completed_tasks = project_data['statuses'].get('Done', 0)
            completion_percentage = int((completed_tasks / total_tasks) * 100)
            
            # Calculate overdue tasks (tasks in progress for too long)
            overdue_tasks = 0
            blocked_tasks = 0
            
            # Calculate sprint velocity (average tasks per sprint)
            unique_sprints = len(project_data['sprints'])
            sprint_velocity = total_tasks // max(unique_sprints, 1)
            
            # Calculate quality score based on various factors
            quality_score = 100
            
            # Deduct points for overdue tasks
            if overdue_tasks > 0:
                quality_score -= min(20, overdue_tasks * 2)
            
            # Deduct points for blocked tasks
            if blocked_tasks > 0:
                quality_score -= min(15, blocked_tasks * 3)
            
            # Deduct points for low completion rate
            if completion_percentage < 50:
                quality_score -= 20
            elif completion_percentage < 75:
                quality_score -= 10
            
            # Ensure quality score is within bounds
            quality_score = max(0, min(100, quality_score))
            
            # Determine status based on metrics
            if completion_percentage >= 75 and quality_score >= 80:
                status = 'on-track'
            elif completion_percentage >= 50 and quality_score >= 60:
                status = 'slight-issues'
            else:
                status = 'critical'
            
            # Determine risk level
            if status == 'critical':
                risk_level = 'high'
            elif status == 'slight-issues':
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            # Generate summary
            summary = f"{project_data['name']} has {total_tasks} tasks with {completion_percentage}% completion. "
            summary += f"Quality score: {quality_score}/100. "
            if status == 'on-track':
                summary += "Project is progressing well."
            elif status == 'slight-issues':
                summary += "Project has some issues that need attention."
            else:
                summary += "Project requires immediate intervention."
            
            return ProjectStatus(
                projectId=project_data['name'],
                projectName=project_data['name'],
                status=status,
                completionPercentage=completion_percentage,
                totalTasks=total_tasks,
                completedTasks=completed_tasks,
                overdueTasks=overdue_tasks,
                blockedTasks=blocked_tasks,
                sprintVelocity=sprint_velocity,
                qualityScore=quality_score,
                riskLevel=risk_level,
                lastUpdated=datetime.now().isoformat(),
                summary=summary
            )
            
        except Exception as e:
            logger.error(f"Error calculating project metrics: {str(e)}")
            project_name = project_data.get('name', 'Unknown Project') if isinstance(project_data, dict) else 'Unknown Project'
            return self._create_default_project_status(project_name, f"Error calculating metrics: {str(e)}")
    
    def _create_default_project_status(self, project_name: str, error_message: str = None) -> ProjectStatus:
        """Create a default project status for error cases"""
        summary = f"No tasks found for {project_name}."
        if error_message:
            summary = f"Error processing {project_name}: {error_message}"
        
        return ProjectStatus(
            projectId=project_name,
            projectName=project_name,
            status='on-track',
            completionPercentage=0,
            totalTasks=0,
            completedTasks=0,
            overdueTasks=0,
            blockedTasks=0,
            sprintVelocity=0,
            qualityScore=100,
            riskLevel='low',
            lastUpdated=datetime.now().isoformat(),
            summary=summary
        )
    
    async def generate_summary_report(self, request: SummaryReportRequest) -> SummaryReportResponse:
        """Generate summary report with RAG - returns formatted response for backward compatibility"""
        try:
            start_time = time.time()
            logger.info(f"Generating summary report for sprint={request.sprint}, project={request.project}")
            
            # Extract project data
            projects_data = self.extract_project_data(request.sprint, request.project)
            
            if not projects_data["projects"]:
                logger.info(f"No projects found for sprint={request.sprint}, project={request.project}")
                return SummaryReportResponse(
                    projectStatuses=[],
                    overallStatus='on-track',
                    totalProjects=0,
                    onTrackProjects=0,
                    issuesProjects=0,
                    criticalProjects=0,
                    summary="No projects found matching the specified criteria.",
                    generatedAt=datetime.now().isoformat()
                )
            
            # Calculate project statuses
            project_statuses = []
            logger.info(f"Debug: Projects data keys: {list(projects_data['projects'].keys())}")
            for project_id, project_data in projects_data["projects"].items():
                try:
                    logger.info(f"Calculating metrics for project: {project_id}")
                    logger.info(f"Debug: Project data keys: {list(project_data.keys())}")
                    project_status = self.calculate_project_metrics(project_data)
                    project_statuses.append(project_status)
                except Exception as e:
                    logger.error(f"Error calculating metrics for project {project_id}: {str(e)}")
                    # Create a default status for this project
                    default_status = self._create_default_project_status(project_id, f"Error: {str(e)}")
                    project_statuses.append(default_status)
            
            # Calculate overall status
            on_track_count = sum(1 for p in project_statuses if p.status == 'on-track')
            issues_count = sum(1 for p in project_statuses if p.status == 'slight-issues')
            critical_count = sum(1 for p in project_statuses if p.status == 'critical')
            
            if critical_count > 0:
                overall_status = 'critical'
            elif issues_count > 0:
                overall_status = 'slight-issues'
            else:
                overall_status = 'on-track'
            
            # Generate report based on type
            report_data = None
            if request.reportType == "bottleneck":
                report_data = self.generate_bottleneck_analysis(projects_data["projects"], request.sprint, request.project)
                summary = f"Bottleneck and Process Analysis Report generated for {len(projects_data['projects'])} projects"
            elif request.reportType == "executive":
                report_data = self.generate_executive_summary(project_statuses, request.sprint, request.project)
                summary = f"Executive Summary Report generated for {len(project_statuses)} projects"
            elif request.reportType == "historical":
                report_data = self.generate_historical_trends(projects_data["projects"], request.sprint, request.project)
                summary = f"Historical Trends and Predictive Analytics Report generated for {len(projects_data['projects'])} projects"
            elif request.reportType == "predictive":
                summary = self.generate_predictive_analytics(project_statuses, request.sprint, request.project)
            elif request.reportType == "sprint_velocity":
                report_data = self.generate_sprint_velocity_burndown(projects_data["projects"], request.sprint, request.project)
                summary = f"Sprint Velocity & Burn-Down Report generated for {len(projects_data['projects'])} projects"
            else:
                # Default Status Summary Report
                summary = self.generate_status_summary(project_statuses, request.sprint, request.project)
            
            query_time = time.time() - start_time
            logger.info(f"Summary report generated in {query_time:.2f}s")
            
            return SummaryReportResponse(
                projectStatuses=project_statuses,
                overallStatus=overall_status,
                totalProjects=len(project_statuses),
                onTrackProjects=on_track_count,
                issuesProjects=issues_count,
                criticalProjects=critical_count,
                summary=summary,
                reportData=report_data,
                generatedAt=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error generating summary report: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate summary report: {str(e)}"
            )

    async def generate_data_only_report(self, request: SummaryReportRequest) -> DataOnlySummaryReport:
        """Generate data-only report without any display formatting"""
        try:
            start_time = time.time()
            logger.info(f"Generating data-only report for sprint={request.sprint}, project={request.project}")
            
            # Extract project data
            projects_data = self.extract_project_data(request.sprint, request.project)
            
            if not projects_data["projects"]:
                return DataOnlySummaryReport(
                    portfolioMetrics=PortfolioMetrics(
                        totalProjects=0,
                        onTrackProjects=0,
                        issuesProjects=0,
                        criticalProjects=0,
                        averageCompletion=0.0,
                        averageQuality=0.0,
                        averageVelocity=0.0,
                        highRiskProjects=0,
                        mediumRiskProjects=0,
                        lowRiskProjects=0
                    ),
                    projects=[],
                    recommendations=["No projects found matching the specified criteria."],
                    generatedAt=datetime.now().isoformat()
                )
            
            # Calculate project statuses
            project_statuses = []
            for project_id, project_data in projects_data["projects"].items():
                project_status = self.calculate_project_metrics(project_data)
                project_statuses.append(project_status)
            
            # Calculate portfolio metrics
            total_projects = len(project_statuses)
            on_track_count = sum(1 for p in project_statuses if p.status == 'on-track')
            issues_count = sum(1 for p in project_statuses if p.status == 'slight-issues')
            critical_count = sum(1 for p in project_statuses if p.status == 'critical')
            
            avg_completion = sum(p.completionPercentage for p in project_statuses) / total_projects if total_projects > 0 else 0
            avg_quality = sum(p.qualityScore for p in project_statuses) / total_projects if total_projects > 0 else 0
            avg_velocity = sum(p.sprintVelocity for p in project_statuses if p.sprintVelocity > 0) / max(1, len([p for p in project_statuses if p.sprintVelocity > 0]))
            
            # Calculate risk distribution
            high_risk = sum(1 for p in project_statuses if p.qualityScore < 70 or p.completionPercentage < 50)
            medium_risk = sum(1 for p in project_statuses if (p.qualityScore >= 70 and p.qualityScore < 85) or (p.completionPercentage >= 50 and p.completionPercentage < 70))
            low_risk = sum(1 for p in project_statuses if p.qualityScore >= 85 and p.completionPercentage >= 70)
            
            # Convert to ProjectData format
            projects_data_list = []
            for project in project_statuses:
                projects_data_list.append(ProjectData(
                    projectId=project.projectId,
                    projectName=project.projectName,
                    status=project.status,
                    completionPercentage=project.completionPercentage,
                    totalTasks=project.totalTasks,
                    completedTasks=project.completedTasks,
                    overdueTasks=project.overdueTasks,
                    blockedTasks=project.blockedTasks,
                    sprintVelocity=project.sprintVelocity,
                    qualityScore=project.qualityScore,
                    riskLevel=project.riskLevel,
                    lastUpdated=project.lastUpdated
                ))
            
            # Generate recommendations based on data
            recommendations = self.generate_data_based_recommendations(project_statuses, avg_completion, avg_quality, avg_velocity)
            
            query_time = time.time() - start_time
            logger.info(f"Data-only report generated in {query_time:.2f}s")
            
            return DataOnlySummaryReport(
                portfolioMetrics=PortfolioMetrics(
                    totalProjects=total_projects,
                    onTrackProjects=on_track_count,
                    issuesProjects=issues_count,
                    criticalProjects=critical_count,
                    averageCompletion=avg_completion,
                    averageQuality=avg_quality,
                    averageVelocity=avg_velocity,
                    highRiskProjects=high_risk,
                    mediumRiskProjects=medium_risk,
                    lowRiskProjects=low_risk
                ),
                projects=projects_data_list,
                recommendations=recommendations,
                generatedAt=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error generating data-only report: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate data-only report: {str(e)}"
            )

    def generate_data_based_recommendations(self, project_statuses: List[ProjectStatus], avg_completion: float, avg_quality: float, avg_velocity: float) -> List[str]:
        """Generate recommendations based on pure data analysis"""
        recommendations = []
        
        if avg_completion < 60:
            recommendations.append("Focus on improving project completion rates")
        if avg_quality < 75:
            recommendations.append("Implement quality improvement initiatives")
        if avg_velocity < 5:
            recommendations.append("Address team capacity constraints")
        
        critical_projects = [p for p in project_statuses if p.status == 'critical']
        if len(critical_projects) > 0:
            recommendations.append(f"Escalate {len(critical_projects)} critical projects to stakeholders")
        
        high_risk_projects = [p for p in project_statuses if p.qualityScore < 70 or p.completionPercentage < 50]
        if len(high_risk_projects) > len(project_statuses) * 0.3:
            recommendations.append("Portfolio health requires immediate intervention")
        
        return recommendations
    
    def generate_status_summary(self, project_statuses: List[ProjectStatus], sprint_filter: str = None, project_filter: str = None) -> str:
        """Generate pure data summary without display formatting"""
        # Calculate metrics
        total_projects = len(project_statuses)
        on_track = [p for p in project_statuses if p.status == 'on-track']
        issues = [p for p in project_statuses if p.status == 'slight-issues']
        critical = [p for p in project_statuses if p.status == 'critical']
        
        avg_completion = sum(p.completionPercentage for p in project_statuses) / total_projects if total_projects > 0 else 0
        avg_quality = sum(p.qualityScore for p in project_statuses) / total_projects if total_projects > 0 else 0
        avg_velocity = sum(p.sprintVelocity for p in project_statuses if p.sprintVelocity > 0) / max(1, len([p for p in project_statuses if p.sprintVelocity > 0]))
        
        # Return pure data summary without formatting
        summary = f"Status summary for {total_projects} projects. "
        summary += f"On-track: {len(on_track)}, Issues: {len(issues)}, Critical: {len(critical)}. "
        summary += f"Average completion: {avg_completion:.1f}%, quality: {avg_quality:.1f}/100, velocity: {avg_velocity:.1f} tasks/sprint."
        
        return summary
    
    def generate_bottleneck_analysis(self, projects_data: Dict[str, Any], sprint_filter: str = None, project_filter: str = None) -> Dict[str, Any]:
        """Generate Enhanced Bottleneck and Process Analysis Report with Comprehensive Data"""
        
        # Initialize recommendations at the beginning
        recommendations = []
        
        # Executive Summary
        total_projects = len(projects_data)
        total_tasks = sum(len(project_data['tasks']) for project_data in projects_data.values())
        total_blocked = sum(sum(1 for task in project_data['tasks'] if task['status'] == 'Blocked') for project_data in projects_data.values())
        total_overdue = sum(sum(1 for task in project_data['tasks'] if task.get('overdue', False)) for project_data in projects_data.values())
        
        executive_summary = {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "total_blocked": total_blocked,
            "total_overdue": total_overdue,
            "blockage_rate": round(total_blocked/total_tasks*100, 1) if total_tasks > 0 else 0,
            "overdue_rate": round(total_overdue/total_tasks*100, 1) if total_tasks > 0 else 0,
            "portfolio_status": "critical" if total_blocked > total_tasks * 0.15 else "warning" if total_blocked > total_tasks * 0.10 else "healthy"
        }
        
        # Project Analysis
        project_analysis = []
        for project_id, project_data in projects_data.items():
            tasks = project_data['tasks']
            project_total_tasks = len(tasks)
            
            # Task Status Analysis
            blocked_tasks = [task for task in tasks if task['status'] == 'Blocked']
            in_progress_tasks = [task for task in tasks if task['status'] == 'In Progress']
            done_tasks = [task for task in tasks if task['status'] == 'Done']
            todo_tasks = [task for task in tasks if task['status'] == 'To Do']
            overdue_tasks = [task for task in tasks if task.get('overdue', False)]
            
            # Bottleneck Analysis
            blockage_rate = len(blocked_tasks) / project_total_tasks * 100 if project_total_tasks > 0 else 0
            bottleneck_status = "critical" if blockage_rate > 15 else "warning" if blockage_rate > 10 else "healthy"
            
            # Analyze blocked task patterns
            blocked_reasons = {}
            blocked_assignees = {}
            blocked_types = {}
            
            for task in blocked_tasks:
                reason = task.get('blocked_reason', 'Unknown')
                blocked_reasons[reason] = blocked_reasons.get(reason, 0) + 1
                
                assignee = task.get('assignee', 'Unassigned')
                blocked_assignees[assignee] = blocked_assignees.get(assignee, 0) + 1
                
                task_type = task.get('type', 'Unknown')
                blocked_types[task_type] = blocked_types.get(task_type, 0) + 1
            
            # Resource Allocation Analysis
            assignees = {}
            for task in tasks:
                assignee = task['assignee']
                if assignee not in assignees:
                    assignees[assignee] = {'total': 0, 'blocked': 0, 'in_progress': 0, 'done': 0}
                assignees[assignee]['total'] += 1
                if task['status'] == 'Blocked':
                    assignees[assignee]['blocked'] += 1
                elif task['status'] == 'In Progress':
                    assignees[assignee]['in_progress'] += 1
                elif task['status'] == 'Done':
                    assignees[assignee]['done'] += 1
            
            # Process Flow Analysis
            flow_efficiency = len(done_tasks) / (len(done_tasks) + len(in_progress_tasks) + len(blocked_tasks)) * 100 if (len(done_tasks) + len(in_progress_tasks) + len(blocked_tasks)) > 0 else 0
            bottleneck_impact = len(blocked_tasks) / (len(in_progress_tasks) + len(blocked_tasks)) * 100 if (len(in_progress_tasks) + len(blocked_tasks)) > 0 else 0
            
            project_analysis.append({
                "project_id": project_id,
                "total_tasks": project_total_tasks,
                "task_distribution": {
                    "done": len(done_tasks),
                    "in_progress": len(in_progress_tasks),
                    "blocked": len(blocked_tasks),
                    "todo": len(todo_tasks),
                    "overdue": len(overdue_tasks)
                },
                "bottleneck_analysis": {
                    "blockage_rate": round(blockage_rate, 1),
                    "status": bottleneck_status,
                    "blocked_reasons": blocked_reasons,
                    "blocked_assignees": blocked_assignees,
                    "blocked_types": blocked_types
                },
                "resource_allocation": assignees,
                "process_flow": {
                    "flow_efficiency": round(flow_efficiency, 1),
                    "bottleneck_impact": round(bottleneck_impact, 1)
                }
            })
        
        # Portfolio-level Recommendations
        recommendations = []
        if total_blocked > total_tasks * 0.15:
            recommendations.extend([
                "Conduct emergency bottleneck resolution sessions",
                "Reallocate resources to blocked work",
                "Escalate to senior management"
            ])
        elif total_blocked > total_tasks * 0.10:
            recommendations.extend([
                "Schedule daily bottleneck review meetings",
                "Implement task dependency mapping",
                "Review resource allocation"
            ])
        else:
            recommendations.extend([
                "Continue monitoring for early warning signs",
                "Implement preventive measures",
                "Focus on process improvement"
            ])
        
        # Ensure recommendations is always a list and has content
        if not isinstance(recommendations, list):
            recommendations = []
        
        # Add default recommendations if none were generated
        if len(recommendations) == 0:
            recommendations = [
                "Monitor project progress regularly",
                "Review resource allocation",
                "Implement process improvements"
            ]
        
        # Process Improvements
        process_improvements = [
            "Implement daily standups focused on blockers",
            "Create dependency tracking system",
            "Establish escalation procedures",
            "Regular capacity planning reviews",
            "Cross-training team members"
        ]
        
        result = {
            "reportType": "bottleneck_analysis",
            "metrics": {
                "executive_summary": executive_summary,
                "project_analysis": project_analysis,
                "process_improvements": process_improvements,
                "recommendations": recommendations,
                "filters": {
                    "sprint_filter": sprint_filter,
                    "project_filter": project_filter
                }
            },
            "sections": [
                {
                    "title": "Executive Summary",
                    "data": executive_summary
                },
                {
                    "title": "Project Analysis",
                    "data": project_analysis
                },
                {
                    "title": "Recommendations",
                    "data": recommendations
                },
                {
                    "title": "Process Improvements",
                    "data": process_improvements
                }
            ],
            "recommendations": recommendations,
            "generatedAt": datetime.now().isoformat()
        }
        
        print(f"DEBUG: Bottleneck analysis result structure: {result}")
        print(f"DEBUG: Recommendations type: {type(recommendations)}, value: {recommendations}")
        
        return result
    
    def generate_executive_summary(self, project_statuses: List[ProjectStatus], sprint_filter: str = None, project_filter: str = None) -> Dict[str, Any]:
        """Generate Enhanced Executive Summary Report for Leadership with Comprehensive Data"""
        
        # Initialize recommendations at the beginning
        recommendations = []
        
        # Executive Overview
        total_projects = len(project_statuses)
        critical_projects = [p for p in project_statuses if p.status == 'critical']
        on_track_projects = [p for p in project_statuses if p.status == 'on-track']
        issues_projects = [p for p in project_statuses if p.status == 'slight-issues']
        
        executive_overview = {
            "total_projects": total_projects,
            "on_track_projects": len(on_track_projects),
            "issues_projects": len(issues_projects),
            "critical_projects": len(critical_projects),
            "on_track_percentage": round(len(on_track_projects)/total_projects*100, 1) if total_projects > 0 else 0,
            "issues_percentage": round(len(issues_projects)/total_projects*100, 1) if total_projects > 0 else 0,
            "critical_percentage": round(len(critical_projects)/total_projects*100, 1) if total_projects > 0 else 0
        }
        
        # Portfolio Health Score
        avg_completion = sum(p.completionPercentage for p in project_statuses) / total_projects if total_projects > 0 else 0
        avg_quality = sum(p.qualityScore for p in project_statuses) / total_projects if total_projects > 0 else 0
        avg_velocity = sum(p.sprintVelocity for p in project_statuses if p.sprintVelocity > 0) / max(1, len([p for p in project_statuses if p.sprintVelocity > 0]))
        
        # Calculate portfolio health score
        health_score = 0
        if avg_completion >= 80: health_score += 30
        elif avg_completion >= 60: health_score += 20
        elif avg_completion >= 40: health_score += 10
        
        if avg_quality >= 85: health_score += 30
        elif avg_quality >= 70: health_score += 20
        elif avg_quality >= 55: health_score += 10
        
        if len(critical_projects) == 0: health_score += 20
        elif len(critical_projects) <= total_projects * 0.1: health_score += 10
        
        if avg_velocity >= 8: health_score += 20
        elif avg_velocity >= 5: health_score += 10
        
        # Health status
        if health_score >= 80:
            health_status = "excellent"
        elif health_score >= 60:
            health_status = "good"
        elif health_score >= 40:
            health_status = "fair"
        else:
            health_status = "poor"
        
        portfolio_health = {
            "health_score": health_score,
            "average_completion": round(avg_completion, 1),
            "average_quality": round(avg_quality, 1),
            "average_velocity": round(avg_velocity, 1),
            "health_status": health_status
        }
        
        # Critical Risk Assessment
        critical_risk_assessment = {}
        
        if critical_projects:
            # Determine risk level
            if len(critical_projects) > total_projects * 0.2:
                risk_level = "high"
            elif len(critical_projects) > total_projects * 0.1:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Analyze critical projects
            critical_project_details = []
            for project in critical_projects:
                risk_factors = []
                
                if project.completionPercentage < 30:
                    risk_factors.append("early_stage_low_completion")
                elif project.completionPercentage < 50:
                    risk_factors.append("behind_schedule")
                
                if project.qualityScore < 60:
                    risk_factors.append("critical_quality_issues")
                elif project.qualityScore < 70:
                    risk_factors.append("quality_below_threshold")
                
                if project.sprintVelocity < 3:
                    risk_factors.append("low_team_velocity")
                
                critical_project_details.append({
                    "project_name": project.projectName,
                    "completion_percentage": project.completionPercentage,
                    "completed_tasks": project.completedTasks,
                    "total_tasks": project.totalTasks,
                    "quality_score": project.qualityScore,
                    "sprint_velocity": project.sprintVelocity,
                    "risk_factors": risk_factors
                })
            
            critical_risk_assessment = {
                "has_critical_projects": True,
                "critical_project_count": len(critical_projects),
                "risk_level": risk_level,
                "critical_projects": critical_project_details
            }
        else:
            critical_risk_assessment = {
                "has_critical_projects": False,
                "critical_project_count": 0,
                "risk_level": "low",
                "critical_projects": []
            }
        
        # Strategic Insights
        strategic_insights = []
        
        # Completion insights
        if avg_completion < 50:
            strategic_insights.append("Portfolio completion is below 50% - Consider timeline adjustments")
        elif avg_completion > 80:
            strategic_insights.append("Portfolio completion is above 80% - Excellent progress")
        
        # Quality insights
        if avg_quality < 75:
            strategic_insights.append("Quality scores below target - Quality improvement initiatives needed")
        elif avg_quality > 90:
            strategic_insights.append("Outstanding quality performance - Consider sharing best practices")
        
        # Velocity insights
        if avg_velocity < 5:
            strategic_insights.append("Team velocity suggests capacity constraints - Resource planning review needed")
        elif avg_velocity > 10:
            strategic_insights.append("High team velocity - Consider taking on additional work")
        
        # Critical project insights
        if len(critical_projects) > total_projects * 0.3:
            strategic_insights.append("High percentage of critical projects - Portfolio restructuring may be needed")
        
        # Executive Decisions Required
        executive_decisions = {
            "immediate_decisions": [],
            "quality_decisions": [],
            "resource_decisions": [],
            "monitoring_decisions": [
                "Establish weekly executive dashboard reviews",
                "Implement monthly portfolio health assessments",
                "Schedule quarterly strategic portfolio reviews"
            ]
        }
        
        if len(critical_projects) > 0:
            executive_decisions["immediate_decisions"].extend([
                "Approve additional resources for critical projects",
                "Consider project timeline extensions",
                "Evaluate project cancellation for severely at-risk initiatives",
                "Schedule executive steering committee meetings"
            ])
        
        if avg_quality < 75:
            executive_decisions["quality_decisions"].extend([
                "Approve quality improvement budget",
                "Mandate quality gates in development process",
                "Consider external quality consultants"
            ])
        
        if avg_velocity < 5:
            executive_decisions["resource_decisions"].extend([
                "Approve additional team members",
                "Consider outsourcing options",
                "Review team structure and processes"
            ])
        
        # Financial Impact Assessment
        total_risk_value = 0
        for project in critical_projects:
            # Simple risk value calculation (can be enhanced with actual financial data)
            risk_value = (100 - project.completionPercentage) * 0.1  # Risk value based on completion
            total_risk_value += risk_value
        
        # Financial risk status
        if total_risk_value > 5:
            financial_risk_status = "high"
        elif total_risk_value > 2:
            financial_risk_status = "moderate"
        else:
            financial_risk_status = "low"
        
        financial_impact = {
            "estimated_portfolio_risk_value": round(total_risk_value, 1),
            "critical_projects_risk_value": round(total_risk_value, 1),
            "financial_risk_status": financial_risk_status
        }
        
        # Next Steps and Timeline
        next_steps_timeline = {
            "this_week": "Review critical project recovery plans",
            "next_week": "Resource allocation decisions",
            "this_month": "Portfolio health improvement initiatives",
            "next_quarter": "Strategic portfolio planning"
        }
        
        # Generate recommendations
        if len(critical_projects) > 0:
            recommendations.extend([
                "Prioritize critical project recovery",
                "Allocate additional resources to at-risk projects",
                "Implement enhanced monitoring for critical projects"
            ])
        
        if avg_quality < 75:
            recommendations.extend([
                "Implement quality improvement initiatives",
                "Establish quality gates in development process",
                "Consider quality-focused training programs"
            ])
        
        if avg_velocity < 5:
            recommendations.extend([
                "Review team capacity and resource allocation",
                "Consider team expansion or process improvements",
                "Implement velocity tracking and optimization"
            ])
        
        # Ensure recommendations is always a list and has content
        if not isinstance(recommendations, list):
            recommendations = []
        
        # Add default recommendations if none were generated
        if len(recommendations) == 0:
            recommendations = [
                "Continue monitoring portfolio health",
                "Maintain current performance levels",
                "Focus on continuous improvement"
            ]
        
        return {
            "reportType": "executive_summary",
            "metrics": {
                "executive_overview": executive_overview,
                "portfolio_health": portfolio_health,
                "critical_risk_assessment": critical_risk_assessment,
                "strategic_insights": strategic_insights,
                "executive_decisions": executive_decisions,
                "financial_impact": financial_impact,
                "next_steps_timeline": next_steps_timeline,
                "recommendations": recommendations,
                "filters": {
                    "sprint_filter": sprint_filter,
                    "project_filter": project_filter
                }
            },
            "sections": [
                {
                    "title": "Executive Overview",
                    "data": executive_overview
                },
                {
                    "title": "Portfolio Health",
                    "data": portfolio_health
                },
                {
                    "title": "Critical Risk Assessment",
                    "data": critical_risk_assessment
                },
                {
                    "title": "Strategic Insights",
                    "data": strategic_insights
                },
                {
                    "title": "Executive Decisions",
                    "data": executive_decisions
                },
                {
                    "title": "Financial Impact",
                    "data": financial_impact
                },
                {
                    "title": "Next Steps Timeline",
                    "data": next_steps_timeline
                }
            ],
            "recommendations": recommendations,
            "generatedAt": datetime.now().isoformat()
        }
    
    def generate_historical_trends(self, projects_data: Dict[str, Any], sprint_filter: str = None, project_filter: str = None) -> Dict[str, Any]:
        """Generate Enhanced Historical Trends and Predictive Analytics Report with Comprehensive Data"""
        
        # Initialize recommendations at the beginning
        recommendations = []
        
        # Executive Summary
        total_projects = len(projects_data)
        total_tasks = sum(len(project_data['tasks']) for project_data in projects_data.values())
        total_sprints = sum(len(project_data['sprints']) for project_data in projects_data.values())
        
        executive_summary = {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "total_sprints": total_sprints,
            "average_tasks_per_sprint": round(total_tasks/total_sprints, 1) if total_sprints > 0 else 0
        }
        
        # Portfolio-Level Historical Analysis
        # Aggregate sprint data across all projects
        all_sprint_metrics = {}
        all_task_types = {}
        all_assignees = {}
        
        for project_data in projects_data.values():
            tasks = project_data['tasks']
            for task in tasks:
                sprint = task.get('sprint', 'Unknown')
                task_type = task.get('type', 'Unknown')
                assignee = task.get('assignee', 'Unassigned')
                status = task.get('status', 'Unknown')
                
                # Sprint metrics
                if sprint not in all_sprint_metrics:
                    all_sprint_metrics[sprint] = {'total': 0, 'completed': 0, 'blocked': 0, 'in_progress': 0, 'todo': 0}
                all_sprint_metrics[sprint]['total'] += 1
                
                if status == 'Done':
                    all_sprint_metrics[sprint]['completed'] += 1
                elif status == 'Blocked':
                    all_sprint_metrics[sprint]['blocked'] += 1
                elif status == 'In Progress':
                    all_sprint_metrics[sprint]['in_progress'] += 1
                elif status == 'To Do':
                    all_sprint_metrics[sprint]['todo'] += 1
                
                # Task type metrics
                if task_type not in all_task_types:
                    all_task_types[task_type] = {'total': 0, 'completed': 0, 'blocked': 0}
                all_task_types[task_type]['total'] += 1
                if status == 'Done':
                    all_task_types[task_type]['completed'] += 1
                elif status == 'Blocked':
                    all_task_types[task_type]['blocked'] += 1
                
                # Assignee metrics
                if assignee not in all_assignees:
                    all_assignees[assignee] = {'total': 0, 'completed': 0, 'blocked': 0, 'velocity': 0}
                all_assignees[assignee]['total'] += 1
                if status == 'Done':
                    all_assignees[assignee]['completed'] += 1
                elif status == 'Blocked':
                    all_assignees[assignee]['blocked'] += 1
        
        # Sprint Progression Analysis
        sprint_analysis = []
        if all_sprint_metrics:
            # Sort sprints by name (assuming Sprint-1, Sprint-2, etc.)
            sorted_sprints = sorted(all_sprint_metrics.keys(), key=lambda x: x.replace('Sprint-', '').zfill(3))
            
            for sprint in sorted_sprints:
                metrics = all_sprint_metrics[sprint]
                completion_rate = metrics['completed'] / metrics['total'] * 100 if metrics['total'] > 0 else 0
                blocked_rate = metrics['blocked'] / metrics['total'] * 100 if metrics['total'] > 0 else 0
                flow_efficiency = metrics['completed'] / (metrics['completed'] + metrics['in_progress'] + metrics['blocked']) * 100 if (metrics['completed'] + metrics['in_progress'] + metrics['blocked']) > 0 else 0
                
                # Sprint health status
                if completion_rate >= 80:
                    health_status = "excellent"
                elif completion_rate >= 60:
                    health_status = "good"
                else:
                    health_status = "needs_attention"
                
                # Blockage status
                if blocked_rate > 20:
                    blockage_status = "high"
                elif blocked_rate > 10:
                    blockage_status = "moderate"
                else:
                    blockage_status = "low"
                
                sprint_analysis.append({
                    "sprint": sprint,
                    "metrics": metrics,
                    "completion_rate": round(completion_rate, 1),
                    "blocked_rate": round(blocked_rate, 1),
                    "flow_efficiency": round(flow_efficiency, 1),
                    "health_status": health_status,
                    "blockage_status": blockage_status
                })
        
        # Task Type Performance Analysis
        task_type_analysis = []
        for task_type, metrics in all_task_types.items():
            completion_rate = metrics['completed'] / metrics['total'] * 100 if metrics['total'] > 0 else 0
            blocked_rate = metrics['blocked'] / metrics['total'] * 100 if metrics['total'] > 0 else 0
            
            # Performance status
            if completion_rate >= 85:
                performance_status = "outstanding"
            elif completion_rate >= 70:
                performance_status = "good"
            else:
                performance_status = "needs_improvement"
            
            # Blockage status
            blockage_status = "high" if blocked_rate > 15 else "low"
            
            task_type_analysis.append({
                "task_type": task_type,
                "metrics": metrics,
                "completion_rate": round(completion_rate, 1),
                "blocked_rate": round(blocked_rate, 1),
                "performance_status": performance_status,
                "blockage_status": blockage_status
            })
        
        # Team Performance Trends
        team_performance = []
        for assignee, metrics in all_assignees.items():
            if metrics['total'] > 0:
                completion_rate = metrics['completed'] / metrics['total'] * 100
                blocked_rate = metrics['blocked'] / metrics['total'] * 100
                velocity = metrics['completed'] / max(1, len([s for s in all_sprint_metrics.keys() if s != 'Unknown']))
                
                # Performance assessment
                if completion_rate >= 80 and blocked_rate < 10:
                    performance_status = "excellent"
                elif completion_rate >= 65 and blocked_rate < 15:
                    performance_status = "good"
                else:
                    performance_status = "needs_support"
                
                # Issues
                issues = []
                if blocked_rate > 20:
                    issues.append("high_blockage")
                if velocity < 3:
                    issues.append("low_velocity")
                
                team_performance.append({
                    "assignee": assignee,
                    "metrics": metrics,
                    "completion_rate": round(completion_rate, 1),
                    "blocked_rate": round(blocked_rate, 1),
                    "velocity": round(velocity, 1),
                    "performance_status": performance_status,
                    "issues": issues
                })
        
        # Predictive Analytics
        predictive_analytics = {}
        
        # Calculate trends
        if len(sorted_sprints) >= 2:
            recent_sprints = sorted_sprints[-2:]
            older_sprints = sorted_sprints[:-2]
            
            if older_sprints and recent_sprints:
                # Recent vs older performance comparison
                recent_completion = sum(all_sprint_metrics[s]['completed'] for s in recent_sprints) / sum(all_sprint_metrics[s]['total'] for s in recent_sprints) * 100
                older_completion = sum(all_sprint_metrics[s]['completed'] for s in older_sprints) / sum(all_sprint_metrics[s]['total'] for s in older_sprints) * 100
                
                completion_trend = recent_completion - older_completion
                
                # Trend direction
                if completion_trend > 0:
                    trend_direction = "improving"
                elif completion_trend < 0:
                    trend_direction = "declining"
                else:
                    trend_direction = "stable"
                
                # Predictions based on trends
                if completion_trend > 5:
                    prediction = "Strong positive momentum - consider increasing sprint capacity"
                elif completion_trend > 0:
                    prediction = "Steady improvement - maintain current approach"
                elif completion_trend > -5:
                    prediction = "Slight decline - monitor closely, minor adjustments may be needed"
                else:
                    prediction = "Significant decline - immediate intervention required"
                
                predictive_analytics = {
                    "recent_sprints": recent_sprints,
                    "older_sprints": older_sprints,
                    "recent_completion": round(recent_completion, 1),
                    "older_completion": round(older_completion, 1),
                    "completion_trend": round(completion_trend, 1),
                    "trend_direction": trend_direction,
                    "prediction": prediction
                }
        
        # Risk Forecasting
        risk_forecasting = {}
        
        # Identify recurring patterns
        high_blockage_sprints = [s for s, m in all_sprint_metrics.items() if m['blocked'] / m['total'] > 0.15 if m['total'] > 0]
        low_completion_sprints = [s for s, m in all_sprint_metrics.items() if m['completed'] / m['total'] < 0.6 if m['total'] > 0]
        
        risk_forecasting = {
            "high_blockage_sprints": high_blockage_sprints,
            "low_completion_sprints": low_completion_sprints,
            "high_blockage_count": len(high_blockage_sprints),
            "low_completion_count": len(low_completion_sprints)
        }
        
        # Capacity Planning Predictions
        capacity_planning = {}
        
        avg_velocity = sum(all_sprint_metrics[s]['completed'] for s in all_sprint_metrics.keys()) / len(all_sprint_metrics) if all_sprint_metrics else 0
        
        # Capacity status
        if avg_velocity < 5:
            capacity_status = "low"
        elif avg_velocity > 12:
            capacity_status = "high"
        else:
            capacity_status = "optimal"
        
        capacity_planning = {
            "average_velocity": round(avg_velocity, 1),
            "predicted_capacity_min": round(avg_velocity * 0.8, 1),
            "predicted_capacity_max": round(avg_velocity * 1.2, 1),
            "capacity_status": capacity_status
        }
        
        # Recommendations
        if high_blockage_sprints:
            recommendations.extend([
                "Implement daily blockage review meetings",
                "Create dependency tracking system",
                "Cross-train team members to reduce single points of failure"
            ])
        
        if low_completion_sprints:
            recommendations.extend([
                "Review and adjust sprint planning process",
                "Implement velocity-based capacity planning",
                "Set realistic sprint goals based on historical performance"
            ])
        
        # Add general recommendations
        recommendations.extend([
            "Establish trend monitoring dashboard",
            "Regular retrospective meetings to address recurring issues",
            "Document and share best practices across teams"
        ])
        
        # Ensure recommendations is always a list and has content
        if not isinstance(recommendations, list):
            recommendations = []
        
        # Add default recommendations if none were generated
        if len(recommendations) == 0:
            recommendations = [
                "Monitor project progress regularly",
                "Review resource allocation",
                "Implement process improvements"
            ]
        
        return {
            "reportType": "historical_trends",
            "metrics": {
                "executive_summary": executive_summary,
                "sprint_analysis": sprint_analysis,
                "task_type_analysis": task_type_analysis,
                "team_performance": team_performance,
                "predictive_analytics": predictive_analytics,
                "risk_forecasting": risk_forecasting,
                "capacity_planning": capacity_planning,
                "recommendations": recommendations,
                "filters": {
                    "sprint_filter": sprint_filter,
                    "project_filter": project_filter
                }
            },
            "sections": [
                {
                    "title": "Executive Summary",
                    "data": executive_summary
                },
                {
                    "title": "Sprint Analysis",
                    "data": sprint_analysis
                },
                {
                    "title": "Task Type Analysis",
                    "data": task_type_analysis
                },
                {
                    "title": "Team Performance",
                    "data": team_performance
                },
                {
                    "title": "Predictive Analytics",
                    "data": predictive_analytics
                },
                {
                    "title": "Risk Forecasting",
                    "data": risk_forecasting
                },
                {
                    "title": "Capacity Planning",
                    "data": capacity_planning
                }
            ],
            "recommendations": recommendations,
            "generatedAt": datetime.now().isoformat()
        }
    
    def generate_sprint_velocity_burndown(self, projects_data: Dict[str, Any], sprint_filter: str = None, project_filter: str = None) -> Dict[str, Any]:
        """Generate Enhanced Sprint Velocity & Burn-Down Report with Comprehensive Data"""
        # Executive Summary
        total_projects = len(projects_data)
        total_tasks = sum(len(project_data['tasks']) for project_data in projects_data.values())
        total_sprints = sum(len(project_data['sprints']) for project_data in projects_data.values())
        
        executive_summary = {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "total_sprints": total_sprints,
            "average_tasks_per_sprint": round(total_tasks/total_sprints, 1) if total_sprints > 0 else 0
        }
        
        # Aggregate sprint data across all projects
        all_sprint_metrics = {}
        sprint_velocity_data = []
        
        for project_data in projects_data.values():
            tasks = project_data['tasks']
            for task in tasks:
                sprint = task.get('sprint', 'Unknown')
                status = task.get('status', 'Unknown')
                
                # Sprint metrics
                if sprint not in all_sprint_metrics:
                    all_sprint_metrics[sprint] = {
                        'total': 0, 'completed': 0, 'blocked': 0, 
                        'in_progress': 0, 'todo': 0, 'planned': 0
                    }
                all_sprint_metrics[sprint]['total'] += 1
                
                if status == 'Done':
                    all_sprint_metrics[sprint]['completed'] += 1
                elif status == 'Blocked':
                    all_sprint_metrics[sprint]['blocked'] += 1
                elif status == 'In Progress':
                    all_sprint_metrics[sprint]['in_progress'] += 1
                elif status == 'To Do':
                    all_sprint_metrics[sprint]['todo'] += 1
        
        # Calculate velocity for each sprint
        if all_sprint_metrics:
            sorted_sprints = sorted(all_sprint_metrics.keys(), key=lambda x: x.replace('Sprint-', '').zfill(3))
            
            for sprint in sorted_sprints:
                metrics = all_sprint_metrics[sprint]
                velocity = metrics['completed']
                planned = metrics['total']
                completion_rate = metrics['completed'] / metrics['total'] * 100 if metrics['total'] > 0 else 0
                
                # Determine health status
                if completion_rate >= 80:
                    health_status = "excellent"
                elif completion_rate >= 60:
                    health_status = "good"
                else:
                    health_status = "needs_attention"
                
                # Determine trend status
                if velocity >= planned * 0.9:
                    trend_status = "meeting_or_exceeding"
                elif velocity >= planned * 0.7:
                    trend_status = "slightly_below"
                else:
                    trend_status = "significantly_below"
                
                sprint_velocity_data.append({
                    'sprint': sprint,
                    'velocity': velocity,
                    'planned': planned,
                    'completion_rate': round(completion_rate, 1),
                    'health_status': health_status,
                    'trend_status': trend_status,
                    'metrics': metrics
                })
        
        # Velocity Trends Analysis
        velocity_trends = {}
        if len(sprint_velocity_data) >= 2:
            recent_velocity = sprint_velocity_data[-1]['velocity']
            previous_velocity = sprint_velocity_data[-2]['velocity']
            velocity_change = recent_velocity - previous_velocity
            
            # Calculate average velocity
            avg_velocity = sum(d['velocity'] for d in sprint_velocity_data) / len(sprint_velocity_data)
            
            # Velocity consistency
            velocity_std = (sum((d['velocity'] - avg_velocity) ** 2 for d in sprint_velocity_data) / len(sprint_velocity_data)) ** 0.5
            consistency = (1 - velocity_std / avg_velocity) * 100 if avg_velocity > 0 else 0
            
            velocity_trends = {
                "recent_sprint": sprint_velocity_data[-1]['sprint'],
                "recent_velocity": recent_velocity,
                "previous_sprint": sprint_velocity_data[-2]['sprint'],
                "previous_velocity": previous_velocity,
                "velocity_change": velocity_change,
                "trend_direction": "improving" if velocity_change > 0 else "declining" if velocity_change < 0 else "stable",
                "average_velocity": round(avg_velocity, 1),
                "consistency": round(consistency, 1),
                "consistency_status": "high" if consistency >= 80 else "moderate" if consistency >= 60 else "low"
            }
        
        # Burn-Down Analysis
        burndown_data = []
        for sprint_data in sprint_velocity_data[-3:]:  # Last 3 sprints
            sprint = sprint_data['sprint']
            metrics = sprint_data['metrics']
            planned = sprint_data['planned']
            completed = sprint_data['velocity']
            blocked = metrics['blocked']
            
            # Determine burn-down health
            if completed >= planned:
                burn_health = "excellent"
            elif completed >= planned * 0.8:
                burn_health = "good"
            elif completed >= planned * 0.6:
                burn_health = "fair"
            else:
                burn_health = "poor"
            
            burndown_data.append({
                'sprint': sprint,
                'planned': planned,
                'completed': completed,
                'remaining': planned - completed,
                'burn_rate': round(completed/planned*100, 1),
                'burn_health': burn_health,
                'blocked_tasks': blocked,
                'blockage_rate': round(blocked/planned*100, 1) if planned > 0 else 0
            })
        
        # Capacity Planning Insights
        capacity_insights = {}
        if sprint_velocity_data:
            avg_velocity = sum(d['velocity'] for d in sprint_velocity_data) / len(sprint_velocity_data)
            max_velocity = max(d['velocity'] for d in sprint_velocity_data)
            min_velocity = min(d['velocity'] for d in sprint_velocity_data)
            recommended_capacity = avg_velocity * 0.8  # 80% of average for safety
            
            capacity_insights = {
                "average_velocity": round(avg_velocity, 1),
                "maximum_velocity": max_velocity,
                "minimum_velocity": min_velocity,
                "velocity_range": max_velocity - min_velocity,
                "recommended_capacity": round(recommended_capacity, 1),
                "capacity_status": "low" if avg_velocity < 5 else "high" if avg_velocity > 12 else "normal"
            }
            
            # Predictions for next sprint
            if len(sprint_velocity_data) >= 2:
                recent_trend = sprint_velocity_data[-1]['velocity'] - sprint_velocity_data[-2]['velocity']
                predicted_next = sprint_velocity_data[-1]['velocity'] + recent_trend * 0.5
                capacity_insights["predicted_next_sprint"] = round(predicted_next, 1)
        
        # Recommendations
        recommendations = []
        if sprint_velocity_data:
            avg_completion = sum(d['completion_rate'] for d in sprint_velocity_data) / len(sprint_velocity_data)
            
            if avg_completion < 60:
                recommendations.extend([
                    "Review sprint planning process",
                    "Reduce sprint capacity by 20-30%",
                    "Implement daily velocity tracking",
                    "Conduct team retrospective on velocity issues"
                ])
            elif avg_completion < 80:
                recommendations.extend([
                    "Fine-tune sprint capacity planning",
                    "Improve task estimation accuracy",
                    "Address recurring blockers",
                    "Enhance team collaboration"
                ])
            else:
                recommendations.extend([
                    "Consider increasing sprint capacity",
                    "Share best practices with other teams",
                    "Focus on quality and sustainability",
                    "Plan for team growth opportunities"
                ])
        
        # Process improvements
        process_improvements = [
            "Implement velocity-based capacity planning",
            "Regular velocity trend analysis",
            "Automated burn-down chart generation",
            "Sprint goal setting based on historical velocity",
            "Team velocity coaching and training"
        ]
        
        return {
            "reportType": "sprint_velocity_burndown",
            "metrics": {
                "executive_summary": executive_summary,
                "sprint_velocity_data": sprint_velocity_data,
                "velocity_trends": velocity_trends,
                "burndown_data": burndown_data,
                "capacity_insights": capacity_insights,
                "process_improvements": process_improvements,
                "filters": {
                    "sprint_filter": sprint_filter,
                    "project_filter": project_filter
                }
            },
            "sections": [
                {
                    "title": "Executive Summary",
                    "data": executive_summary
                },
                {
                    "title": "Sprint Velocity Analysis",
                    "data": sprint_velocity_data
                },
                {
                    "title": "Velocity Trends",
                    "data": velocity_trends
                },
                {
                    "title": "Burn-Down Analysis",
                    "data": burndown_data
                },
                {
                    "title": "Capacity Planning",
                    "data": capacity_insights
                }
            ],
            "recommendations": recommendations,
            "generatedAt": datetime.now().isoformat()
        }

    def generate_predictive_analytics(self, project_statuses: List[ProjectStatus], sprint_filter: str = None, project_filter: str = None) -> str:
        """Generate Enhanced Predictive Analytics Report with Comprehensive Data"""
        summary = "🔮 ENHANCED PREDICTIVE ANALYTICS REPORT\n"
        summary += "=" * 60 + "\n\n"
        
        # Executive Summary
        total_projects = len(project_statuses)
        critical_projects = [p for p in project_statuses if p.status == 'critical']
        on_track_projects = [p for p in project_statuses if p.status == 'on-track']
        issues_projects = [p for p in project_statuses if p.status == 'slight-issues']
        
        summary += "📊 EXECUTIVE PREDICTIVE OVERVIEW\n"
        summary += "-" * 35 + "\n"
        summary += f"• Total Projects Analyzed: {total_projects}\n"
        summary += f"• High-Risk Projects: {len(critical_projects)}\n"
        summary += f"• Medium-Risk Projects: {len(issues_projects)}\n"
        summary += f"• Low-Risk Projects: {len(on_track_projects)}\n\n"
        
        # Portfolio Risk Prediction
        summary += "⚠️ PORTFOLIO RISK PREDICTION\n"
        summary += "-" * 30 + "\n"
        
        # Calculate risk scores
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0
        
        for project in project_statuses:
            risk_score = 0
            if project.qualityScore < 70:
                risk_score += 2
            if project.completionPercentage < 50:
                risk_score += 2
            if project.status == 'critical':
                risk_score += 3
            elif project.status == 'slight-issues':
                risk_score += 1
            
            if risk_score >= 4:
                high_risk_count += 1
            elif risk_score >= 2:
                medium_risk_count += 1
            else:
                low_risk_count += 1
        
        # ASCII Bar Chart for Risk Distribution
        total_projects_for_chart = high_risk_count + medium_risk_count + low_risk_count
        if total_projects_for_chart > 0:
            high_bars = "█" * int((high_risk_count / total_projects_for_chart) * 20)
            medium_bars = "█" * int((medium_risk_count / total_projects_for_chart) * 20)
            low_bars = "█" * int((low_risk_count / total_projects_for_chart) * 20)
            
            summary += f"🔴 High Risk (Score ≥4): {high_risk_count:2d} projects {high_bars}\n"
            summary += f"🟡 Medium Risk (Score 2-3): {medium_risk_count:2d} projects {medium_bars}\n"
            summary += f"🟢 Low Risk (Score 0-1): {low_risk_count:2d} projects {low_bars}\n\n"
        
        # Risk Distribution Pie Chart
        summary += "📊 RISK DISTRIBUTION CHART\n"
        summary += "-" * 25 + "\n"
        if total_projects_for_chart > 0:
            high_percent = (high_risk_count / total_projects_for_chart) * 100
            medium_percent = (medium_risk_count / total_projects_for_chart) * 100
            low_percent = (low_risk_count / total_projects_for_chart) * 100
            
            summary += "    🔴 HIGH RISK\n"
            summary += "   ╭─────────────╮\n"
            summary += f"   │ {high_percent:5.1f}%      │\n"
            summary += "   ╰─────────────╯\n\n"
            
            summary += "🟡 MEDIUM RISK    🟢 LOW RISK\n"
            summary += "╭─────────────╮  ╭─────────────╮\n"
            summary += f"│ {medium_percent:5.1f}%      │  │ {low_percent:5.1f}%      │\n"
            summary += "╰─────────────╯  ╰─────────────╯\n\n"
        
        # Delivery Predictions
        summary += "📅 DELIVERY PREDICTIONS\n"
        summary += "-" * 25 + "\n"
        
        total_predicted_sprints = 0
        projects_with_velocity = 0
        
        for project in project_statuses:
            if project.sprintVelocity > 0:
                remaining_tasks = project.totalTasks - project.completedTasks
                predicted_sprints = remaining_tasks / project.sprintVelocity
                total_predicted_sprints += predicted_sprints
                projects_with_velocity += 1
                
                # Enhanced project prediction
                summary += f"📊 {project.projectName}:\n"
                summary += f"   • Current Velocity: {project.sprintVelocity} tasks/sprint\n"
                summary += f"   • Remaining Tasks: {remaining_tasks}\n"
                summary += f"   • Predicted Completion: {predicted_sprints:.1f} sprints\n"
                
                # Risk assessment with specific predictions
                if project.qualityScore < 70:
                    summary += f"   ⚠️  Quality Risk: Score {project.qualityScore}/100 (Target: 70+)\n"
                if project.completionPercentage < 50:
                    summary += f"   ⚠️  Schedule Risk: {project.completionPercentage}% complete\n"
                
                # Status-based predictions
                if project.status == 'critical':
                    summary += f"   🚨 Critical Risk: Immediate intervention required\n"
                    summary += f"   📈 Prediction: {'Likely delay' if predicted_sprints > 3 else 'Recoverable with intervention'}\n"
                elif project.status == 'slight-issues':
                    summary += f"   ⚠️  Moderate Risk: Monitor closely\n"
                    summary += f"   📈 Prediction: {'Minor delays expected' if predicted_sprints > 2 else 'On track with monitoring'}\n"
                else:
                    summary += f"   ✅ Low Risk: Project on track\n"
                    summary += f"   📈 Prediction: {'On schedule' if predicted_sprints <= 2 else 'Potential minor delay'}\n"
                
                summary += "\n"
        
        # Portfolio-level predictions
        if projects_with_velocity > 0:
            avg_predicted_sprints = total_predicted_sprints / projects_with_velocity
            summary += "🎯 PORTFOLIO-LEVEL PREDICTIONS\n"
            summary += "-" * 32 + "\n"
            summary += f"• Average Completion Time: {avg_predicted_sprints:.1f} sprints\n"
            summary += f"• Projects with Velocity Data: {projects_with_velocity}/{total_projects}\n"
            
            if avg_predicted_sprints > 3:
                summary += "• 🚨 Portfolio Risk: Multiple projects likely to exceed timeline\n"
            elif avg_predicted_sprints > 2:
                summary += "• ⚠️ Portfolio Warning: Some projects may face delays\n"
            else:
                summary += "• ✅ Portfolio Health: Most projects on track for timely delivery\n"
        
        # Resource Planning Predictions
        summary += "\n👥 RESOURCE PLANNING PREDICTIONS\n"
        summary += "-" * 32 + "\n"
        
        # Calculate resource needs
        total_remaining_tasks = sum(p.totalTasks - p.completedTasks for p in project_statuses)
        avg_velocity = sum(p.sprintVelocity for p in project_statuses if p.sprintVelocity > 0) / max(1, len([p for p in project_statuses if p.sprintVelocity > 0]))
        
        if avg_velocity > 0:
            total_sprint_effort = total_remaining_tasks / avg_velocity
            summary += f"• Total Remaining Effort: {total_remaining_tasks} tasks\n"
            summary += f"• Average Team Velocity: {avg_velocity:.1f} tasks/sprint\n"
            summary += f"• Estimated Portfolio Completion: {total_sprint_effort:.1f} sprints\n"
            
            # Resource recommendations
            if total_sprint_effort > 4:
                summary += "• 🚨 Resource Alert: Consider additional team members\n"
            elif total_sprint_effort > 3:
                summary += "• ⚠️ Resource Warning: Monitor team capacity closely\n"
            else:
                summary += "• ✅ Resource Status: Current capacity appears adequate\n"
        
        # Trend Analysis & Forecasting
        summary += "\n📈 TREND ANALYSIS & FORECASTING\n"
        summary += "-" * 32 + "\n"
        
        # Quality trends
        avg_quality = sum(p.qualityScore for p in project_statuses) / total_projects if total_projects > 0 else 0
        quality_trend = "📈 Improving" if avg_quality > 75 else "📉 Declining" if avg_quality < 65 else "➡️ Stable"
        
        # Completion trends
        avg_completion = sum(p.completionPercentage for p in project_statuses) / total_projects if total_projects > 0 else 0
        completion_trend = "📈 Accelerating" if avg_completion > 60 else "📉 Slowing" if avg_completion < 40 else "➡️ Steady"
        
        summary += f"• Quality Trend: {quality_trend} (Avg: {avg_quality:.1f}/100)\n"
        summary += f"• Completion Trend: {completion_trend} (Avg: {avg_completion:.1f}%)\n"
        
        # Predictive insights
        summary += "\n🔮 PREDICTIVE INSIGHTS & RECOMMENDATIONS\n"
        summary += "-" * 40 + "\n"
        
        if high_risk_count > total_projects * 0.3:
            summary += "🚨 HIGH RISK PORTFOLIO:\n"
            summary += "   • Immediate intervention required across multiple projects\n"
            summary += "   • Consider portfolio restructuring or resource reallocation\n"
            summary += "   • Escalate to executive stakeholders\n\n"
        elif medium_risk_count > total_projects * 0.4:
            summary += "⚠️ MODERATE RISK PORTFOLIO:\n"
            summary += "   • Proactive monitoring and intervention recommended\n"
            summary += "   • Review resource allocation and team assignments\n"
            summary += "   • Implement weekly risk assessment meetings\n\n"
        else:
            summary += "✅ HEALTHY PORTFOLIO:\n"
            summary += "   • Continue current management approach\n"
            summary += "   • Focus on optimization and continuous improvement\n"
            summary += "   • Maintain regular monitoring cadence\n\n"
        
        # Actionable recommendations
        summary += "🎯 ACTIONABLE RECOMMENDATIONS\n"
        summary += "-" * 30 + "\n"
        summary += "• This Sprint: Focus on high-risk project interventions\n"
        summary += "• Next 2 Sprints: Implement resource optimization strategies\n"
        summary += "• This Month: Conduct portfolio health review and planning\n"
        summary += "• Next Quarter: Plan capacity based on predicted completion dates\n\n"
        
        # Scope & Filters
        if sprint_filter or project_filter:
            summary += "📋 ANALYSIS SCOPE\n"
            summary += "-" * 18 + "\n"
            if sprint_filter:
                summary += f"• Sprint Filter: {sprint_filter}\n"
            if project_filter:
                summary += f"• Project Filter: {project_filter}\n"
            summary += f"• Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}\n"
        
        return summary

# Global RAG instance
_summary_rag_instance = None

def get_summary_rag_instance():
    """Get or create Summary Report RAG instance"""
    global _summary_rag_instance
    if _summary_rag_instance is None:
        _summary_rag_instance = SummaryReportRAG()
    return _summary_rag_instance

@router.post("/generate", response_model=SummaryReportResponse)
async def generate_summary_report(request: SummaryReportRequest):
    """Generate summary report with RAG - returns formatted response for backward compatibility"""
    try:
        rag = SummaryReportRAG()
        return await rag.generate_summary_report(request)
    except Exception as e:
        logger.error(f"Error generating summary report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data", response_model=DataOnlySummaryReport)
async def get_summary_data(request: SummaryReportRequest):
    """Get summary data only - no display formatting"""
    try:
        rag = SummaryReportRAG()
        return await rag.generate_data_only_report(request)
    except Exception as e:
        logger.error(f"Error generating data-only report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status():
    """Get summary report service status"""
    try:
        return {
            "status": "healthy",
            "service": "summary-report",
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

@router.get("/project/{project_id}")
async def get_project_status(project_id: str):
    """
    Get detailed status for a specific project
    """
    try:
        rag_instance = get_summary_rag_instance()
        data = rag_instance.extract_project_data(project_filter=project_id)
        
        if project_id not in data['projects']:
            raise HTTPException(
                status_code=404,
                detail=f"Project {project_id} not found"
            )
        
        project_status = rag_instance.calculate_project_metrics(data['projects'][project_id])
        return project_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get project status: {str(e)}"
        )

@router.post("/refresh")
async def refresh_summary_report():
    """
    Refresh the summary report data
    """
    try:
        # This could be used to refresh cached data or regenerate reports
        global _summary_rag_instance
        _summary_rag_instance = None  # Force recreation of instance
        
        return {
            "success": True,
            "message": "Summary report service refreshed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing summary report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh summary report: {str(e)}"
        )
