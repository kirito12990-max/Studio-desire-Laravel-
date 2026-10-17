export type PaymentStatus = "PENDING" | "RECEIVED" | "OVERDUE" | "REFUNDED";

export interface PaymentRecordItem {
  id: number;
  project_id: number;
  project_title?: string;
  title: string;
  amount: number;
  payment_date?: string;
  payment_method: string;
  reference_number?: string;
  status: PaymentStatus;
  notes?: string;
  created_at?: string;
}

export interface ProjectFinanceSummary {
  project_id: number;
  project_title: string;
  budget: number;
  project_value: number;
  amount_received: number;
  amount_pending: number;
  payment_progress_percentage: number;
  payments: PaymentRecordItem[];
}

export interface OverallFinanceSummary {
  total_budget: number;
  total_project_value: number;
  total_received: number;
  total_pending: number;
  recent_payments: PaymentRecordItem[];
}
