import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { visualizationService } from "../services/visualizationService";
import {
  VisualizationSpace,
  VisualizationMedia,
  VisualizationSpaceInput,
  VisualizationMediaInput
} from "../types/visualization";
import { AdminProject } from "../types/admin";
import { StudioModal, StudioConfirmModal } from "../components/StudioModal";
import { StudioImage } from "../components/StudioImage";

const ROOM_OPTIONS = [
  "ALL",
  "Living Room",
  "Culinary Studio",
  "Master Suite",
  "Private Cinema",
  "Courtyard",
  "Spa Suite",
  "Bathroom",
  "Dining",
  "Exterior",
  "Foyer",
  "Terrace",
  "Other"
];

const CATEGORY_OPTIONS = [
  "Residential",
  "Commercial",
  "Hospitality",
  "Landscape",
  "Interior Architecture"
];

const STATUS_OPTIONS = [
  "APPROVED",
  "CLIENT_REVIEW",
  "INTERNAL_REVIEW",
  "DRAFT",
  "ARCHIVED"
];

const INITIAL_FORM_DATA: VisualizationSpaceInput = {
  project_id: null,
  title: "",
  slug: "",
  project_name: "",
  room: "Living Room",
  category: "Residential",
  year: 2026,
  location: "Ahmedabad, Gujarat",
  description: "",
  notes: "",
  software: "Corona Renderer · 3ds Max · Unreal Engine VR",
  status: "APPROVED",
  cover_image: "",
  vr_url: "",
  has_vr: false,
  show_qr: true,
  vr_type: "external",
  is_published: true,
  sort_order: 0
};

