import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { AdminProject } from "../types/admin";
import { ClientSummary } from "../types/client";
import { PortfolioCategoryAdmin } from "../types/category";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { StudioImage } from "../components/StudioImage";

interface ProjectsManagerProps {
  onOpenProjectDetail: (slug: string) => void;
  onNavigateTab: (tab: string, context?: any) => void;
  initialProjectId?: number;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({
  onOpenProjectDetail,
  onNavigateTab,
  initialProjectId
}) => {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [categories, setCategories] = useState<PortfolioCategoryAdmin[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    client_id: undefined as number | undefined,
    category_id: undefined as number | undefined,
    subcategory_id: undefined as number | undefined,
    category: "Residential",
    project_type: "Private Residence",
    location: "Ahmedabad, Gujarat",
    year: 2026,
    budget: 0,
    project_value: 0,
    description: "",
    status: "PLANNING",
    is_published: true,
    cover_image: "",
    featured: false
  });

  // Confirmation state for unpublish/delete
  const [confirmModal, setConfirmModal] = useState<{ action: string; project: AdminProject } | null>(null);

  useEffect(() => {
    loadData();
    loadCategories();
  }, [selectedCategory, selectedStatus]);

  const loadCategories = async () => {
    try {
      const data = await adminService.getAdminCategories();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.warn("Could not load categories:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pList, cList] = await Promise.all([
        adminService.getProjects({
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          q: searchQuery || undefined
        }),
        adminService.getClients()
      ]);
      setProjects(pList);
      setClients(cList);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createProject(createForm);
      setProjects([created, ...projects]);
      setShowCreateModal(false);
      setSelectedProjectId(created.id);
    } catch (err: any) {
      alert("Failed to create project: " + err.message);
    }
  };

  const handleTogglePublish = async (project: AdminProject) => {
    try {
      const res = await adminService.togglePublishProject(project.id);
      setProjects(projects.map(p => p.id === project.id ? { ...p, is_published: res.is_published } : p));
      setConfirmModal(null);
    } catch (err: any) {
      alert("Failed to toggle publish status: " + err.message);
    }
  };

  const handleDeleteProject = async (project: AdminProject) => {
    try {
      await adminService.deleteProject(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
      if (selectedProjectId === project.id) {
        setSelectedProjectId(null);
      }
      setConfirmModal(null);
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    }
  };

  // If a project workspace is active, render it
  if (selectedProjectId !== null) {
    return (
      <ProjectWorkspace
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
        onOpenPublicSite={onOpenProjectDetail}
      />
    );
  }

  return (
    <div className="sd-admin-section sd-fade-in">
      {/* Top Header Row with Actions */}
      <div className="sd-admin-header-row">
        <div>
          <span className="sd-admin-eyebrow">ARCHITECTURAL DOSSIERS</span>
          <h1 className="sd-admin-title">Projects Portfolio & Workspace</h1>
          <p className="sd-admin-subtitle">
            Manage interior design commissions ({projects.length} projects). Open any project to edit details, manage 3D renders, materials, tasks, and financials.
          </p>
        </div>

        <div className="sd-admin-header-actions">
          <button
            type="button"
            className="sd-admin-btn-secondary"
            onClick={() => onNavigateTab("slideshow")}
            title="Manage 10 Cinematic Photos"
          >
            🖼 Slideshow Manager
          </button>
          <button
            type="button"
            className="sd-admin-btn-secondary"
            onClick={() => onNavigateTab("categories")}
            title="Configure Category Puzzle Board"
          >
            🧩 Category Manager
          </button>
          <button
            type="button"
            className="sd-admin-btn-primary"
            onClick={() => {
              const defaultCat = categories.find(c => c.is_active) || categories[0];
              setCreateForm({
                title: "",
                client_id: undefined,
                category_id: defaultCat?.id,
                subcategory_id: undefined,
                category: defaultCat?.name || "Residential",
                project_type: defaultCat?.subcategories?.[0]?.name || "Private Residence",
                location: "Ahmedabad, Gujarat",
                year: 2026,
                budget: 0,
                project_value: 0,
                description: "",
                status: "PLANNING",
                is_published: true,
                cover_image: "",
                featured: false
              });
              setIsAddingNewCat(false);
              setShowCreateModal(true);
            }}
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="sd-enquiries-filter-bar">
        <form onSubmit={handleSearch} className="sd-enquiry-search-form" style={{ flex: 1 }}>
          <input
            type="text"
            className="sd-admin-input-small"
            placeholder="Search projects by title, location, category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ minWidth: "260px", flex: 1 }}
          />
          <button type="submit" className="sd-admin-btn-small">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              className="sd-admin-btn-text"
              onClick={() => {
                setSearchQuery("");
                loadData();
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase" }}>
            Category:
          </span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="sd-status-select-sm"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase" }}>
            Status:
          </span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="sd-status-select-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENQUIRY">ENQUIRY</option>
            <option value="CONSULTATION">CONSULTATION</option>
            <option value="PLANNING">PLANNING</option>
            <option value="DESIGN">DESIGN</option>
            <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
            <option value="APPROVAL">APPROVAL</option>
            <option value="EXECUTION">EXECUTION</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Projects Grid — Compact 2 cards per row on Desktop & Tablet, 1 on Mobile */}
      {loading ? (
        <div className="sd-admin-loading">Loading project dossiers...</div>
      ) : projects.length === 0 ? (
        <div className="sd-empty-state">
          <p>No projects found matching the criteria.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
            gap: "1.25rem"
          }}
        >
          {projects.map(project => (
            <div
              key={project.id}
              className="admin-project-card"
              style={{
                borderRadius: "14px",
                border: "1px solid var(--admin-border)",
                backgroundColor: "#ffffff"
              }}
            >
              {/* Compact Cover Image */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 8.5",
                  overflow: "hidden",
                  backgroundColor: "var(--admin-surface-subtle)"
                }}
              >
                <StudioImage
                  src={project.cover_image}
                  alt={project.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.3s ease"
                  }}
                  loading="lazy"
                  fallbackSrc="/uploads/projects/placeholder.webp"
                  showMissingState={false}
                />

                <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "0.4rem" }}>
                  <span className={`project-card-badge ${project.is_published ? "badge-published" : "badge-draft"}`}>
                    {project.is_published ? "● Published" : "○ Draft"}
                  </span>
                  {project.featured && (
                    <span style={{ background: "#d4af37", color: "#000", fontSize: "0.65rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                      ★ Featured
                    </span>
                  )}
                </div>

                <span
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    letterSpacing: "0.06em"
                  }}
                >
                  {project.status}
                </span>
              </div>

              {/* Compact Body */}
              <div style={{ padding: "1rem 1.15rem", display: "flex", flexDirection: "column", flex: 1, gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "var(--admin-text-main)", display: "block" }}>
                      {project.title}
                    </strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", marginTop: "0.15rem" }}>
                      {project.year} · {project.category} {project.client_name ? `· ${project.client_name}` : ""}
                    </div>
                  </div>
                  {project.location && (
                    <span style={{ fontSize: "0.7rem", color: "var(--admin-text-dim)", whiteSpace: "nowrap" }}>
                      📍 {project.location}
                    </span>
                  )}
                </div>

                {project.description && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--admin-text-muted)",
                      margin: 0,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {project.description}
                  </p>
                )}

                {/* Content Counts Chips */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0.2rem 0" }}>
                  <span className="sd-type-pill" style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                    📷 {project.counts.photos} Photos
                  </span>
                  <span className="sd-type-pill" style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                    📐 {project.counts.blueprints || 0} Plans
                  </span>
                  <span className="sd-type-pill" style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                    🛋 {project.counts.materials_count || 0} Materials
                  </span>
                  <span className="sd-type-pill" style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                    ✓ {project.counts.tasks_open || 0} Tasks
                  </span>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", paddingTop: "0.6rem", borderTop: "1px solid var(--admin-border)" }}>
                  <button
                    type="button"
                    className="sd-admin-btn-primary"
                    style={{ flex: 1, padding: "0.45rem 0.6rem", fontSize: "0.72rem", justifyContent: "center" }}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    Open Workspace
                  </button>

                  <button
                    type="button"
                    className="sd-admin-btn-secondary"
                    style={{ padding: "0.45rem 0.6rem", fontSize: "0.72rem" }}
                    onClick={() => onOpenProjectDetail(project.slug)}
                    title="Preview Public Dossier"
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    className="sd-admin-btn-secondary"
                    style={{ padding: "0.45rem 0.6rem", fontSize: "0.72rem" }}
                    onClick={() => setConfirmModal({
                      action: project.is_published ? "unpublish" : "publish",
                      project
                    })}
                  >
                    {project.is_published ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    className="sd-delete-btn"
                    style={{ padding: "0.45rem 0.6rem", fontSize: "0.72rem" }}
                    onClick={() => setConfirmModal({ action: "delete", project })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "480px" }}>
            <h3 style={{ margin: "0 0 0.8rem", fontSize: "1.05rem" }}>
              {confirmModal.action === "delete" && `Permanently Delete '${confirmModal.project.title}'?`}
              {confirmModal.action === "unpublish" && `Unpublish '${confirmModal.project.title}'?`}
              {confirmModal.action === "publish" && `Publish '${confirmModal.project.title}' to Website?`}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              {confirmModal.action === "delete" && "Warning: This will permanently remove the project and its tasks/materials from the database."}
              {confirmModal.action === "unpublish" && "The project will no longer appear on the public website."}
              {confirmModal.action === "publish" && "The project dossier will become immediately live and visible to visitors."}
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="sd-admin-btn-secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`sd-admin-btn-${confirmModal.action === "delete" ? "primary" : "primary"}`}
                style={confirmModal.action === "delete" ? { background: "var(--admin-danger)" } : {}}
                onClick={() => {
                  if (confirmModal.action === "delete") {
                    handleDeleteProject(confirmModal.project);
                  } else {
                    handleTogglePublish(confirmModal.project);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTENDED CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "640px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create New Architectural Project</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="admin-modal-body">
                {/* 1. BASIC INFORMATION */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Project Title / Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    required
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g. Minimalist Travertine Villa"
                    autoFocus
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Portfolio Category *</label>
                    {!isAddingNewCat ? (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <select
                          className="admin-select"
                          value={createForm.category_id || ""}
                          onChange={e => {
                            const catId = Number(e.target.value);
                            const matchedCat = categories.find(c => c.id === catId);
                            setCreateForm({
                              ...createForm,
                              category_id: catId,
                              category: matchedCat ? matchedCat.name : "",
                              subcategory_id: undefined,
                              project_type: matchedCat?.subcategories?.[0]?.name || "Private Residence"
                            });
                          }}
                          required
                        >
                          <option value="">-- Select Portfolio Category --</option>
                          {categories.filter(c => c.is_active).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="sd-admin-btn-secondary"
                          style={{ padding: "0 0.6rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                          onClick={() => setIsAddingNewCat(true)}
                          title="Add new category"
                        >
                          + New
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="New category name"
                          value={newCatInput}
                          onChange={e => setNewCatInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="sd-admin-btn-primary"
                          style={{ padding: "0 0.6rem", fontSize: "0.75rem" }}
                          onClick={async () => {
                            if (newCatInput.trim()) {
                              try {
                                const created = await adminService.createCategory({ name: newCatInput.trim() });
                                setCategories([...categories, created]);
                                setCreateForm({
                                  ...createForm,
                                  category_id: created.id,
                                  category: created.name,
                                  subcategory_id: undefined
                                });
                                setIsAddingNewCat(false);
                                setNewCatInput("");
                              } catch (err: any) {
                                alert("Failed to create category: " + err.message);
                              }
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="sd-admin-btn-secondary"
                          style={{ padding: "0 0.5rem" }}
                          onClick={() => setIsAddingNewCat(false)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Subcategory / Typology (Optional)</label>
                    {(() => {
                      const selectedCat = categories.find(c => c.id === createForm.category_id || c.name.toLowerCase() === createForm.category.toLowerCase());
                      const subcats = selectedCat?.subcategories || [];
                      return subcats.length > 0 ? (
                        <select
                          className="admin-select"
                          value={createForm.subcategory_id || ""}
                          onChange={e => {
                            const subId = e.target.value ? Number(e.target.value) : undefined;
                            const matchedSub = subcats.find(s => s.id === subId);
                            setCreateForm({
                              ...createForm,
                              subcategory_id: subId,
                              project_type: matchedSub ? matchedSub.name : createForm.project_type
                            });
                          }}
                        >
                          <option value="">-- Select Typology (Optional) --</option>
                          {subcats.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="admin-input"
                          value={createForm.project_type}
                          onChange={e => setCreateForm({ ...createForm, project_type: e.target.value })}
                          placeholder="e.g. Bespoke Villa, Penthouse"
                        />
                      );
                    })()}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Assign to Client</label>
                  <select
                    className="admin-select"
                    value={createForm.client_id || ""}
                    onChange={e => setCreateForm({ ...createForm, client_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">-- Select Client (Optional) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Location</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={createForm.location}
                      onChange={e => setCreateForm({ ...createForm, location: e.target.value })}
                      placeholder="Ahmedabad, Gujarat"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Year</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={createForm.year}
                      onChange={e => setCreateForm({ ...createForm, year: Number(e.target.value) })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Status</label>
                    <select
                      className="admin-select"
                      value={createForm.status}
                      onChange={e => setCreateForm({ ...createForm, status: e.target.value })}
                    >
                      <option value="PLANNING">PLANNING</option>
                      <option value="CONSULTATION">CONSULTATION</option>
                      <option value="DESIGN">DESIGN</option>
                      <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
                      <option value="APPROVAL">APPROVAL</option>
                      <option value="EXECUTION">EXECUTION</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>

                {/* 2. IMAGES & COVERS */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Cover Image URL</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={createForm.cover_image}
                    onChange={e => setCreateForm({ ...createForm, cover_image: e.target.value })}
                    placeholder="/uploads/projects/... or https://..."
                  />
                </div>

                {/* 3. DISPLAY OPTIONS */}
                <div style={{ display: "flex", gap: "1.5rem", padding: "0.8rem 0", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={createForm.is_published}
                      onChange={e => setCreateForm({ ...createForm, is_published: e.target.checked })}
                    />
                    Publish Immediately
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={createForm.featured}
                      onChange={e => setCreateForm({ ...createForm, featured: e.target.checked })}
                    />
                    Mark as Featured Project
                  </label>
                </div>

                {/* 4. DESCRIPTION */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Project Brief / Description</label>
                  <textarea
                    rows={3}
                    className="admin-textarea"
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe spatial volume, material specifications, and architectural approach..."
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="sd-admin-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sd-admin-btn-primary"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
