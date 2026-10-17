import { VisualizationListResponse, VisualizationSpace } from "../types/visualization";
import { API_BASE } from "../config/api";
import { adminService } from "./adminService";

export class VisualizationService {
  /**
   * Fetch all 3D rendered spaces with optional category filter
   */
  static async getVisualizations(params?: {
    category?: string;
  }): Promise<VisualizationListResponse> {
    const query = new URLSearchParams();

    if (params?.category && params.category !== "ALL") {
      query.append("category", params.category);
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE}/visualizations${queryString}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch 3D visualizations: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch full room visualization space by slug or ID
   */
  static async getVisualizationBySlug(slugOrId: string): Promise<VisualizationSpace> {
    const response = await fetch(`${API_BASE}/visualizations/${slugOrId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch space '${slugOrId}': ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch distinct room categories from API
   */
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/visualizations/categories`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback categories
    }
    return ["ALL", "LIVING ROOM", "BEDROOM", "KITCHEN & DINING", "LOUNGE", "ENTRANCE", "BATHROOM"];
  }

  /**
   * Get direct API endpoint URL for the room's dynamic SVG QR code
   */
  static getQrCodeUrl(slugOrId: string): string {
    return `${API_BASE}/visualizations/${slugOrId}/qr`;
  }

  /**
   * Get direct API endpoint URL for any configured VR URL (Level 1, Level 2, or Level 3)
   */
  static getDynamicQrUrl(targetUrl: string): string {
    return `${API_BASE}/visualizations/qr?url=${encodeURIComponent(targetUrl)}`;
  }

  /**
   * Fetch rendered spaces directly as a list, with optional category filter
   */
  static async getSpaces(category?: string): Promise<VisualizationSpace[]> {
    const res = await this.getVisualizations(category ? { category } : undefined);
    return res.spaces || [];
  }

  /**
   * Fetch all projects that contain 3D rendered spaces/rooms, including Central VR, Room VR, and Render VRs
   */
  static async getProjectsArchive(projectSlug?: string): Promise<import("../types/visualization").VisualizationProjectArchive[]> {
    const query = projectSlug ? `?project_slug=${encodeURIComponent(projectSlug)}` : "";
    const response = await fetch(`${API_BASE}/visualizations/projects-archive${query}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch 3D projects archive: ${response.status}`);
    }

    return response.json();
  }
}

export const visualizationService = {
  getSpaces: VisualizationService.getSpaces.bind(VisualizationService),
  getVisualizations: VisualizationService.getVisualizations.bind(VisualizationService),
  getVisualizationBySlug: VisualizationService.getVisualizationBySlug.bind(VisualizationService),
  getCategories: VisualizationService.getCategories.bind(VisualizationService),
  getQrCodeUrl: VisualizationService.getQrCodeUrl.bind(VisualizationService),
  getDynamicQrUrl: VisualizationService.getDynamicQrUrl.bind(VisualizationService),
  getProjectsArchive: VisualizationService.getProjectsArchive.bind(VisualizationService),

  // Owner CRM Administration CRUD
  getAdminVisualizations: (params?: { room?: string; q?: string }) => adminService.getAdminVisualizations(params),
  getAdminVisualization: (id: number) => adminService.getAdminVisualization(id),
  createVisualization: (data: any) => adminService.createVisualization(data),
  updateVisualization: (id: number, data: any) => adminService.updateVisualization(id, data),
  deleteVisualization: (id: number) => adminService.deleteVisualization(id),
  addVisualizationMedia: (spaceId: number, data: any) => adminService.addVisualizationMedia(spaceId, data),
  updateVisualizationMedia: (mediaId: number, data: any) => adminService.updateVisualizationMedia(mediaId, data),
  deleteVisualizationMedia: (mediaId: number) => adminService.deleteVisualizationMedia(mediaId)
};

export default visualizationService;

