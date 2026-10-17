export interface ProjectMedia {
  id: number;
  project_id: number;
  media_type: "image" | "video";
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  alt_text?: string | null;
  room_name?: string | null;
  sort_order: number;
  vr_url?: string | null;
  has_vr?: boolean;
  show_qr?: boolean;
  vr_type?: "external" | "hosted";
  vr_build_entry?: string | null;
}

export interface ProjectSummary {
  id: number;
  title: string;
  slug: string;
  subtitle?: string | null;
  location: string;
  year: number;
  category: string;
  category_id?: number | null;
  subcategory_id?: number | null;
  project_type?: string | null;
  area?: string | null;
  description: string;
  cover_image: string;
  featured: boolean;
  is_demo: boolean;
  is_published?: boolean;
  vr_url?: string | null;
  vr_qr_code?: string | null;
  show_qr?: boolean;
  vr_type?: "external" | "hosted";
  vr_build_entry?: string | null;
  grid_span?: string | null;
  aspect_ratio?: string | null;
  created_at: string;
  updated_at: string;
  has_video: boolean;
  media_count: number;
}

export interface ProjectDetail extends ProjectSummary {
  media: ProjectMedia[];
}

export interface ProjectListResponse {
  total: number;
  projects: ProjectSummary[];
}

export type CategoryFilter = "ALL" | "RESIDENTIAL" | "COMMERCIAL" | "HOSPITALITY" | "OFFICE" | "RETAIL";
export type MediaFilter = "all" | "photos" | "videos";

export interface PlaceholderSection {
  code: string;
  title: string;
  navLabel: string;
  description: string;
  note: string;
  expectedFeatures: string[];
}
