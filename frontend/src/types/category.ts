export interface FeaturedProjectSummary {
  id: number;
  title: string;
  slug: string;
  subtitle?: string;
  location?: string;
  year?: number;
  category?: string;
  cover_image?: string;
  is_published: boolean;
}

export interface EligibleProjectItem {
  id: number;
  title: string;
  slug: string;
  subtitle?: string;
  location?: string;
  year?: number;
  category?: string;
  category_id?: number | null;
  cover_image?: string;
  is_published: boolean;
  is_current_representative: boolean;
  is_eligible?: boolean;
  ineligibility_reason?: string | null;
}

export interface PortfolioSubcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
  puzzle_size: "large" | "tall" | "wide" | "small";
  cover_image?: string;
  featured_project_id?: number | null;
  featured_project?: FeaturedProjectSummary | null;
  published_projects_count?: number;
  subcategories: PortfolioSubcategory[];
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioCategoryAdmin extends PortfolioCategory {
  total_projects_count: number;
  published_projects_count: number;
  unpublished_projects_count: number;
}

export interface PortfolioCategoryCreate {
  name: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  puzzle_size?: "large" | "tall" | "wide" | "small";
  cover_image?: string;
  featured_project_id?: number | null;
  subcategories?: string[];
}

export interface PortfolioCategoryUpdate {
  name?: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  puzzle_size?: "large" | "tall" | "wide" | "small";
  cover_image?: string;
  featured_project_id?: number | null;
}

export interface CategoryReorderItem {
  id: number;
  display_order: number;
}

