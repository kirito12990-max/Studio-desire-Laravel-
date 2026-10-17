export interface ActionItem {
  type: "enquiry" | "task" | "meeting" | "approval" | "project";
  title: string;
  subtitle?: string;
  badge: string;
  badge_color: "green" | "red" | "amber" | "blue";
  link_tab: string;
  link_context?: any;
  date?: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  published_projects_count: number;
  draft_projects_count: number;
  total_clients: number;
  total_enquiries: number;
  new_enquiries: number;
  tasks_due_today: number;
  overdue_tasks: number;
  upcoming_meetings_count: number;
  pending_approvals_count: number;
  total_photos: number;
  total_videos: number;
  total_3d_renders: number;
  total_blueprints: number;
  total_vr_rooms: number;
  unassigned_media_count: number;
  total_project_value: number;
  total_amount_received: number;
  action_items?: ActionItem[];
}

export interface AdminProject {
  id: number;
  client_id?: number;
  client_name?: string;
  title: string;
  slug: string;
  subtitle?: string;
  location: string;
  year: number;
  category: string;
  category_id?: number;
  subcategory_id?: number;
  project_type?: string;
  area?: string;
  description: string;
  cover_image: string;
  status: string;
  start_date?: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  budget: number;
  project_value: number;
  amount_received: number;
  amount_pending: number;
  featured: boolean;
  is_demo: boolean;
  is_published: boolean;
  vr_url?: string;
  vr_qr_code?: string;
  counts: {
    photos: number;
    videos: number;
    renders_3d: number;
    blueprints: number;
    vr_rooms: number;
    tasks_open?: number;
    materials_count?: number;
    files_count?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ProjectWorkspaceData {
  project: {
    id: number;
    client_id?: number;
    title: string;
    slug: string;
    subtitle?: string;
    location: string;
    year: number;
    category: string;
    project_type?: string;
    area?: string;
    description: string;
    cover_image: string;
    status: string;
    start_date?: string;
    expected_completion_date?: string;
    actual_completion_date?: string;
    budget: number;
    project_value: number;
    amount_received: number;
    amount_pending: number;
    featured: boolean;
    is_published: boolean;
    vr_url?: string;
    created_at: string;
    updated_at: string;
  };
  client?: {
    id: number;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  counts: {
    photos: number;
    videos: number;
    renders_3d: number;
    blueprints: number;
    vr_rooms: number;
    tasks_open?: number;
    materials_count?: number;
    files_count?: number;
  };
  progress_percentage: number;
}

export interface UnifiedMediaItem {
  id: number;
  project_id?: number;
  project_title?: string;
  media_type: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  caption?: string;
  alt_text?: string;
  room_name?: string;
  status: string;
  is_published: boolean;
  version?: string;
  uploaded_by?: string;
  sort_order: number;
  vr_url?: string | null;
  has_vr?: boolean;
  show_qr?: boolean;
  vr_type?: "external" | "hosted";
  vr_build_entry?: string | null;
  created_at: string;
}

export interface SearchResultItem {
  id: number;
  title: string;
  subtitle?: string;
  category: "project" | "client" | "enquiry" | "product" | "file";
  url_tab: string;
  context_data?: any;
}

export interface GlobalSearchResult {
  query: string;
  total_results: number;
  projects: SearchResultItem[];
  clients: SearchResultItem[];
  enquiries: SearchResultItem[];
  products: SearchResultItem[];
  files: SearchResultItem[];
}

export interface ActivityLogItem {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface UploadReviewItem {
  id: number;
  url: string;
  thumbnail_url: string;
  filename: string;
  detected_type: string;
  project_id?: number | null;
  room_name?: string | null;
  drawing_type?: string | null;
  caption?: string | null;
  sort_order: number;
  status: string;
}

export interface BulkUploadResponse {
  success: boolean;
  total_uploaded: number;
  project_id?: number | null;
  items: UploadReviewItem[];
}

export interface MediaAuditItem {
  model: string;
  id: number;
  field: string;
  url: string;
  expected_path?: string;
}

export interface MediaAuditReport {
  uploads_root: string;
  uploads_root_exists: boolean;
  total_records_checked: number;
  valid_local_files: number;
  valid_external_urls: number;
  missing_local_files: MediaAuditItem[];
  invalid_urls: MediaAuditItem[];
}

export interface MediaRepairResponse {
  success: boolean;
  repaired_count: number;
  repaired_items: Array<{
    model: string;
    id: number;
    field: string;
    old: string;
    new: string;
  }>;
}
