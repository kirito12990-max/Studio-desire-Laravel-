export interface ContactInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  project_type: string;
  location?: string;
  budget_range?: string;
  message: string;
}

export interface ContactInquiryResponse {
  success: boolean;
  message: string;
  inquiry_id?: number;
  created_at?: string;
}
