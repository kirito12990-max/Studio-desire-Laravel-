export interface ClientSummary {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  project_count: number;
}

export interface ClientProjectItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  status: string;
  is_published: boolean;
  cover_image?: string;
}

export interface ClientDetail extends ClientSummary {
  projects: ClientProjectItem[];
}
