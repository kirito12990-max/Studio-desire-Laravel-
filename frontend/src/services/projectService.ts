import { ProjectListResponse, ProjectDetail } from "../types/project";
import { API_BASE } from "../config/api";

export class ProjectService {
  /**
   * Fetch all projects with optional category and media_type filters
   */
  static async getProjects(params?: {
    category?: string;
    category_id?: number;
    media_type?: string;
    featured?: boolean;
  }): Promise<ProjectListResponse> {
    const query = new URLSearchParams();

    if (params?.category_id !== undefined && params.category_id !== null) {
      query.append("category_id", String(params.category_id));
    }
    if (params?.category && params.category !== "ALL") {
      query.append("category", params.category);
    }
    if (params?.media_type && params.media_type !== "all") {
      query.append("media_type", params.media_type);
    }
    if (params?.featured !== undefined) {
      query.append("featured", String(params.featured));
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE}/projects${queryString}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch the designated top featured project
   */
  static async getFeaturedProject(): Promise<ProjectDetail> {
    const response = await fetch(`${API_BASE}/projects/featured`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch featured project: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch full project dossier by slug or ID
   */
  static async getProjectBySlug(slugOrId: string): Promise<ProjectDetail> {
    const response = await fetch(`${API_BASE}/projects/${slugOrId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project '${slugOrId}': ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch distinct project categories from API
   */
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/projects/categories`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback default list
    }
    return ["ALL", "RESIDENTIAL", "COMMERCIAL", "HOSPITALITY", "OFFICE", "RETAIL"];
  }
}

export const projectService = {
  getProjects: ProjectService.getProjects.bind(ProjectService),
  getFeaturedProject: ProjectService.getFeaturedProject.bind(ProjectService),
  getProjectBySlug: ProjectService.getProjectBySlug.bind(ProjectService),
  getCategories: ProjectService.getCategories.bind(ProjectService)
};

export default projectService;
