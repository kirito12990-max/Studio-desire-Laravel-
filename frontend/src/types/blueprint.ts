export interface BlueprintDrawing {
  id: number;
  project_id?: number | null;
  project_name: string;
  project_slug: string;
  title: string;
  slug: string;
  drawing_type: string;
  room_area?: string | null;
  drawing_number?: string | null;
  revision?: string | null;
  date?: string | null;
  scale?: string | null;
  sheet_size?: string | null;
  description?: string | null;
  thumbnail_url: string;
  file_url: string;
  file_type: "image" | "pdf" | string;
  sort_order: number;
  is_demo: boolean;
}

export interface BlueprintProjectSummary {
  project_slug: string;
  project_name: string;
  location?: string | null;
  year?: number | null;
  drawing_count: number;
  drawing_types: string[];
}

export interface BlueprintListResponse {
  project?: BlueprintProjectSummary | null;
  projects: BlueprintProjectSummary[];
  drawing_types: string[];
  items: BlueprintDrawing[];
  drawings?: BlueprintDrawing[];
  total: number;
}
