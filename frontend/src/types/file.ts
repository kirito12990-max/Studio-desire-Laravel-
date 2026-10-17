export interface ProjectFileItem {
  id: number;
  project_id: number;
  project_title?: string;
  name: string;
  category: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  notes?: string;
  created_at?: string;
}
