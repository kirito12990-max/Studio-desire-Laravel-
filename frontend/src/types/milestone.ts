export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: MilestoneStatus;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  order: number;
  created_at?: string;
}
