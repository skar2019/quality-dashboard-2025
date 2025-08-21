export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  issueType: string;
  resolution: string;
  project: string;
  sprint: string;
}

export function parseTaskData(rawText: string): Task[] {
  const tasks: Task[] = [];
  
  // Split the text into sections
  const sections = rawText.split('---');
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n').filter(line => line.trim());
    if (lines.length === 0) continue;
    
    const task: Partial<Task> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and section headers
      if (!trimmedLine || trimmedLine.startsWith('Here are the tasks') || 
          trimmedLine.startsWith('Retrieved Tasks') || 
          trimmedLine.startsWith('Total tasks')) {
        continue;
      }
      
      // Parse key-value pairs
      if (trimmedLine.includes(':')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim().toLowerCase()) {
          case 'task id':
            task.id = value;
            break;
          case 'title':
            task.title = value;
            break;
          case 'description':
            task.description = value;
            break;
          case 'status':
            task.status = value;
            break;
          case 'priority':
            task.priority = value;
            break;
          case 'assignee':
            task.assignee = value;
            break;
          case 'reporter':
            task.reporter = value;
            break;
          case 'issue type':
            task.issueType = value;
            break;
          case 'resolution':
            task.resolution = value;
            break;
          case 'project':
            task.project = value;
            break;
          case 'sprint':
            task.sprint = value;
            break;
        }
      }
    }
    
    // Only add the task if it has the required fields
    if (task.id && task.title && task.project) {
      // Set default values for missing fields
      const completeTask: Task = {
        id: task.id,
        title: task.title,
        description: task.description || 'No description provided',
        status: task.status || 'Unknown',
        priority: task.priority || 'Medium',
        assignee: task.assignee || 'Unassigned',
        reporter: task.reporter || 'Unknown',
        issueType: task.issueType || 'Task',
        resolution: task.resolution || 'Unresolved',
        project: task.project,
        sprint: task.sprint || 'Unknown',
      };
      
      tasks.push(completeTask);
    }
  }
  
  return tasks;
}

export function parseProjectSummary(rawText: string): { project: string; tasks: string[] }[] {
  const projects: { project: string; tasks: string[] }[] = [];
  
  const lines = rawText.split('\n');
  let currentProject = '';
  let currentTasks: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    // Check if this is a project header (ends with colon)
    if (trimmedLine.endsWith(':')) {
      // Save previous project if exists
      if (currentProject && currentTasks.length > 0) {
        projects.push({
          project: currentProject,
          tasks: [...currentTasks]
        });
      }
      
      // Start new project
      currentProject = trimmedLine.slice(0, -1); // Remove the colon
      currentTasks = [];
    } else if (trimmedLine.startsWith('*') && currentProject) {
      // This is a task line
      const taskText = trimmedLine.slice(1).trim(); // Remove the asterisk
      currentTasks.push(taskText);
    }
  }
  
  // Add the last project
  if (currentProject && currentTasks.length > 0) {
    projects.push({
      project: currentProject,
      tasks: [...currentTasks]
    });
  }
  
  return projects;
}

export function extractTaskIdFromText(taskText: string): string | null {
  // Look for patterns like (adani-2), (digital-transformation-sprint-1-3), etc.
  const match = taskText.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

export function extractTaskTitleFromText(taskText: string): string {
  // Remove the task ID in parentheses and clean up
  return taskText.replace(/\s*\([^)]+\)\s*$/, '').trim();
}
