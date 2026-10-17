export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface ProjectMeeting {
  id: number;
  project_id?: number;
  client_id?: number;
  project_title?: string;
  client_name?: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  meeting_type: string;
  notes?: string;
  participants?: string;
  status: MeetingStatus;
  created_at?: string;
  updated_at?: string;
}
