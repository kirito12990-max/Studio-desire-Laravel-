export interface ProjectEnquiryAttachment {
  id: number;
  original_filename: string;
  filename: string;
  file_type: "image" | "pdf" | "video" | "drawing" | "document" | string;
  mime_type: string;
  file_size: number;
  url: string;
  created_at: string;
}

export interface ProjectEnquiryItem {
  id: number;
  reference_number: string;
  name: string;
  email: string;
  phone: string;
  project_type: string;
  location?: string;
  budget?: string;
  timeline?: string;
  source: string;
  status: "NEW" | "VIEWED" | "IN REVIEW" | "CONTACTED" | "IN PROGRESS" | "COMPLETED" | "ARCHIVED" | string;
  assigned_user?: string;
  email_sent: boolean;
  email_error?: string;
  attachments_count: number;
  attachment_count: number;
  converted_project_id?: number;
  converted_client_id?: number;
  created_at: string;
}

export type ProjectEnquiry = ProjectEnquiryItem;
export type EnquirySummary = ProjectEnquiryItem;

export interface ProjectEnquiryDetail extends ProjectEnquiryItem {
  message: string;
  internal_notes?: string;
  email_error?: string;
  converted_project_id?: number;
  updated_at: string;
  attachments: ProjectEnquiryAttachment[];
}

export type EnquiryDetail = ProjectEnquiryDetail;

export interface EnquiryConfigResponse {
  project_types: string[];
  budget_ranges: string[];
  budgets: string[];
  timelines: string[];
}

export type EnquiryConfig = EnquiryConfigResponse;

export interface EmailSettings {
  sender_name: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
  security: "starttls" | "ssl_tls" | string;
  smtp_username: string;
  smtp_password?: string;
  has_password?: boolean;
  recipients: string[];
  send_customer_confirmation?: boolean;
  customer_confirmation_enabled?: boolean;
}

export interface EmailTestRequest {
  to_email: string;
}

export interface EmailTestResponse {
  success: boolean;
  message: string;
}

export interface EnquirySubmissionResponse {
  success: boolean;
  reference_number: string;
  message: string;
  enquiry_id: number;
  email_sent?: boolean;
}
