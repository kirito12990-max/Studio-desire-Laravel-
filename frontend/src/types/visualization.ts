export interface VisualizationMedia {
  id: number;
  space_id?: number;
  url: string;
  caption?: string;
  angle?: string;
  vr_url?: string;
  has_vr?: boolean;
  show_qr?: boolean;
  vr_type?: string;
  vr_build_entry?: string;
  sort_order: number;
}

export interface VisualizationSpace {
  id: number;
  project_id?: number;
  title: string;
  slug: string;
  project_name: string;
  room: string;
  category: string;
  year: number;
  location?: string;
  description?: string;
  notes?: string;
  version?: string;
  status?: string;
  software?: string;
  cover_image: string;
  vr_url?: string;
  has_vr: boolean;
  show_qr?: boolean;
  vr_type?: string;
  vr_build_entry?: string;
  is_published?: boolean;
  sort_order: number;
  media: VisualizationMedia[];
}

export interface VisualizationSpaceInput {
  project_id?: number | null;
  title: string;
  slug?: string;
  project_name?: string;
  room: string;
  category?: string;
  year?: number;
  location?: string;
  description?: string;
  notes?: string;
  version?: string;
  status?: string;
  software?: string;
  cover_image: string;
  vr_url?: string | null;
  has_vr?: boolean;
  show_qr?: boolean;
  vr_type?: string;
  is_published?: boolean;
  sort_order?: number;
}

export interface VisualizationMediaInput {
  url: string;
  caption?: string;
  angle?: string;
  vr_url?: string | null;
  has_vr?: boolean;
  show_qr?: boolean;
  vr_type?: string;
  sort_order?: number;
}

export interface VisualizationProjectArchive {
  id: number;
  title: string;
  slug: string;
  subtitle?: string;
  location?: string;
  year: number;
  category: string;
  description: string;
  cover_image: string;
  vr_url?: string;
  has_central_vr: boolean;
  rooms: VisualizationSpace[];
}

export interface VisualizationListResponse {
  total: number;
  spaces: VisualizationSpace[];
}

export interface RenderImageItem {
  url: string;
  caption?: string;
  angle?: string;
  vr_url?: string;
  has_vr?: boolean;
}

export interface ActiveRenderView {
  url: string;
  caption?: string;
  angle?: string;
  spaceTitle: string;
  projectName: string;
  room: string;
  index: number;
  totalInSpace: number;
  vr_url?: string;
  has_vr?: boolean;
  allImagesInSpace: RenderImageItem[];
}

