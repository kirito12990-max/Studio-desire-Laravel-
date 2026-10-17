import { ContactInquiryPayload, ContactInquiryResponse } from "../types/contact";
import { API_BASE } from "../config/api";

export class ContactService {
  /**
   * Submit enquiry form to FastAPI backend and SQLite database
   */
  static async submitInquiry(payload: ContactInquiryPayload): Promise<ContactInquiryResponse> {
    const response = await fetch(`${API_BASE}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = "Unable to process your request at this time.";
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((e: any) => e.msg || e.message).join(", ");
          } else {
            errorMessage = String(errorData.detail);
          }
        }
      } catch {
        // use default fallback
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

export const contactService = {
  submitInquiry: ContactService.submitInquiry.bind(ContactService)
};

export default contactService;
