export interface ProductMedia {
  id: number;
  media_type: "image" | "blueprint" | "sketch";
  url: string;
  thumbnail_url?: string;
  caption?: string;
  alt_text?: string;
  sort_order: number;
}

export interface ProductSummary {
  id: number;
  title: string;
  slug: string;
  subtitle?: string;
  category: string;
  designer?: string;
  year: number;
  dimensions?: string;
  materials?: string;
  cover_image: string;
  featured: boolean;
  is_concept: boolean;
  grid_span?: string;
}

export interface ProductDetailType extends ProductSummary {
  description: string;
  specifications?: string;
  media: ProductMedia[];
}

export interface ProductListResponse {
  total: number;
  products: ProductSummary[];
}