export const ThreeDManager: React.FC = () => {
  const [spaces, setSpaces] = useState<VisualizationSpace[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<VisualizationSpace | null>(null);
  const [formData, setFormData] = useState<VisualizationSpaceInput>(INITIAL_FORM_DATA);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<VisualizationSpace | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Supporting Media modal
  const [mediaSpace, setMediaSpace] = useState<VisualizationSpace | null>(null);
  const [newMediaForm, setNewMediaForm] = useState<VisualizationMediaInput>({
    url: "",
    caption: "",
    angle: "Wide Perspective",
    vr_url: "",
    has_vr: false,
    show_qr: false,
    vr_type: "external",
    sort_order: 0
  });
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [deleteMediaTarget, setDeleteMediaTarget] = useState<VisualizationMedia | null>(null);
  const [deleteMediaLoading, setDeleteMediaLoading] = useState(false);

  // QR Preview Modal
  const [qrModal, setQrModal] = useState<{ title: string; url: string; qrUrl: string } | null>(null);

  // File upload state
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    loadSpaces();
    loadProjects();
  }, [selectedRoom]);

  const loadSpaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminVisualizations({
        room: selectedRoom !== "ALL" ? selectedRoom : undefined,
        q: searchQuery || undefined
      });
      setSpaces(data);
    } catch (err: any) {
      setError(err.message || "Failed to load 3D visualization archive");
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const pList = await adminService.getProjects();
      setProjects(pList);
    } catch (err) {
      console.warn("Could not load projects for selector:", err);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      room: selectedRoom !== "ALL" ? selectedRoom : "Living Room"
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (space: VisualizationSpace) => {
    setEditingSpace(space);
    setFormData({
      project_id: space.project_id || null,
      title: space.title || "",
      slug: space.slug || "",
      project_name: space.project_name || "",
      room: space.room || "Living Room",
      category: space.category || "Residential",
      year: space.year || 2026,
      location: space.location || "",
      description: space.description || "",
      notes: space.notes || "",
      software: space.software || "Corona Renderer · 3ds Max · Unreal Engine VR",
      status: space.status || "APPROVED",
      cover_image: space.cover_image || "",
      vr_url: space.vr_url || "",
      has_vr: Boolean(space.has_vr),
      show_qr: space.show_qr !== undefined ? space.show_qr : true,
      vr_type: space.vr_type || "external",
      is_published: space.is_published !== undefined ? space.is_published : true,
      sort_order: space.sort_order || 0
    });
    setFormError(null);
  };

  // Auto-fill project title if project selected
  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setFormData(prev => ({ ...prev, project_id: null }));
    } else {
      const pId = parseInt(val, 10);
      const matched = projects.find(p => p.id === pId);
      setFormData(prev => ({
        ...prev,
        project_id: pId,
        project_name: matched ? matched.title : prev.project_name,
        location: matched?.location || prev.location
      }));
    }
  };

  // Cover image file upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCover(true);
    setFormError(null);
    try {
      const res = await adminService.uploadBulk([files[0]], formData.project_id || undefined);
      if (res.items && res.items.length > 0) {
        setFormData(prev => ({ ...prev, cover_image: res.items[0].url }));
      } else {
        throw new Error("Upload did not return a valid file URL.");
      }
    } catch (err: any) {
      setFormError("Cover upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  // Save Create or Edit Space
  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Visualization title is required.");
      return;
    }
    if (!formData.cover_image.trim()) {
      setFormError("Cover image URL or upload is required.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    const payload: VisualizationSpaceInput = {
      ...formData,
      title: formData.title.trim(),
      project_name: formData.project_name?.trim() || "Studio Desire Project",
      cover_image: formData.cover_image.trim(),
      vr_url: formData.vr_url?.trim() || null,
      has_vr: Boolean(formData.vr_url?.trim())
    };

    try {
      if (editingSpace) {
        const updated = await adminService.updateVisualization(editingSpace.id, payload);
        setSpaces(prev => prev.map(s => s.id === updated.id ? updated : s));
        setEditingSpace(null);
        triggerSuccess(`Updated 3D Visualization: ${updated.title}`);
      } else {
        const created = await adminService.createVisualization(payload);
        setSpaces(prev => [created, ...prev]);
        setIsCreateOpen(false);
        triggerSuccess(`Created 3D Visualization: ${created.title}`);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save visualization space");
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Space confirmation
  const handleConfirmDeleteSpace = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminService.deleteVisualization(deleteTarget.id);
      setSpaces(prev => prev.filter(s => s.id !== deleteTarget.id));
      triggerSuccess(`Deleted visualization space "${deleteTarget.title}".`);
      setDeleteTarget(null);
    } catch (err: any) {
      alert("Failed to delete visualization space: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Secondary Media File Upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    setMediaError(null);
    try {
      const res = await adminService.uploadBulk([files[0]], mediaSpace?.project_id || undefined);
      if (res.items && res.items.length > 0) {
        setNewMediaForm(prev => ({ ...prev, url: res.items[0].url }));
      } else {
        throw new Error("Upload did not return a valid file URL.");
      }
    } catch (err: any) {
      setMediaError("Media upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  // Add Secondary Perspective
  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaSpace) return;
    if (!newMediaForm.url.trim()) {
      setMediaError("Render image URL or file upload is required.");
      return;
    }

    setMediaSaving(true);
    setMediaError(null);
    try {
      const createdMedia = await adminService.addVisualizationMedia(mediaSpace.id, {
        ...newMediaForm,
        url: newMediaForm.url.trim(),
        vr_url: newMediaForm.vr_url?.trim() || null,
        has_vr: Boolean(newMediaForm.vr_url?.trim())
      });

      // Update space in media dialog and main state
      const updatedMediaList = [...(mediaSpace.media || []), createdMedia];
      const updatedSpace = { ...mediaSpace, media: updatedMediaList };
      setMediaSpace(updatedSpace);
      setSpaces(prev => prev.map(s => s.id === updatedSpace.id ? updatedSpace : s));

      setNewMediaForm({
        url: "",
        caption: "",
        angle: "Wide Perspective",
        vr_url: "",
        has_vr: false,
        show_qr: false,
        vr_type: "external",
        sort_order: updatedMediaList.length
      });
      triggerSuccess("Added secondary perspective render.");
    } catch (err: any) {
      setMediaError(err.message || "Failed to add perspective render");
    } finally {
      setMediaSaving(false);
    }
  };

  // Delete Secondary Media confirmation
  const handleConfirmDeleteMedia = async () => {
    if (!deleteMediaTarget || !mediaSpace) return;
    setDeleteMediaLoading(true);
    try {
      await adminService.deleteVisualizationMedia(deleteMediaTarget.id);
      const updatedMediaList = (mediaSpace.media || []).filter(m => m.id !== deleteMediaTarget.id);
      const updatedSpace = { ...mediaSpace, media: updatedMediaList };
      setMediaSpace(updatedSpace);
      setSpaces(prev => prev.map(s => s.id === updatedSpace.id ? updatedSpace : s));
      setDeleteMediaTarget(null);
      triggerSuccess("Removed secondary perspective render.");
    } catch (err: any) {
      alert("Failed to delete secondary render: " + err.message);
    } finally {
      setDeleteMediaLoading(false);
    }
  };

  // Filtered spaces by search query
  const displayedSpaces = spaces.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.project_name?.toLowerCase().includes(q) ||
      s.room?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
              3D Visualizations & Spatial Volumes
            </h2>
            <span className="admin-status-pill pill-published" style={{ fontSize: "0.68rem" }}>
              {spaces.length} Spaces
            </span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Photorealistic architectural spatial renders categorized by Living Room, Kitchen, Bedroom, Bathroom, Exterior, and VR links
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            type="text"
            className="admin-form-input"
            placeholder="Search spaces by room, title, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "260px", fontSize: "0.75rem", padding: "0.45rem 0.75rem" }}
          />
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleOpenCreate}
            style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
            Add Visualization
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="admin-success-banner" style={{ marginBottom: "1.25rem", animation: "fadeIn 0.2s ease" }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="admin-error-banner" style={{ marginBottom: "1.25rem" }}>
          {error}
        </div>
      )}

      {/* Room Filters Bar */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {ROOM_OPTIONS.map(room => (
          <button
            key={room}
            className={`admin-btn ${selectedRoom === room ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem" }}
            onClick={() => setSelectedRoom(room)}
          >
            {room}
          </button>
        ))}
      </div>

      {/* 3D Visualizations Grid */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "3rem 0", textAlign: "center" }}>
          Loading 3D visualization archives...
        </div>
      ) : displayedSpaces.length === 0 ? (
        <div style={{ padding: "4rem 2rem", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginBottom: "1rem" }}>
            No 3D spatial volumes found for "{selectedRoom}" {searchQuery ? `matching "${searchQuery}"` : ""}.
          </div>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleOpenCreate}
            style={{ fontSize: "0.75rem", padding: "0.5rem 1.25rem" }}
          >
            Create New 3D Visualization
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {displayedSpaces.map(space => {
            const hasVrConfigured = Boolean(space.vr_url);
            const secondaryCount = space.media?.length || 0;

            return (
              <div key={space.id} className="admin-project-card" style={{ display: "flex", flexDirection: "column" }}>
                {/* Cover Preview Image */}
                <div className="project-card-cover-wrapper" style={{ height: "200px", position: "relative" }}>
                  <StudioImage
                    src={space.cover_image}
                    alt={space.title}
                    className="project-card-cover"
                    loading="lazy"
                    fallbackSrc="/uploads/projects/placeholder.webp"
                    showMissingState={false}
                  />
                  <span className="project-card-badge badge-published" style={{ textTransform: "uppercase" }}>
                    {space.room}
                  </span>
                  
                  {hasVrConfigured ? (
                    <span
                      className="badge-demo"
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}
                      onClick={() => setQrModal({
                        title: `${space.title} (${space.room})`,
                        url: space.vr_url!,
                        qrUrl: visualizationService.getQrCodeUrl(space.slug || space.id.toString())
                      })}
                      title="Click to view QR Code & test VR"
                    >
                      <span style={{ fontSize: "0.75rem" }}>🕶️</span> 360° VR CONNECTED
                    </span>
                  ) : (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "10px",
                        background: "rgba(0,0,0,0.65)",
                        color: "var(--admin-text-muted)",
                        fontSize: "0.62rem",
                        padding: "2px 6px",
                        borderRadius: "2px",
                        fontFamily: "var(--admin-font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}
                    >
                      No VR Linked
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="project-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div className="project-card-header">
                    <span className="project-card-title">{space.title}</span>
                    <span className="project-card-meta">{space.project_name}</span>
                  </div>

                  <div className="project-card-desc" style={{ flex: 1, marginBottom: "0.75rem" }}>
                    {space.description || "Photorealistic Corona Renderer / 3ds Max architectural spatial render."}
                  </div>

                  {/* Metadata Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", borderTop: "1px solid var(--admin-border)", paddingTop: "0.6rem", marginBottom: "0.75rem" }}>
                    <span>{space.category} · {space.year}</span>
                    <span>{space.status || "APPROVED"}</span>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", borderTop: "1px solid var(--admin-border)", paddingTop: "0.75rem" }}>
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.65rem", flex: 1 }}
                      onClick={() => handleOpenEdit(space)}
                    >
                      Edit Space
                    </button>

                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.65rem", flex: 1.2, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                      onClick={() => {
                        setMediaSpace(space);
                        setMediaError(null);
                      }}
                      title="Manage detail render perspectives"
                    >
                      <span>Renders</span>
                      <span className="admin-status-pill pill-published" style={{ fontSize: "0.6rem", padding: "1px 5px" }}>
                        {secondaryCount}
                      </span>
                    </button>

                    {hasVrConfigured && (
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ fontSize: "0.7rem", padding: "0.35rem 0.55rem" }}
                        onClick={() => setQrModal({
                          title: `${space.title} — ${space.room}`,
                          url: space.vr_url!,
                          qrUrl: visualizationService.getQrCodeUrl(space.slug || space.id.toString())
                        })}
                        title="View VR Link & QR Code"
                      >
                        QR
                      </button>
                    )}

                    <button
                      className="admin-btn admin-btn-danger"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.55rem" }}
                      onClick={() => setDeleteTarget(space)}
                      title="Delete visualization space"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE & EDIT VISUALIZATION MODAL                                         */}
      {/* ========================================================================= */}
      {(isCreateOpen || editingSpace) && (
        <StudioModal
          isOpen={true}
          onClose={() => {
            if (formSaving) return;
            setIsCreateOpen(false);
            setEditingSpace(null);
          }}
          size="lg"
          eyebrow={editingSpace ? "EDIT ARCHITECTURAL VOLUME" : "NEW 3D VISUALIZATION"}
          title={editingSpace ? `Edit ${editingSpace.title}` : "Add 3D Visualization Space"}
          subtitle="Configure photorealistic 3D spatial room, cover photograph, project association, and Level 2 VR portal."
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingSpace(null);
                }}
                disabled={formSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="viz-space-form"
                className="admin-btn admin-btn-primary"
                disabled={formSaving || uploadingCover}
              >
                {formSaving ? "Saving Space..." : editingSpace ? "Save Changes" : "Create Visualization"}
              </button>
            </div>
          }
        >
          <form id="viz-space-form" onSubmit={handleSaveSpace} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {formError && (
              <div className="admin-error-banner" style={{ margin: 0 }}>
                {formError}
              </div>
            )}

            {/* Project Linkage & Title */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="admin-form-label">Associated Project</label>
                <select
                  className="admin-form-select"
                  value={formData.project_id || ""}
                  onChange={handleProjectSelect}
                >
                  <option value="">— Standalone / Custom Project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category || "Project"})
                    </option>
                  ))}
                </select>
                <span className="admin-form-helper">Links this 3D render to a portfolio project archive</span>
              </div>

              <div>
                <label className="admin-form-label">
                  Project Title / Display Name <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Project AA / The Courtyard House"
                  value={formData.project_name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Title & Slug */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="admin-form-label">
                  Visualization Room Title <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Kitchen Culinary Studio"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      title: newTitle,
                      // auto generate slug if creating
                      slug: !editingSpace && !prev.slug
                        ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                        : prev.slug
                    }));
                  }}
                  required
                />
              </div>

              <div>
                <label className="admin-form-label">Slug (URL Identifier)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. kitchen-culinary-studio"
                  value={formData.slug || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                />
                <span className="admin-form-helper">Leave empty to auto-generate from title</span>
              </div>
            </div>

            {/* Room, Category, Year, Status */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
              <div>
                <label className="admin-form-label">
                  Spatial Room <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <select
                  className="admin-form-select"
                  value={formData.room}
                  onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                  required
                >
                  {ROOM_OPTIONS.filter(r => r !== "ALL").map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-form-label">Category</label>
                <select
                  className="admin-form-select"
                  value={formData.category || "Residential"}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-form-label">Year</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={formData.year || 2026}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value, 10) || 2026 }))}
                />
              </div>

              <div>
                <label className="admin-form-label">Status</label>
                <select
                  className="admin-form-select"
                  value={formData.status || "APPROVED"}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location & Software */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="admin-form-label">Location</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Ahmedabad, Gujarat"
                  value={formData.location || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="admin-form-label">Rendering Engine & Software</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Corona Renderer · 3ds Max · Unreal Engine VR"
                  value={formData.software || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, software: e.target.value }))}
                />
              </div>
            </div>

            {/* Cover Image URL & File Upload */}
            <div>
              <label className="admin-form-label">
                Main Cover Image <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Paste high-res image URL (e.g. /uploads/... or https://...)"
                  value={formData.cover_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                  required
                  style={{ flex: 1 }}
                />
                <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                  {uploadingCover ? "Uploading..." : "Upload File"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                </label>
              </div>

              {formData.cover_image && (
                <div style={{ marginTop: "0.5rem", width: "100%", maxHeight: "160px", overflow: "hidden", borderRadius: "2px", border: "1px solid var(--admin-border)", backgroundColor: "var(--admin-surface)" }}>
                  <StudioImage
                    src={formData.cover_image}
                    alt="Cover preview"
                    style={{ width: "100%", height: "160px", objectFit: "cover" }}
                    fallbackSrc="/uploads/projects/placeholder.webp"
                  />
                </div>
              )}
            </div>

            {/* VR Experience URL (Level 2: Room VR) */}
            <div style={{ padding: "0.85rem", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "2px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>
                  🕶️ Level 2: Room VR Destination URL
                </label>
                {formData.vr_url && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => setQrModal({
                      title: formData.title || "Room VR",
                      url: formData.vr_url!,
                      qrUrl: visualizationService.getDynamicQrUrl(formData.vr_url!)
                    })}
                  >
                    Preview QR
                  </button>
                )}
              </div>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://my.matterport.com/show/?m=... or /uploads/vr_builds/..."
                value={formData.vr_url || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vr_url: e.target.value,
                  has_vr: Boolean(e.target.value.trim())
                }))}
              />
              <span className="admin-form-helper">
                Configures the Room VR Portal and QR code for this specific architectural volume.
              </span>

              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.show_qr !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_qr: e.target.checked }))}
                  />
                  <span>Show QR Code on Public Portal</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.is_published !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  />
                  <span>Published to Public Archive</span>
                </label>
              </div>
            </div>

            {/* Description & Internal Notes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="admin-form-label">Editorial Description</label>
                <textarea
                  className="admin-form-textarea"
                  rows={3}
                  placeholder="Architectural design narrative and lighting atmosphere..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="admin-form-label">Studio Notes</label>
                <textarea
                  className="admin-form-textarea"
                  rows={3}
                  placeholder="Internal rendering notes, lighting passes, or client revision history..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          </form>
        </StudioModal>
      )}

      {/* ========================================================================= */}
      {/* SECONDARY PERSPECTIVES (MEDIA) MANAGER MODAL                               */}
      {/* ========================================================================= */}
      {mediaSpace && (
        <StudioModal
          isOpen={true}
          onClose={() => setMediaSpace(null)}
          size="xl"
          eyebrow="SECONDARY PERSPECTIVES & DETAIL RENDERS"
          title={`${mediaSpace.title} — Detail Perspectives (${mediaSpace.media?.length || 0})`}
          subtitle="Manage secondary camera angles, material detail close-ups, dusk studies, and Level 3 individual render VR portals for this space."
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setMediaSpace(null)}
              >
                Close Perspectives Manager
              </button>
            </div>
          }
        >
          <div>
            {mediaError && (
              <div className="admin-error-banner" style={{ marginBottom: "1rem" }}>
                {mediaError}
              </div>
            )}

            {/* Form to Add New Perspective */}
            <div style={{ padding: "1.25rem", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "2px", marginBottom: "1.5rem" }}>
              <h4 style={{ fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.85rem" }}>
                Add New Secondary Perspective
              </h4>
              <form onSubmit={handleAddMedia} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="admin-form-label">
                      Render Image URL / File <span style={{ color: "var(--admin-danger)" }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder="Image URL or upload..."
                        value={newMediaForm.url}
                        onChange={(e) => setNewMediaForm(prev => ({ ...prev, url: e.target.value }))}
                        required
                        style={{ flex: 1 }}
                      />
                      <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", whiteSpace: "nowrap", padding: "0.4rem 0.65rem", fontSize: "0.7rem" }}>
                        {uploadingMedia ? "..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleMediaUpload}
                          disabled={uploadingMedia}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="admin-form-label">Perspective Angle / Label</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Island Detail / Dusk Lighting"
                      value={newMediaForm.angle || ""}
                      onChange={(e) => setNewMediaForm(prev => ({ ...prev, angle: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="admin-form-label">Caption</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Marble Island Close-up"
                      value={newMediaForm.caption || ""}
                      onChange={(e) => setNewMediaForm(prev => ({ ...prev, caption: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", alignItems: "flex-end" }}>
                  <div>
                    <label className="admin-form-label">Level 3: Individual Render VR URL (Optional)</label>
                    <input
                      type="url"
                      className="admin-form-input"
                      placeholder="https://... 360 viewer for this specific perspective"
                      value={newMediaForm.vr_url || ""}
                      onChange={(e) => setNewMediaForm(prev => ({
                        ...prev,
                        vr_url: e.target.value,
                        has_vr: Boolean(e.target.value.trim())
                      }))}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="admin-btn admin-btn-primary"
                      disabled={mediaSaving || uploadingMedia}
                      style={{ width: "100%", padding: "0.55rem 1rem" }}
                    >
                      {mediaSaving ? "Adding..." : "+ Add Perspective"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Existing Perspectives */}
            <h4 style={{ fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.85rem" }}>
              Perspectives Archive ({mediaSpace.media?.length || 0})
            </h4>

            {(!mediaSpace.media || mediaSpace.media.length === 0) ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.75rem", backgroundColor: "var(--admin-surface)", border: "1px dashed var(--admin-border)" }}>
                No secondary perspectives added yet. Use the form above to attach detail renders.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {mediaSpace.media.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid var(--admin-border)",
                      borderRadius: "2px",
                      backgroundColor: "var(--admin-surface)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                  >
                    <div style={{ height: "150px", position: "relative" }}>
                      <StudioImage
                        src={item.url}
                        alt={item.caption || `Perspective ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        fallbackSrc="/uploads/projects/placeholder.webp"
                        showMissingState={false}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          backgroundColor: "rgba(0,0,0,0.75)",
                          color: "#fff",
                          fontSize: "0.62rem",
                          padding: "2px 6px",
                          borderRadius: "2px",
                          fontFamily: "var(--admin-font-mono)"
                        }}
                      >
                        #{idx + 1} {item.angle || "Angle"}
                      </span>

                      {item.vr_url && (
                        <span
                          className="badge-demo"
                          style={{
                            position: "absolute",
                            bottom: "8px",
                            left: "8px",
                            fontSize: "0.62rem",
                            padding: "2px 6px",
                            cursor: "pointer"
                          }}
                          onClick={() => setQrModal({
                            title: item.caption || `Perspective #${item.id}`,
                            url: item.vr_url!,
                            qrUrl: visualizationService.getDynamicQrUrl(item.vr_url!)
                          })}
                        >
                          VR LINKED
                        </span>
                      )}
                    </div>

                    <div style={{ padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--admin-text-main)", marginBottom: "0.3rem" }}>
                        {item.caption || "Untitled Perspective"}
                      </div>

                      {item.vr_url && (
                        <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.5rem" }}>
                          VR: {item.vr_url}
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem", borderTop: "1px solid var(--admin-border)", paddingTop: "0.5rem" }}>
                        {item.vr_url && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => setQrModal({
                              title: item.caption || `Perspective #${item.id}`,
                              url: item.vr_url!,
                              qrUrl: visualizationService.getDynamicQrUrl(item.vr_url!)
                            })}
                          >
                            QR
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem" }}
                          onClick={() => setDeleteMediaTarget(item)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StudioModal>
      )}

      {/* ========================================================================= */}
      {/* DELETE SPACE CONFIRMATION MODAL                                           */}
      {/* ========================================================================= */}
      <StudioConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteSpace}
        title="Delete 3D Visualization Space"
        eyebrow="PERMANENT ACTION"
        isDestructive={true}
        isLoading={deleteLoading}
        confirmText="Delete Space"
        message={
          <div>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong> ({deleteTarget?.room})?
            <br /><br />
            <span style={{ color: "var(--admin-danger)", fontWeight: 500 }}>
              This will remove the visualization room record, its Level 2 VR portal, and all {deleteTarget?.media?.length || 0} secondary perspectives from the database.
            </span>
            <br /><br />
            <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
              Note: Physical static media files uploaded in the media library remain safely preserved.
            </span>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* DELETE SECONDARY MEDIA CONFIRMATION MODAL                                 */}
      {/* ========================================================================= */}
      <StudioConfirmModal
        isOpen={Boolean(deleteMediaTarget)}
        onClose={() => setDeleteMediaTarget(null)}
        onConfirm={handleConfirmDeleteMedia}
        title="Remove Supporting Perspective"
        eyebrow="REMOVE PERSPECTIVE"
        isDestructive={true}
        isLoading={deleteMediaLoading}
        confirmText="Remove Perspective"
        message={
          <div>
            Are you sure you want to remove perspective <strong>{deleteMediaTarget?.caption || `#${deleteMediaTarget?.id}`}</strong> from this room?
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* QR PREVIEW MODAL                                                          */}
      {/* ========================================================================= */}
      {qrModal && (
        <StudioModal
          isOpen={true}
          onClose={() => setQrModal(null)}
          size="sm"
          eyebrow="VR DESTINATION & QR CODE"
          title={qrModal.title}
          subtitle="Scan with mobile VR goggles or phone camera to enter the immersive spatial panorama."
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <a
                href={qrModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-secondary"
                style={{ fontSize: "0.75rem", textDecoration: "none" }}
              >
                Launch Experience ↗
              </a>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setQrModal(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem 0" }}>
            <div
              style={{
                width: "220px",
                height: "220px",
                backgroundColor: "#fff",
                padding: "12px",
                borderRadius: "4px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={qrModal.qrUrl}
                alt="QR Code"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>

            <div style={{ marginTop: "1rem", width: "100%", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "0.6rem 0.8rem", borderRadius: "2px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginBottom: "0.2rem" }}>
                CONFIGURED DESTINATION:
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-main)", wordBreak: "break-all", fontFamily: "var(--admin-font-mono)" }}>
                {qrModal.url}
              </div>
            </div>
          </div>
        </StudioModal>
      )}
    </div>
  );
};
