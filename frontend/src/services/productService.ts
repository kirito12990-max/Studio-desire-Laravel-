import { ProductListResponse, ProductDetailType } from "../types/product";
import { API_BASE } from "../config/api";

export class ProductService {
  /**
   * Fetch all products with optional category and featured filters
   */
  static async getProducts(params?: {
    category?: string;
    featured?: boolean;
  }): Promise<ProductListResponse> {
    const query = new URLSearchParams();

    if (params?.category && params.category !== "ALL") {
      query.append("category", params.category);
    }
    if (params?.featured !== undefined) {
      query.append("featured", String(params.featured));
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE}/products${queryString}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch product detail dossier by slug or ID
   */
  static async getProductBySlug(slugOrId: string): Promise<ProductDetailType> {
    const response = await fetch(`${API_BASE}/products/${slugOrId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product '${slugOrId}': ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch distinct categories from API
   */
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/products/categories`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback categories defined in prompt
    }
    return ["ALL", "FURNITURE", "SEATING", "TABLES", "STORAGE", "BEDS", "LIGHTING", "CUSTOM"];
  }
}

export const productService = {
  getProducts: ProductService.getProducts.bind(ProductService),
  getProductBySlug: ProductService.getProductBySlug.bind(ProductService),
  getCategories: ProductService.getCategories.bind(ProductService)
};

export default productService;
