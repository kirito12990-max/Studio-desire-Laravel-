import { authService } from "./authService";
import {
  DashboardStats,
  AdminProject,
  ProjectWorkspaceData,
  UnifiedMediaItem,
  GlobalSearchResult,
  ActivityLogItem,
  UploadReviewItem,
  BulkUploadResponse,
  MediaAuditReport,
  MediaRepairResponse
} from "../types/admin";
import { ClientSummary, ClientDetail } from "../types/client";
import { ProjectTask, TaskStats, TaskUser, TaskComment } from "../types/task";
import { ProjectMilestone } from "../types/milestone";
import { ProjectMaterial } from "../types/material";
import { ProjectMeeting } from "../types/meeting";
import { ProjectFileItem } from "../types/file";
import { OverallFinanceSummary, ProjectFinanceSummary, PaymentRecordItem } from "../types/finance";
import { EnquirySummary, EnquiryDetail } from "../types/enquiry";
import {
  VisualizationSpace,
  VisualizationMedia,
  VisualizationSpaceInput,
  VisualizationMediaInput
} from "../types/visualization";

import { API_BASE } from "../config/api";

function secureFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  const csrfHeaders = isStateChanging ? authService.getCsrfHeaders() : {};

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...csrfHeaders,
    ...((init.headers as Record<string, string>) || {})
  };

  return window.fetch(input, {
    ...init,
    credentials: "include",
    headers
  });
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json"
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      authService.clearSession();
      window.location.hash = "#owner/login";
      throw new Error("Session expired. Please log in again.");
    }

    const errData = await res.json().catch(() => null);

    if (res.status === 419) {
      throw new Error("CSRF security token mismatch or session expired (HTTP 419). Please refresh.");
    }
    if (res.status === 429) {
      const retry = errData?.retry_after ? ` (retry in ${errData.retry_after}s)` : "";
      throw new Error((errData?.message || "Rate limit reached. Please try again shortly.") + retry);
    }
    if (res.status === 422) {
      if (errData?.errors && typeof errData.errors === "object") {
        const firstKey = Object.keys(errData.errors)[0];
        if (firstKey && Array.isArray(errData.errors[firstKey]) && errData.errors[firstKey].length > 0) {
          throw new Error(errData.errors[firstKey][0]);
        }
      }
      throw new Error(errData?.message || errData?.detail || "Validation error encountered.");
    }
    if (res.status === 403) {
      throw new Error(errData?.message || errData?.detail || "Access forbidden. Insufficient permissions.");
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status}). Please check system logs.`);
    }

    throw new Error(errData?.message || errData?.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const adminService = {
  // ============================================================================
  // DASHBOARD & GLOBAL SEARCH
  // ============================================================================
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await secureFetch(`${API_BASE}/admin/dashboard/stats`, {
      headers: authHeaders()
    });
    return handleResponse<DashboardStats>(res);
  },

  async globalSearch(q: string): Promise<GlobalSearchResult> {
    const res = await secureFetch(`${API_BASE}/admin/search?q=${encodeURIComponent(q)}`, {
      headers: authHeaders()
    });
    return handleResponse<GlobalSearchResult>(res);
  },

  // ============================================================================
  // PROJECTS & WORKSPACE
  // ============================================================================
  async getProjects(filters?: { status?: string; category?: string; clientId?: number; published?: boolean; q?: string }): Promise<AdminProject[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.clientId) params.append("client_id", filters.clientId.toString());
    if (filters?.published !== undefined) params.append("published", filters.published.toString());
    if (filters?.q) params.append("q", filters.q);

    const res = await secureFetch(`${API_BASE}/admin/projects?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<AdminProject[]>(res);
  },

  async createProject(data: Partial<AdminProject>): Promise<AdminProject> {
    const res = await secureFetch(`${API_BASE}/admin/projects`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<AdminProject>(res);
  },

  async updateProject(id: number, data: Partial<AdminProject>): Promise<AdminProject> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<AdminProject>(res);
  },

  async togglePublishProject(id: number): Promise<{ success: boolean; is_published: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${id}/publish`, {
      method: "PATCH",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async deleteProject(id: number): Promise<{ success: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async getProjectWorkspace(id: number): Promise<ProjectWorkspaceData> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${id}/workspace`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectWorkspaceData>(res);
  },

  // ============================================================================
  // MILESTONES
  // ============================================================================
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${projectId}/milestones`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectMilestone[]>(res);
  },

  async createProjectMilestone(projectId: number, data: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const res = await secureFetch(`${API_BASE}/admin/projects/${projectId}/milestones`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...data, project_id: projectId })
    });
    return handleResponse<ProjectMilestone>(res);
  },

  async updateProjectMilestone(milestoneId: number, data: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const res = await secureFetch(`${API_BASE}/admin/projects/milestones/${milestoneId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectMilestone>(res);
  },

  async deleteProjectMilestone(milestoneId: number): Promise<{ success: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/projects/milestones/${milestoneId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // ============================================================================
  // CLIENTS
  // ============================================================================
  async getClients(q?: string): Promise<ClientSummary[]> {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await secureFetch(`${API_BASE}/admin/clients${params}`, {
      headers: authHeaders()
    });
    return handleResponse<ClientSummary[]>(res);
  },

  async getClientDetail(id: number): Promise<ClientDetail> {
    const res = await secureFetch(`${API_BASE}/admin/clients/${id}`, {
      headers: authHeaders()
    });
    return handleResponse<ClientDetail>(res);
  },

  async createClient(data: Partial<ClientSummary>): Promise<ClientSummary> {
    const res = await secureFetch(`${API_BASE}/admin/clients`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ClientSummary>(res);
  },

  async updateClient(id: number, data: Partial<ClientSummary>): Promise<ClientSummary> {
    const res = await secureFetch(`${API_BASE}/admin/clients/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ClientSummary>(res);
  },

  async deleteClient(id: number): Promise<{ success: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/clients/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // ENQUIRIES & LEADS PIPELINE
  // ============================================================================
  async getEnquiries(filters?: { status?: string; search?: string; projectType?: string }): Promise<EnquirySummary[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.projectType) params.append("project_type", filters.projectType);

    const res = await secureFetch(`${API_BASE}/admin/enquiries?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<EnquirySummary[]>(res);
  },

  async getEnquiryDetail(id: number): Promise<EnquiryDetail> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`, {
      headers: authHeaders()
    });
    return handleResponse<EnquiryDetail>(res);
  },

  async updateEnquiry(id: number, data: { status?: string; assigned_user?: string; internal_notes?: string }): Promise<EnquiryDetail> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<EnquiryDetail>(res);
  },

  async convertEnquiryToClient(id: number, data?: { company?: string; address?: string; notes?: string }): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}/convert-to-client`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data || {})
    });
    return handleResponse(res);
  },

  async convertEnquiryToProject(id: number, data?: { title: string; client_id?: number; category?: string; budget?: number; status?: string }): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}/convert-to-project`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data || {})
    });
    return handleResponse(res);
  },

  async deleteEnquiry(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // TASKS
  // ============================================================================
  async getTasks(filters?: {
    projectId?: number;
    status?: string;
    priority?: string;
    visibility?: string;
    assignedTo?: string;
    assigneeId?: number;
    createdById?: number;
    search?: string;
    view?: string;
  }): Promise<ProjectTask[]> {
    const params = new URLSearchParams();
    if (filters?.projectId !== undefined) params.append("project_id", filters.projectId.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.visibility) params.append("visibility", filters.visibility);
    if (filters?.assignedTo) params.append("assigned_to", filters.assignedTo);
    if (filters?.assigneeId) params.append("assignee_id", filters.assigneeId.toString());
    if (filters?.createdById) params.append("created_by_id", filters.createdById.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.view) params.append("view", filters.view);

    const res = await secureFetch(`${API_BASE}/admin/tasks?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectTask[]>(res);
  },

  async getTaskStats(): Promise<TaskStats> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/stats`, {
      headers: authHeaders()
    });
    return handleResponse<TaskStats>(res);
  },

  async getTaskAssignees(): Promise<TaskUser[]> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/assignees`, {
      headers: authHeaders()
    });
    return handleResponse<TaskUser[]>(res);
  },

  async getTaskDetail(id: number): Promise<ProjectTask> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectTask>(res);
  },

  async createTask(data: {
    project_id?: number | null;
    title: string;
    description?: string;
    visibility?: string;
    priority?: string;
    status?: string;
    start_date?: string;
    due_date?: string;
    assignee_ids?: number[];
    assigned_to?: string;
  }): Promise<ProjectTask> {
    const res = await secureFetch(`${API_BASE}/admin/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectTask>(res);
  },

  async updateTask(id: number, data: Partial<ProjectTask> & { assignee_ids?: number[] }): Promise<ProjectTask> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectTask>(res);
  },

  async setTaskStatus(id: number, status: string): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}/status?status=${encodeURIComponent(status)}`, {
      method: "PATCH",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async deleteTask(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async getTaskComments(id: number): Promise<TaskComment[]> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}/comments`, {
      headers: authHeaders()
    });
    return handleResponse<TaskComment[]>(res);
  },

  async addTaskComment(id: number, content: string): Promise<TaskComment> {
    const res = await secureFetch(`${API_BASE}/admin/tasks/${id}/comments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content })
    });
    return handleResponse<TaskComment>(res);
  },

  // ============================================================================
  // MATERIALS
  // ============================================================================
  async getMaterials(filters?: { projectId?: number; category?: string; status?: string }): Promise<ProjectMaterial[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append("project_id", filters.projectId.toString());
    if (filters?.category) params.append("category", filters.category);
    if (filters?.status) params.append("status", filters.status);

    const res = await secureFetch(`${API_BASE}/admin/materials?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectMaterial[]>(res);
  },

  async createMaterial(data: Partial<ProjectMaterial>): Promise<ProjectMaterial> {
    const res = await secureFetch(`${API_BASE}/admin/materials`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectMaterial>(res);
  },

  async updateMaterial(id: number, data: Partial<ProjectMaterial>): Promise<ProjectMaterial> {
    const res = await secureFetch(`${API_BASE}/admin/materials/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectMaterial>(res);
  },

  async deleteMaterial(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/materials/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // MEETINGS & CALENDAR
  // ============================================================================
  async getMeetings(filters?: { projectId?: number; clientId?: number; status?: string }): Promise<ProjectMeeting[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append("project_id", filters.projectId.toString());
    if (filters?.clientId) params.append("client_id", filters.clientId.toString());
    if (filters?.status) params.append("status", filters.status);

    const res = await secureFetch(`${API_BASE}/admin/meetings?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectMeeting[]>(res);
  },

  async createMeeting(data: Partial<ProjectMeeting>): Promise<ProjectMeeting> {
    const res = await secureFetch(`${API_BASE}/admin/meetings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectMeeting>(res);
  },

  async updateMeeting(id: number, data: Partial<ProjectMeeting>): Promise<ProjectMeeting> {
    const res = await secureFetch(`${API_BASE}/admin/meetings/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectMeeting>(res);
  },

  // ============================================================================
  // GOOGLE CALENDAR INTEGRATION
  // ============================================================================
  async getGoogleCalendarStatus(): Promise<{
    connected: boolean;
    status: string;
    google_account_email?: string;
    calendar_id?: string;
    last_synced_at?: string;
    updated_at?: string;
    client_id_configured?: boolean;
    configuration_valid?: boolean;
    configuration_errors?: string[];
  }> {
    const res = await secureFetch(`${API_BASE}/admin/google-calendar/status`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async getGoogleOAuthUrl(): Promise<{ auth_url: string; authorization_url: string; state: string }> {
    const res = await secureFetch(`${API_BASE}/admin/google-calendar/oauth/start`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async disconnectGoogleCalendar(): Promise<{ message: string; status?: string }> {
    const res = await secureFetch(`${API_BASE}/admin/google-calendar/disconnect`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async getMergedCalendarEvents(start_date?: string, end_date?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (start_date) params.append("start_date", start_date);
    if (end_date) params.append("end_date", end_date);

    const res = await secureFetch(`${API_BASE}/admin/google-calendar/events?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async syncGoogleCalendar(): Promise<{
    success: boolean;
    status: string;
    pushed_to_google: number;
    pulled_from_google: number;
    failed_pushes?: number;
    last_synced_at?: string;
    message: string;
    errors?: string[];
    total_google_events?: number;
  }> {
    const res = await secureFetch(`${API_BASE}/admin/google-calendar/sync`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async pushTaskToGoogle(taskId: number): Promise<{ message: string; google_event_id?: string; status?: string }> {
    const res = await secureFetch(`${API_BASE}/admin/google-calendar/push-task/${taskId}`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async deleteMeeting(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/meetings/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // FILES & CONTRACTS
  // ============================================================================
  async getFiles(filters?: { projectId?: number; category?: string }): Promise<ProjectFileItem[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append("project_id", filters.projectId.toString());
    if (filters?.category) params.append("category", filters.category);

    const res = await secureFetch(`${API_BASE}/admin/files?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectFileItem[]>(res);
  },

  async createFile(data: Partial<ProjectFileItem>): Promise<ProjectFileItem> {
    const res = await secureFetch(`${API_BASE}/admin/files`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<ProjectFileItem>(res);
  },

  async deleteFile(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/files/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // FINANCE & PAYMENTS
  // ============================================================================
  async getFinanceSummary(): Promise<OverallFinanceSummary> {
    const res = await secureFetch(`${API_BASE}/admin/finance/summary`, {
      headers: authHeaders()
    });
    return handleResponse<OverallFinanceSummary>(res);
  },

  async getProjectFinance(projectId: number): Promise<ProjectFinanceSummary> {
    const res = await secureFetch(`${API_BASE}/admin/finance/project/${projectId}`, {
      headers: authHeaders()
    });
    return handleResponse<ProjectFinanceSummary>(res);
  },

  async logPayment(data: { project_id: number; title: string; amount: number; payment_date?: string; payment_method?: string; reference_number?: string; status?: string; notes?: string }): Promise<PaymentRecordItem> {
    const res = await secureFetch(`${API_BASE}/admin/finance/payments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<PaymentRecordItem>(res);
  },

  async updatePayment(id: number, data: Partial<PaymentRecordItem>): Promise<PaymentRecordItem> {
    const res = await secureFetch(`${API_BASE}/admin/finance/payments/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<PaymentRecordItem>(res);
  },

  async deletePayment(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/finance/payments/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // UNIFIED MEDIA LIBRARY
  // ============================================================================
  async getUnifiedMedia(filters?: { mediaType?: string; projectId?: number; q?: string }): Promise<UnifiedMediaItem[]> {
    const params = new URLSearchParams();
    if (filters?.mediaType) params.append("media_type", filters.mediaType);
    if (filters?.projectId) params.append("project_id", filters.projectId.toString());
    if (filters?.q) params.append("q", filters.q);

    const res = await secureFetch(`${API_BASE}/admin/media?${params.toString()}`, {
      headers: authHeaders()
    });
    return handleResponse<UnifiedMediaItem[]>(res);
  },

  async updateMediaItem(id: number, data: Partial<UnifiedMediaItem>): Promise<UnifiedMediaItem> {
    const res = await secureFetch(`${API_BASE}/admin/media/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<UnifiedMediaItem>(res);
  },

  async deleteMediaItem(id: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/media/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async batchAssignMedia(mediaIds: number[], projectId: number, options?: { mediaType?: string; roomName?: string; publishNow?: boolean }): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/media/batch-assign`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        media_ids: mediaIds,
        project_id: projectId,
        media_type: options?.mediaType,
        room_name: options?.roomName,
        publish_now: options?.publishNow ?? true
      })
    });
    return handleResponse(res);
  },

  async auditMediaRecords(): Promise<MediaAuditReport> {
    const res = await secureFetch(`${API_BASE}/admin/media/audit`, {
      headers: authHeaders()
    });
    return handleResponse<MediaAuditReport>(res);
  },

  async repairMissingMedia(): Promise<MediaRepairResponse> {
    const res = await secureFetch(`${API_BASE}/admin/media/repair-missing`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleResponse<MediaRepairResponse>(res);
  },

  // ============================================================================
  // ACTIVITY AUDIT LOG
  // ============================================================================
  async getActivityLogs(limit: number = 30): Promise<ActivityLogItem[]> {
    const res = await secureFetch(`${API_BASE}/admin/activity?limit=${limit}`, {
      headers: authHeaders()
    });
    return handleResponse<ActivityLogItem[]>(res);
  },

  // ============================================================================
  // WEBSITE CONTENT CMS
  // ============================================================================
  async getAdminContent(section: string): Promise<{ section: string; content: any; updated_by?: string; updated_at?: string }> {
    const res = await secureFetch(`${API_BASE}/admin/content/${encodeURIComponent(section)}`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async updateAdminContent(section: string, contentJson: string): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/content/${encodeURIComponent(section)}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ content_json: contentJson })
    });
    return handleResponse(res);
  },

  // ============================================================================
  // USER ROLES & RBAC
  // ============================================================================
  async getUsers(): Promise<any[]> {
    const res = await secureFetch(`${API_BASE}/admin/users`, {
      headers: authHeaders()
    });
    return handleResponse<any[]>(res);
  },

  async createUser(data: { username: string; email?: string; password: string; role: string }): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  async updateUser(userId: number, data: { role?: string; is_active?: boolean; email?: string }): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/users/${userId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  async resetUserPassword(userId: number, newPassword: string): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ new_password: newPassword })
    });
    return handleResponse<any>(res);
  },

  async deleteUser(userId: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  // ============================================================================
  // VR & QR ENGINE
  // ============================================================================
  async getAllVR(): Promise<{ level1_projects: any[]; level2_rooms: any[]; level3_renders: any[] }> {
    const res = await secureFetch(`${API_BASE}/admin/vr/all`, {
      headers: authHeaders()
    });
    return handleResponse(res);
  },

  async setProjectVR(projectId: number, vrUrl: string | null, vrType: string = "external", showQr: boolean = true): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/vr/project-vr`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ project_id: projectId, vr_url: vrUrl, vr_type: vrType, show_qr: showQr })
    });
    return handleResponse(res);
  },

  async setRoomVR(spaceId: number, vrUrl: string | null, vrType: string = "external", showQr: boolean = true): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/vr/room-vr`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ space_id: spaceId, vr_url: vrUrl, vr_type: vrType, show_qr: showQr })
    });
    return handleResponse(res);
  },

  async setRenderVR(mediaId: number, vrUrl: string | null, vrType: string = "external", showQr: boolean = false, isProjectMedia: boolean = false): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/vr/render-vr`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ media_id: mediaId, vr_url: vrUrl, vr_type: vrType, show_qr: showQr, is_project_media: isProjectMedia })
    });
    return handleResponse(res);
  },

  async uploadVRBuild(file: File, scope: "project" | "room" | "render", targetId: number): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);
    formData.append("target_id", targetId.toString());

    const res = await secureFetch(`${API_BASE}/admin/vr/upload-build`, {
      method: "POST",
      body: formData
    });
    return handleResponse(res);
  },

  // ============================================================================
  // BULK UPLOAD & MEDIA STAGING
  // ============================================================================
  async uploadBulk(
    files: File[],
    projectId?: number,
    relativePaths?: string[]
  ): Promise<BulkUploadResponse> {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    if (projectId) formData.append("project_id", projectId.toString());
    if (relativePaths && relativePaths.length > 0) {
      formData.append("relative_paths", relativePaths.join("\n"));
    }
    const res = await secureFetch(`${API_BASE}/admin/upload/bulk`, {
      method: "POST",
      body: formData
    });
    return handleResponse<BulkUploadResponse>(res);
  },

  async commitUploadReview(
    items: UploadReviewItem[],
    publishNow: boolean
  ): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/upload/commit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ items, publish_now: publishNow })
    });
    return handleResponse(res);
  },

  // ============================================================================
  // AUTHORITATIVE PORTFOLIO CATEGORIES & PUZZLE BOARD
  // ============================================================================
  async getPublicCategories(): Promise<any[]> {
    const res = await secureFetch(`${API_BASE}/categories`);
    return handleResponse<any[]>(res);
  },

  async getAdminCategories(): Promise<any[]> {
    const res = await secureFetch(`${API_BASE}/admin/categories`, {
      headers: authHeaders()
    });
    return handleResponse<any[]>(res);
  },

  async createCategory(data: any): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  async updateCategory(id: number, data: any): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  async reorderCategories(items: { id: number; display_order: number }[]): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories/reorder`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ items })
    });
    return handleResponse<any>(res);
  },

  async deleteCategory(id: number, reassignToId?: number): Promise<any> {
    const params = new URLSearchParams();
    if (reassignToId !== undefined) {
      params.append("reassign_to_id", reassignToId.toString());
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await secureFetch(`${API_BASE}/admin/categories/${id}${qs}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse<any>(res);
  },

  async setCategoryFeaturedProject(categoryId: number, projectId: number | null): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories/${categoryId}/featured-project`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ project_id: projectId })
    });
    return handleResponse<any>(res);
  },

  async getCategoryEligibleProjects(categoryId: number): Promise<any[]> {
    const res = await secureFetch(`${API_BASE}/admin/categories/${categoryId}/eligible-projects`, {
      headers: authHeaders()
    });
    return handleResponse<any[]>(res);
  },

  async addSubcategory(categoryId: number, name: string): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories/${categoryId}/subcategories`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name })
    });
    return handleResponse<any>(res);
  },

  async deleteSubcategory(subcategoryId: number): Promise<any> {
    const res = await secureFetch(`${API_BASE}/admin/categories/subcategories/${subcategoryId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse<any>(res);
  },

  // ============================================================================
  // 3D VISUALIZATION ARCHIVE CRUD
  // ============================================================================
  async getAdminVisualizations(params?: { room?: string; q?: string }): Promise<VisualizationSpace[]> {
    const query = new URLSearchParams();
    if (params?.room && params.room !== "ALL") query.append("room", params.room);
    if (params?.q) query.append("q", params.q);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await secureFetch(`${API_BASE}/admin/visualizations${qs}`, {
      headers: authHeaders()
    });
    return handleResponse<VisualizationSpace[]>(res);
  },

  async getAdminVisualization(id: number): Promise<VisualizationSpace> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/${id}`, {
      headers: authHeaders()
    });
    return handleResponse<VisualizationSpace>(res);
  },

  async createVisualization(data: VisualizationSpaceInput): Promise<VisualizationSpace> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<VisualizationSpace>(res);
  },

  async updateVisualization(id: number, data: Partial<VisualizationSpaceInput>): Promise<VisualizationSpace> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<VisualizationSpace>(res);
  },

  async deleteVisualization(id: number): Promise<{ success: boolean; id: number; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse<{ success: boolean; id: number; message: string }>(res);
  },

  async addVisualizationMedia(spaceId: number, data: VisualizationMediaInput): Promise<VisualizationMedia> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/${spaceId}/media`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<VisualizationMedia>(res);
  },

  async updateVisualizationMedia(mediaId: number, data: Partial<VisualizationMediaInput>): Promise<VisualizationMedia> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/media/${mediaId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse<VisualizationMedia>(res);
  },

  async deleteVisualizationMedia(mediaId: number): Promise<{ success: boolean; id: number }> {
    const res = await secureFetch(`${API_BASE}/admin/visualizations/media/${mediaId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    return handleResponse<{ success: boolean; id: number }>(res);
  }
};

export type {
  AdminProject,
  ActivityLogItem,
  UploadReviewItem,
  BulkUploadResponse,
  DashboardStats,
  UnifiedMediaItem,
  ProjectWorkspaceData
};

