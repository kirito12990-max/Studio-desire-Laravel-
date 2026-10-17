import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ClientSummary, ClientDetail } from "../types/client";

interface ClientsManagerProps {
  onOpenProjectDetail?: (slug: string) => void;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  onOpenProjectDetail
}) => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", company: "", email: "", phone: "", address: "", notes: "" });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getClients(q);
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients(searchQuery);
  };

  const handleOpenClient = async (id: number) => {
    try {
      const detail = await adminService.getClientDetail(id);
      setSelectedClient(detail);
      setClientForm({
        name: detail.name,
        company: detail.company || "",
        email: detail.email || "",
        phone: detail.phone || "",
        address: detail.address || "",
        notes: detail.notes || ""
      });
    } catch (err: any) {
      alert("Failed to load client dossier: " + err.message);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createClient(clientForm);
      setClients([created, ...clients]);
      setShowAddModal(false);
      setClientForm({ name: "", company: "", email: "", phone: "", address: "", notes: "" });
    } catch (err: any) {
      alert("Failed to create client: " + err.message);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const updated = await adminService.updateClient(selectedClient.id, clientForm);
      setClients(clients.map(c => c.id === selectedClient.id ? updated : c));
      setSelectedClient({ ...selectedClient, ...updated });
      setShowEditModal(false);
    } catch (err: any) {
      alert("Failed to update client: " + err.message);
    }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client '${name}'? Associated projects will be unlinked but not deleted.`)) return;
    try {
      await adminService.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    } catch (err: any) {
      alert("Failed to delete client: " + err.message);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Client Directory
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Real Client accounts linked to architectural commissions and project dossiers
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => {
          setClientForm({ name: "", company: "", email: "", phone: "", address: "", notes: "" });
          setShowAddModal(true);
        }}>
          + Add Client
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search by client name, company, email, phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            color: "var(--admin-text-main)",
            padding: "0.6rem 1rem",
            fontSize: "0.8rem",
            fontFamily: "var(--admin-font-mono)"
          }}
        />
        <button type="submit" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.75rem" }}>
          Search
        </button>
      </form>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Clients Grid & Detail View */}
      <div style={{ display: "grid", gridTemplateColumns: selectedClient ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
        {/* List of Clients */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {loading ? (
            <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "2rem 0" }}>
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div style={{ padding: "2rem", backgroundColor: "var(--admin-surface)", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
              No clients found.
            </div>
          ) : (
            clients.map(client => (
              <div
                key={client.id}
                className="admin-surface-card"
                style={{
                  padding: "1.2rem 1.4rem",
                  cursor: "pointer",
                  borderLeft: selectedClient?.id === client.id ? "4px solid var(--admin-accent)" : "1px solid var(--admin-border)"
                }}
                onClick={() => handleOpenClient(client.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "var(--admin-text-main)" }}>
                      {client.name}
                    </strong>
                    {client.company && (
                      <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "0.1rem" }}>
                        {client.company}
                      </div>
                    )}
                  </div>
                  <span className="badge-demo" style={{ backgroundColor: "rgba(212, 175, 55, 0.12)", color: "var(--admin-accent)" }}>
                    {client.project_count} {client.project_count === 1 ? "Project" : "Projects"}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.8rem", fontSize: "0.72rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                  {client.phone && <span>📞 {client.phone}</span>}
                  {client.email && <span>✉️ {client.email}</span>}
                  {client.address && <span>📍 {client.address}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Client Dossier */}
        {selectedClient && (
          <div className="admin-surface-card" style={{ padding: "1.5rem", position: "sticky", top: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--admin-text-main)", margin: 0 }}>
                  {selectedClient.name}
                </h3>
                {selectedClient.company && (
                  <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", marginTop: "0.2rem" }}>
                    {selectedClient.company}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "0.4rem 0.7rem", fontSize: "0.68rem" }}
                  onClick={() => setShowEditModal(true)}
                >
                  Edit
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  style={{ padding: "0.4rem 0.7rem", fontSize: "0.68rem" }}
                  onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
                >
                  Delete
                </button>
                <button
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "0.4rem 0.7rem", fontSize: "0.68rem" }}
                  onClick={() => setSelectedClient(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "1.2rem", marginBottom: "1.2rem" }}>
              <div><span style={{ color: "var(--admin-text-dim)" }}>Phone:</span> <strong style={{ color: "var(--admin-text-main)" }}>{selectedClient.phone || "—"}</strong></div>
              <div><span style={{ color: "var(--admin-text-dim)" }}>Email:</span> <strong style={{ color: "var(--admin-text-main)" }}>{selectedClient.email || "—"}</strong></div>
              <div><span style={{ color: "var(--admin-text-dim)" }}>Address:</span> <strong style={{ color: "var(--admin-text-main)" }}>{selectedClient.address || "—"}</strong></div>
              {selectedClient.notes && (
                <div style={{ marginTop: "0.4rem", color: "var(--admin-text-muted)", fontStyle: "italic" }}>
                  "{selectedClient.notes}"
                </div>
              )}
            </div>

            {/* Projects History for this Client */}
            <h4 style={{ fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.8rem" }}>
              Associated Projects ({selectedClient.projects?.length || 0})
            </h4>

            {selectedClient.projects && selectedClient.projects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {selectedClient.projects.map(proj => (
                  <div
                    key={proj.id}
                    style={{
                      padding: "0.8rem",
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--admin-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--admin-text-main)" }}>{proj.title}</strong>
                      <div style={{ fontSize: "0.68rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                        {proj.category} · Status: {proj.status}
                      </div>
                    </div>
                    {onOpenProjectDetail && (
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.62rem" }}
                        onClick={() => onOpenProjectDetail(proj.slug)}
                      >
                        Open Dossier ↗
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                No projects assigned to this client yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD CLIENT */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Register New Client</h3>
            <form onSubmit={handleCreateClient}>
              <div className="admin-form-group">
                <label>Client Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="e.g., Hardikbhai Patel"
                />
              </div>
              <div className="admin-form-group">
                <label>Company / Family Office</label>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={e => setClientForm({ ...clientForm, company: e.target.value })}
                  placeholder="e.g., Patel Enterprises"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="client@gmail.com"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Site / Residential Address</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                  placeholder="Bopal, Ahmedabad, Gujarat"
                />
              </div>
              <div className="admin-form-group">
                <label>Internal Client Notes</label>
                <textarea
                  rows={3}
                  value={clientForm.notes}
                  onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="Special preferences, architectural tastes, family brief..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLIENT */}
      {showEditModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Update Client Profile</h3>
            <form onSubmit={handleUpdateClient}>
              <div className="admin-form-group">
                <label>Client Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={clientForm.company}
                  onChange={e => setClientForm({ ...clientForm, company: e.target.value })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={clientForm.notes}
                  onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
