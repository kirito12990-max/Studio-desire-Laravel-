import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ProjectFileItem } from "../types/file";
import { AdminProject } from "../types/admin";
import { resolveMediaUrl } from "../utils/mediaResolver";

export const FilesManager: React.FC = () => {
  const [files, setFiles] = useState<ProjectFileItem[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    project_id: 0,
    name: "",
    category: "Contracts",
    file_url: "",
    file_type: "pdf",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pList, fList] = await Promise.all([
        adminService.getProjects(),
        adminService.getFiles({
          projectId: selectedProject !== "ALL" ? Number(selectedProject) : undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined
        })
      ]);
      setProjects(pList);
      setFiles(fList);
      if (pList.length > 0 && form.project_id === 0) {
        setForm(f => ({ ...f, project_id: pList[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load files");
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
      const created = await adminService.createFile(form);
      setFiles([created, ...files]);
      setShowAddModal(false);
      setForm({
        project_id: projects[0]?.id || 0,
        name: "",
        category: "Contracts",
        file_url: "",
        file_type: "pdf",
        notes: ""
      });
    } catch (err: any) {
      alert("Failed to register document: " + err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete document record '${name}'?`)) return;
    try {
      await adminService.deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
    } catch (err: any) {
      alert("Failed to delete file: " + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Files & Contract Repository
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Secure storage for Contracts, Quotations, Invoices, Technical Drawings, and Specifications
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Upload / Add Document
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
            <option value="ALL">All Projects ({projects.length})</option>
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
            <option value="Contracts">Contracts</option>
            <option value="Quotations">Quotations</option>
            <option value="Invoices">Invoices</option>
            <option value="Drawings / CAD">Drawings / CAD</option>
            <option value="3D">3D Visualizations</option>
            <option value="Material Documents">Material Documents</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* File List */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "2rem 0" }}>
          Loading document repository...
        </div>
      ) : files.length === 0 ? (
        <div style={{ padding: "3rem", backgroundColor: "var(--admin-surface)", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
          No documents match the selected filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {files.map(file => (
            <div
              key={file.id}
              className="admin-surface-card"
              style={{ padding: "1.2rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <strong style={{ fontSize: "0.92rem", color: "var(--admin-text-main)" }}>
                    {file.name}
                  </strong>
                  <span className="badge-demo">{file.category}</span>
                  <span style={{ fontSize: "0.65rem", fontFamily: "var(--admin-font-mono)", color: "var(--admin-text-dim)" }}>
                    .{file.file_type?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                  <span>📁 Project: <strong style={{ color: "var(--admin-text-main)" }}>{file.project_title}</strong></span>
                  {file.uploaded_by && <span>👤 Uploaded by: {file.uploaded_by}</span>}
                  {file.created_at && <span>📅 {new Date(file.created_at).toLocaleDateString()}</span>}
                </div>

                {file.notes && (
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                    {file.notes}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <a
                  href={resolveMediaUrl(file.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem", textDecoration: "none" }}
                >
                  Download / View ↗
                </a>
                <button
                  className="admin-btn admin-btn-danger"
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.68rem" }}
                  onClick={() => handleDelete(file.id, file.name)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD FILE */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Register Project Document</h3>
            <form onSubmit={handleCreate}>
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
                <label>Document Title *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Client Retainer Agreement — Signed"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Contracts">Contracts</option>
                    <option value="Quotations">Quotations</option>
                    <option value="Invoices">Invoices</option>
                    <option value="Drawings / CAD">Drawings / CAD</option>
                    <option value="3D">3D Visualizations</option>
                    <option value="Material Documents">Material Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Format</label>
                  <select
                    value={form.file_type}
                    onChange={e => setForm({ ...form, file_type: e.target.value })}
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="dwg">AutoCAD Drawing (.dwg)</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="zip">Archive (.zip)</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>File URL / Path *</label>
                <input
                  type="text"
                  required
                  value={form.file_url}
                  onChange={e => setForm({ ...form, file_url: e.target.value })}
                  placeholder="/uploads/documents/contract.pdf or URL"
                />
              </div>
              <div className="admin-form-group">
                <label>Internal Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Details, terms, reference points..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
