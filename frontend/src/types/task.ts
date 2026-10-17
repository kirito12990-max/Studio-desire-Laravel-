export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "CANCELLED";
export type TaskVisibility = "WORKSPACE" | "PRIVATE";

export interface TaskUser {
  id: number;
  username: string;
  email?: string;
  role: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id?: number;
  author_name: string;
  content: string;
  created_at?: string;
}

export interface ProjectTask {
  id: number;
  project_id?: number | null;
  project_title?: string;
  created_by_id?: number | null;
  created_by_name?: string;
  title: string;
  description?: string;
  assigned_to?: string;
  visibility: TaskVisibility;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string;
  due_date?: string;
  assignees: TaskUser[];
  comments_count?: number;
  comments?: TaskComment[];
  created_at?: string;
  updated_at?: string;
}

export interface TaskStats {
  total: number;
  my_tasks: number;
  assigned_to_me: number;
  in_progress: number;
  overdue: number;
  completed: number;
}
