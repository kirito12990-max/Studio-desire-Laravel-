import { BlueprintDrawing, BlueprintListResponse, BlueprintProjectSummary } from "../types/blueprint";
import { API_BASE } from "../config/api";

export class BlueprintService {
  /**
   * Fetch drawings list with optional project slug, drawing type, and search query
   */
  static async getBlueprints(params?: {
    project?: string;
    drawing_type?: string;
    search?: string;
  }): Promise<BlueprintListResponse> {
    const query = new URLSearchParams();

    if (params?.project && params.project !== "ALL") {
      query.append("project", params.project);
    }

    if (params?.drawing_type && params.drawing_type !== "ALL") {
      query.append("drawing_type", params.drawing_type);
    }

    if (params?.search && params.search.trim()) {
      query.append("search", params.search.trim());
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${API_BASE}/blueprints${queryString}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blueprints: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch list of all projects with blueprints
   */
  static async getProjects(): Promise<BlueprintProjectSummary[]> {
    const response = await fetch(`${API_BASE}/blueprints/projects`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blueprint projects: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch distinct drawing types
   */
  static async getDrawingTypes(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/blueprints/drawing-types`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch drawing types: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch single blueprint drawing detail
   */
  static async getBlueprintBySlug(slugOrId: string): Promise<BlueprintDrawing> {
    const response = await fetch(`${API_BASE}/blueprints/${slugOrId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blueprint drawing: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch drawings list directly as an array with optional filters
   */
  static async getDrawings(project?: string, drawing_type?: string, search?: string): Promise<BlueprintDrawing[]> {
    const res = await this.getBlueprints({ project, drawing_type, search });
    return res.items || res.drawings || [];
  }

  /**
   * Get full URL for technical PDF
   */
  static getPdfUrl(slugOrId: string): string {
    return `${API_BASE}/blueprints/${slugOrId}/pdf`;
  }
}

export type BlueprintDrawingItem = BlueprintDrawing;
export type { BlueprintDrawing, BlueprintListResponse, BlueprintProjectSummary } from "../types/blueprint";

export const blueprintService = {
  getDrawings: BlueprintService.getDrawings.bind(BlueprintService),
  getBlueprints: BlueprintService.getBlueprints.bind(BlueprintService),
  getProjects: BlueprintService.getProjects.bind(BlueprintService),
  getDrawingTypes: BlueprintService.getDrawingTypes.bind(BlueprintService),
  getBlueprintBySlug: BlueprintService.getBlueprintBySlug.bind(BlueprintService),
  getPdfUrl: BlueprintService.getPdfUrl.bind(BlueprintService)
};

export default blueprintService;
