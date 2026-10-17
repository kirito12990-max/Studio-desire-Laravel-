import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { OverallFinanceSummary } from "../types/finance";
import { AdminProject } from "../types/admin";

interface FinanceManagerProps {
  onOpenProjectWorkspace?: (projectId: number) => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({
  onOpenProjectWorkspace
}) => {
  const [summary, setSummary] = useState<OverallFinanceSummary | null>(null);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [form, setForm] = useState({
    project_id: 0,
    title: "",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer",
    reference_number: "",
    status: "RECEIVED",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, pList] = await Promise.all([
        adminService.getFinanceSummary(),
        adminService.getProjects()
      ]);
      setSummary(sum);
      setProjects(pList);
      if (pList.length > 0 && form.project_id === 0) {
        setForm(f => ({ ...f, project_id: pList[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || form.amount <= 0) {
      alert("Please select a project and enter a valid positive payment amount.");
      return;
    }
    try {
      await adminService.logPayment(form);
      setShowAddModal(false);
      setForm({
        project_id: projects[0]?.id || 0,
        title: "",
        amount: 0,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "Bank Transfer",
        reference_number: "",
        status: "RECEIVED",
        notes: ""
      });
      loadData();
    } catch (err: any) {
      alert("Failed to log payment: " + err.message);
    }
  };

  const handleDeletePayment = async (id: number, title: string) => {
    if (!window.confirm(`Delete payment transaction '${title}'?`)) return;
    try {
      await adminService.deletePayment(id);
      loadData();
    } catch (err: any) {
      alert("Failed to delete payment: " + err.message);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await adminService.updatePayment(editingPayment.id, {
        title: editingPayment.title,
        amount: Number(editingPayment.amount),
        payment_date: editingPayment.payment_date,
        payment_method: editingPayment.payment_method,
        reference_number: editingPayment.reference_number,
        status: editingPayment.status,
        notes: editingPayment.notes
      });
      setEditingPayment(null);
      loadData();
    } catch (err: any) {
      alert("Failed to update payment: " + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Financial Ledger & Payment Tracking
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Real-time project budgets, contracted values, received receipts, and pending accounts receivable
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Record Payment
        </button>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {loading && (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "2rem 0" }}>
          Loading financial ledger...
        </div>
      )}

      {/* Financial Metrics */}
      {summary && (
        <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Contracted Value</div>
            <div className="admin-stat-value">₹{summary.total_project_value.toLocaleString()}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", marginTop: "0.4rem" }}>
              Budget: ₹{summary.total_budget.toLocaleString()}
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Amount Received</div>
            <div className="admin-stat-value" style={{ color: "#22c55e" }}>
              ₹{summary.total_received.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#22c55e", fontFamily: "var(--admin-font-mono)", marginTop: "0.4rem" }}>
              Verified In Bank
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Outstanding Receivables</div>
            <div className="admin-stat-value" style={{ color: "#ef4444" }}>
              ₹{summary.total_pending.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#ef4444", fontFamily: "var(--admin-font-mono)", marginTop: "0.4rem" }}>
              Pending Milestone Invoices
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Realization Ratio</div>
            <div className="admin-stat-value" style={{ color: "var(--admin-accent)" }}>
              {summary.total_project_value > 0 ? `${Math.round((summary.total_received / summary.total_project_value) * 100)}%` : "0%"}
            </div>
          </div>
        </div>
      )}

      {/* Project Financial Breakdown Table */}
      <div className="admin-surface-card" style={{ padding: "1.4rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1.2rem" }}>
          Project-Wise Accounts Ledger
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", textAlign: "left", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", borderBottom: "1px solid var(--admin-border)" }}>
                <th style={{ padding: "0.6rem 0" }}>Project Title</th>
                <th>Client</th>
                <th>Status</th>
                <th>Project Value</th>
                <th>Received</th>
                <th>Pending</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--admin-border)", fontFamily: "var(--admin-font-mono)" }}>
                  <td style={{ padding: "0.8rem 0", color: "var(--admin-text-main)", fontWeight: 600 }}>
                    {p.title}
                  </td>
                  <td>{p.client_name || "—"}</td>
                  <td><span className="badge-demo">{p.status}</span></td>
                  <td>₹{(p.project_value || p.budget || 0).toLocaleString()}</td>
                  <td style={{ color: "#22c55e", fontWeight: 600 }}>₹{(p.amount_received || 0).toLocaleString()}</td>
                  <td style={{ color: (p.amount_pending || 0) > 0 ? "#ef4444" : "var(--admin-text-dim)" }}>
                    ₹{(p.amount_pending || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {onOpenProjectWorkspace && (
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.65rem" }}
                        onClick={() => onOpenProjectWorkspace(p.id)}
                      >
                        Workspace ↗
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="admin-surface-card" style={{ padding: "1.4rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1.2rem" }}>
          Recent Transaction Receipts
        </h3>

        {summary?.recent_payments && summary.recent_payments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {summary.recent_payments.map(p => (
              <div
                key={p.id}
                style={{
                  padding: "0.9rem 1.2rem",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--admin-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <strong style={{ fontSize: "0.88rem", color: "var(--admin-text-main)" }}>{p.title}</strong>
                    <span className="badge-published">{p.status}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", marginTop: "0.3rem" }}>
                    📁 Project: <strong style={{ color: "var(--admin-text-main)" }}>{p.project_title}</strong> · 📅 {p.payment_date || "—"} · 💳 {p.payment_method} {p.reference_number ? `· Ref: ${p.reference_number}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#22c55e", fontFamily: "var(--admin-font-mono)", marginRight: "0.4rem" }}>
                    ₹{p.amount.toLocaleString()}
                  </span>
                  <button
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "0.3rem 0.5rem", fontSize: "0.65rem" }}
                    onClick={() => setEditingPayment({ ...p })}
                    title="Edit transaction"
                  >
                    Edit
                  </button>
                  <button
                    className="admin-btn admin-btn-danger"
                    style={{ padding: "0.3rem 0.5rem", fontSize: "0.65rem" }}
                    onClick={() => handleDeletePayment(p.id, p.title)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
            No payment transaction receipts recorded yet.
          </div>
        )}
      </div>

      {/* MODAL: LOG PAYMENT */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Record Project Payment</h3>
            <form onSubmit={handleCreatePayment}>
              <div className="admin-form-group">
                <label>Target Project *</label>
                <select
                  value={form.project_id}
                  onChange={e => setForm({ ...form, project_id: Number(e.target.value) })}
                  required
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Payment Stage / Description *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Initial Design Advance (25%)"
                />
              </div>
              <div className="admin-form-group">
                <label>Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Transaction Date</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={e => setForm({ ...form, payment_date: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Bank Reference / Cheque No</label>
                <input
                  type="text"
                  value={form.reference_number}
                  onChange={e => setForm({ ...form, reference_number: e.target.value })}
                  placeholder="e.g., UTR-123456789"
                />
              </div>
              <div className="admin-form-group">
                <label>Internal Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes on installment terms or invoice numbers..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT PAYMENT */}
      {editingPayment && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Edit Payment Transaction #{editingPayment.id}</h3>
            <form onSubmit={handleUpdatePayment}>
              <div className="admin-form-group">
                <label>Payment Milestone / Description *</label>
                <input
                  type="text"
                  value={editingPayment.title}
                  onChange={e => setEditingPayment({ ...editingPayment, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPayment.amount}
                    onChange={e => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select
                    value={editingPayment.status}
                    onChange={e => setEditingPayment({ ...editingPayment, status: e.target.value })}
                  >
                    <option value="RECEIVED">RECEIVED (Cleared)</option>
                    <option value="PENDING">PENDING (Awaiting)</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={editingPayment.payment_date || ""}
                    onChange={e => setEditingPayment({ ...editingPayment, payment_date: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Payment Method</label>
                  <select
                    value={editingPayment.payment_method || "Bank Transfer"}
                    onChange={e => setEditingPayment({ ...editingPayment, payment_method: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit/Debit Card</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Reference / Transaction ID</label>
                <input
                  type="text"
                  value={editingPayment.reference_number || ""}
                  onChange={e => setEditingPayment({ ...editingPayment, reference_number: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Internal Notes</label>
                <textarea
                  rows={2}
                  value={editingPayment.notes || ""}
                  onChange={e => setEditingPayment({ ...editingPayment, notes: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditingPayment(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Update Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
