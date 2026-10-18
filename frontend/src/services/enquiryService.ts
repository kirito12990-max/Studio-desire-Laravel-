import { authService } from './authService';
import { API_BASE } from '../config/api';
import {
  ProjectEnquiry,
  EnquiryDetail,
  EnquiryConfig,
  EnquirySubmissionResponse,
  EmailSettings,
  EmailTestRequest,
  EmailTestResponse,
} from '../types/enquiry';

async function secureFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  const csrfHeaders = isStateChanging ? authService.getCsrfHeaders() : {};

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...csrfHeaders,
    ...((init.headers as Record<string, string>) || {}),
  };

  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}

const getJsonHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const enquiryService = {
  // Public APIs
  async getConfig(): Promise<EnquiryConfig> {
    const res = await secureFetch(`${API_BASE}/enquiries/config`);
    if (!res.ok) throw new Error('Failed to load enquiry configuration');
    return res.json();
  },

  async submitEnquiry(formData: FormData): Promise<EnquirySubmissionResponse> {
    const res = await secureFetch(`${API_BASE}/enquiries`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit enquiry' }));
      throw new Error(err.detail || 'Failed to submit enquiry');
    }
    return res.json();
  },

  // Owner Admin APIs
  async getEnquiries(params?: {
    status?: string;
    project_type?: string;
    source?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: ProjectEnquiry[]; total: number; skip: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.project_type && params.project_type !== 'ALL') query.append('project_type', params.project_type);
    if (params?.source) query.append('source', params.source);
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    const url = `${API_BASE}/admin/enquiries${qs ? `?${qs}` : ''}`;
    const res = await secureFetch(url);
    if (!res.ok) throw new Error('Failed to load enquiries');
    const data = await res.json();
    if (Array.isArray(data)) {
      return { items: data, total: data.length, skip: 0, limit: data.length };
    }
    return data;
  },

  async getEnquiryDetail(id: number): Promise<EnquiryDetail> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch enquiry detail' }));
      throw new Error(err.detail || 'Failed to fetch enquiry detail');
    }
    return res.json();
  },

  async updateEnquiry(
    id: number,
    data: {
      status?: string;
      assigned_user?: string | null;
      internal_notes?: string | null;
      project_type?: string;
    }
  ): Promise<EnquiryDetail> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`, {
      method: 'PATCH',
      headers: getJsonHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update enquiry' }));
      throw new Error(err.detail || 'Failed to update enquiry');
    }
    return res.json();
  },

  async deleteEnquiry(id: number): Promise<{ success: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete enquiry' }));
      throw new Error(err.detail || 'Failed to delete enquiry');
    }
    return res.json();
  },

  async convertToProject(id: number): Promise<{ success: boolean; project_id: number; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}/convert-to-project`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to convert enquiry to project' }));
      throw new Error(err.detail || 'Failed to convert enquiry to project');
    }
    return res.json();
  },

  async retryEmail(id: number): Promise<{ success: boolean; message: string }> {
    const res = await secureFetch(`${API_BASE}/admin/enquiries/${id}/retry-email`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Email retry failed' }));
      throw new Error(err.detail || 'Email retry failed');
    }
    return res.json();
  },

  // Email Settings APIs
  async getEmailSettings(): Promise<EmailSettings> {
    const res = await secureFetch(`${API_BASE}/admin/email/settings`);
    if (!res.ok) throw new Error('Failed to load email settings');
    return res.json();
  },

  async updateEmailSettings(settings: EmailSettings): Promise<EmailSettings> {
    const res = await secureFetch(`${API_BASE}/admin/email/settings`, {
      method: 'PUT',
      headers: getJsonHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update email settings' }));
      throw new Error(err.detail || 'Failed to update email settings');
    }
    return res.json();
  },

  async testEmail(payload: EmailTestRequest): Promise<EmailTestResponse> {
    const res = await secureFetch(`${API_BASE}/admin/email/test`, {
      method: 'POST',
      headers: getJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Test email failed' }));
      throw new Error(err.detail || 'Test email failed');
    }
    return res.json();
  },
};
