import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ProjectMaterial, MaterialStatus } from "../types/material";
import { AdminProject } from "../types/admin";

export const MaterialsManager: React.FC = () => {
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    project_id: 0,
    name: "",
    category: "Marble",
    supplier: "",
    reference: "",
    price: 0,
    quantity: "",
    notes: "",
    status: "PROPOSED" as MaterialStatus
  });

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedCategory, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pList, mList] = await Promise.all([
        adminService.getProjects(),
        adminService.getMaterials({
          projectId: selectedProject !== "ALL" ? Number(selectedProject) : undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined
        })
      ]);
      setProjects(pList);
      setMaterials(mList);
      if (pList.length > 0 && form.project_id === 0) {
        setForm(f => ({ ...f, project_id: pList[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) {
      alert("Please select a project.");
      return;
    }
    try {
      const created = await adminService.createMaterial(form);
      setMaterials([created, ...materials]);
      setShowAddModal(false);
      setForm({
        project_id: projects[0]?.id || 0,
        name: "",
        category: "Marble",
        supplier: "",
        reference: "",
        price: 0,
        quantity: "",
        notes: "",
        status: "PROPOSED"
      });
    } catch (err: any) {
      alert("Failed to add material: " + err.message);
    }
  };

  const handleUpdateStatus = async (material: ProjectMaterial, newStatus: MaterialStatus) => {
    try {
      const updated = await adminService.updateMaterial(material.id, { status: newStatus });
      setMaterials(materials.map(m => m.id === material.id ? updated : m));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete material specification '${name}'?`)) return;
    try {
      await adminService.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err: any) {
      alert("Failed to delete material: " + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Materials Selection & Specifications
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Project-specific material boards: Marble, Wood, Fabrics, Hardware, Lighting, and Sanitary selections
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Material
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>Project:</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>Category:</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
          >
            <option value="ALL">All Categories</option>
            <option value="Marble">Marble</option>
            <option value="Wood">Wood / Timber</option>
            <option value="Fabric">Fabric & Upholstery</option>
            <option value="Hardware">Hardware</option>
            <option value="Lighting">Lighting</option>
            <option value="Flooring">Flooring</option>
            <option value="Paint">Paint</option>
            <option value="Sanitary">Sanitary Ware</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>Status:</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PROPOSED">PROPOSED</option>
            <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="ORDERED">ORDERED</option>
            <option value="INSTALLED">INSTALLED</option>
          </select>
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Materials Cards Grid */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "2rem 0" }}>
          Loading material catalog...
        </div>
      ) : materials.length === 0 ? (
        <div style={{ padding: "3rem", backgroundColor: "var(--admin-surface)", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
          No material records match the selected filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.2rem" }}>
          {materials.map(mat => (
            <div key={mat.id} className="admin-surface-card" style={{ padding: "1.3rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "var(--admin-text-main)" }}>{mat.name}</strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.1rem" }}>
                      {mat.category} {mat.supplier ? `· ${mat.supplier}` : ""}
                    </div>
                  </div>
                  <span className={`badge-demo ${mat.status === "APPROVED" || mat.status === "INSTALLED" ? "badge-published" : ""}`}>
                    {mat.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.7rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", marginBottom: "0.6rem" }}>
                  📁 Project: <strong style={{ color: "var(--admin-text-main)" }}>{mat.project_title}</strong>
                  {mat.reference && <div>Ref / SKU: <span style={{ color: "var(--admin-accent)" }}>{mat.reference}</span></div>}
                </div>

                {mat.notes && (
                  <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", margin: "0.4rem 0 0.8rem", lineHeight: 1.4 }}>
                    {mat.notes}
                  </p>
                )}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--admin-border)", paddingTop: "0.8rem", marginTop: "0.6rem", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--admin-text-dim)" }}>Qty: {mat.quantity || "—"}</span>
                  <strong style={{ color: "var(--admin-text-main)" }}>₹{mat.price?.toLocaleString()}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem", gap: "0.4rem" }}>
                  <select
                    value={mat.status}
                    onChange={e => handleUpdateStatus(mat, e.target.value as MaterialStatus)}
                    style={{ fontSize: "0.68rem", padding: "0.25rem 0.4rem", flex: 1 }}
                  >
                    <option value="PROPOSED">PROPOSED</option>
                    <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="ORDERED">ORDERED</option>
                    <option value="INSTALLED">INSTALLED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button
                    className="admin-btn admin-btn-danger"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.65rem" }}
                    onClick={() => handleDelete(mat.id, mat.name)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD MATERIAL */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Add Material Specification</h3>
            <form onSubmit={handleCreate}>
              <div className="admin-form-group">
                <label>Project *</label>
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
                <label>Material Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Italian Statuario Marble"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Marble">Marble</option>
                    <option value="Wood">Wood / Timber</option>
                    <option value="Fabric">Fabric & Upholstery</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Flooring">Flooring</option>
                    <option value="Paint">Paint</option>
                    <option value="Sanitary">Sanitary Ware</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Supplier / Vendor</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={e => setForm({ ...form, supplier: e.target.value })}
                    placeholder="e.g., Classic Marble Co."
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Unit Price (₹)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Quantity</label>
                  <input
                    type="text"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    placeholder="e.g., 250 sq.ft"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Reference Code / SKU</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                  placeholder="e.g., SD-MAT-04"
                />
              </div>
              <div className="admin-form-group">
                <label>Notes / Application Area</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Master Bedroom flooring and en-suite vanity cladding..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
