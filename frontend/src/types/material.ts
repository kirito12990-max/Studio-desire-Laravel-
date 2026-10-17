export type MaterialStatus = "PROPOSED" | "CLIENT_REVIEW" | "APPROVED" | "REJECTED" | "ORDERED" | "INSTALLED";

export interface ProjectMaterial {
  id: number;
  project_id: number;
  project_title?: string;
  name: string;
  category: string;
  supplier?: string;
  reference?: string;
  price: number;
  quantity?: string;
  notes?: string;
  image_url?: string;
  status: MaterialStatus;
  created_at?: string;
  updated_at?: string;
}
