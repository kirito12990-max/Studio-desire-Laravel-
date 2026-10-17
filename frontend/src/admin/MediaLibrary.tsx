import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { UnifiedMediaItem, AdminProject, MediaAuditReport } from "../types/admin";
import { StudioImage } from "../components/StudioImage";
import { resolveMediaUrl } from "../utils/mediaResolver";

interface MediaLibraryProps {
  initialFilter?: string;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ initialFilter = "all" }) => {
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [mediaItems, setMediaItems] = useState<UnifiedMediaItem[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Batch assignment state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<number | undefined>();
  const [targetRoomName, setTargetRoomName] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Storage audit state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<MediaAuditReport | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);

  useEffect(() => {
    adminService.getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    loadMedia();
  }, [activeFilter, selectedProjectId]);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await adminService.getUnifiedMedia({
        mediaType: activeFilter === "all" ? undefined : activeFilter,
        projectId: selectedProjectId !== "ALL" ? Number(selectedProjectId) : undefined,
        q: searchQuery.trim() || undefined
      });
      setMediaItems(items);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedia();
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId) {
      alert("Please select a target project.");
      return;
    }

    setAssigning(true);
    try {
      await adminService.batchAssignMedia(selectedIds, targetProjectId, {
        roomName: targetRoomName || undefined,
        publishNow
      });
      setShowAssignModal(false);
      loadMedia();
    } catch (err: any) {
      alert("Failed to assign media: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this media asset?")) return;
    try {
      await adminService.deleteMediaItem(id);
      setMediaItems(mediaItems.filter(m => m.id !== id));
    } catch (err: any) {
      alert("Failed to delete media asset: " + err.message);
    }
  };

  const handleToggleItemPublish = async (item: UnifiedMediaItem) => {
    try {
      const updated = await adminService.updateMediaItem(item.id, {
        is_published: !item.is_published,
        status: !item.is_published ? "published" : "draft"
      });
      setMediaItems(mediaItems.map(m => m.id === item.id ? updated : m));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleRunAudit = async () => {
    setAuditLoading(true);
    setShowAuditModal(true);
    setRepairResult(null);
    try {
      const report = await adminService.auditMediaRecords();
      setAuditReport(report);
    } catch (err: any) {
      alert("Audit failed: " + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRunRepair = async () => {
    setRepairing(true);
    try {
      const res = await adminService.repairMissingMedia();
      setRepairResult(`Repaired ${res.repaired_count} records successfully.`);
      const report = await adminService.auditMediaRecords();
      setAuditReport(report);
      loadMedia();
    } catch (err: any) {
      alert("Repair failed: " + err.message);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>
            Unified Media Library
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
            Universal visual asset repository: Photos, Videos, 3D Renders, VR Portals, and Project Documents
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={handleRunAudit}
            disabled={auditLoading}
            style={{ fontSize: "0.7rem", padding: "0.4rem 0.8rem" }}
          >
            {auditLoading ? "Auditing..." : "Storage Health & Audit"}
          </button>

          {selectedIds.length > 0 && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setShowAssignModal(true)}
              style={{ fontSize: "0.7rem", padding: "0.4rem 0.8rem" }}
            >
              Assign {selectedIds.length} Selected Files →
            </button>
          )}
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Filter & Search Bar */}
      <div className="media-filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div className="media-tab-group">
          {[
            { id: "all", label: "All Assets" },
            { id: "photos", label: "Photos" },
            { id: "videos", label: "Videos" },
            { id: "3d", label: "3D Renders" },
            { id: "vr", label: "VR" },
            { id: "documents", label: "Documents" },
            { id: "unassigned", label: "Unassigned" }
          ].map(tab => (
            <button
              key={tab.id}
              className={`media-tab-btn ${activeFilter === tab.id ? "active" : ""}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.6rem" }}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search caption, title, room..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: "0.35rem 0.6rem",
              fontSize: "0.72rem",
              backgroundColor: "var(--admin-surface)",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-main)",
              fontFamily: "var(--admin-font-mono)"
            }}
          />
          <button type="submit" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.68rem", padding: "0.35rem 0.6rem" }}>
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: "3rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
          Loading media assets...
        </div>
      ) : mediaItems.length === 0 ? (
        <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
          No media assets found for this filter.
        </div>
      ) : (
        <div className="media-library-grid">
          {mediaItems.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="media-item-card"
                style={{ borderColor: isSelected ? "var(--admin-accent)" : undefined }}
              >
                <div className="media-item-thumb-box">
                  {item.media_type === "video" ? (
                    <video src={resolveMediaUrl(item.url)} className="media-item-thumb" muted preload="metadata" />
                  ) : item.media_type === "document" || item.url?.toLowerCase().endsWith(".pdf") ? (
                    item.thumbnail_url ? (
                      <StudioImage
                        src={item.url}
                        thumbnailSrc={item.thumbnail_url}
                        alt={item.caption || item.title || `Document #${item.id}`}
                        className="media-item-thumb"
                        showMissingState={true}
                      />
                    ) : (
                      <div className="media-item-thumb" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#1e1e24", color: "#a1a1aa" }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span style={{ fontSize: "0.6rem", marginTop: "0.3rem", fontFamily: "var(--admin-font-mono)" }}>PDF DOCUMENT</span>
                      </div>
                    )
                  ) : (
                    <StudioImage
                      src={item.url}
                      thumbnailSrc={item.thumbnail_url}
                      alt={item.caption || item.title || `Asset #${item.id}`}
                      className="media-item-thumb"
                      showMissingState={true}
                    />
                  )}

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    style={{ position: "absolute", top: "0.6rem", left: "0.6rem", cursor: "pointer", width: "16px", height: "16px" }}
                    title="Select item for batch assignment"
                  />

                  <span
                    className={`project-card-badge ${item.is_published ? "badge-published" : "badge-draft"}`}
                    style={{ position: "absolute", bottom: "0.6rem", right: "0.6rem", fontSize: "0.55rem" }}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="media-item-info">
                  <div className="media-item-title" title={item.caption || item.url}>
                    {item.caption || item.title || `Asset #${item.id}`}
                  </div>
                  <div className="media-item-meta">
                    <span>{item.project_title || "Unassigned"}</span>
                    <span>{item.room_name || item.media_type.toUpperCase()}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid var(--admin-border)" }}>
                    <button
                      onClick={() => handleToggleItemPublish(item)}
                      style={{ background: "transparent", border: "none", color: item.is_published ? "var(--admin-text-dim)" : "var(--admin-accent)", cursor: "pointer", fontSize: "0.65rem", fontFamily: "var(--admin-font-mono)" }}
                    >
                      {item.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "transparent", border: "none", color: "var(--admin-danger)", cursor: "pointer", fontSize: "0.65rem" }}
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

      {/* Batch Assign Modal */}
      {showAssignModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-window">
            <div className="admin-modal-header">
              <div className="admin-modal-title">Assign {selectedIds.length} Selected Files to Project</div>
              <button className="admin-modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>

            <form onSubmit={handleBatchAssign}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Target Project Archive *</label>
                  <select
                    className="admin-select"
                    value={targetProjectId || ""}
                    onChange={e => setTargetProjectId(parseInt(e.target.value))}
                    required
                  >
                    <option value="">— Select Target Project —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.year})</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Room / Spatial Area (Optional)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={targetRoomName}
                    onChange={e => setTargetRoomName(e.target.value)}
                    placeholder="e.g. Living Room, Master Bedroom, Kitchen"
                  />
                </div>

                <div className="admin-form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--admin-font-mono)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={publishNow}
                      onChange={e => setPublishNow(e.target.checked)}
                    />
                    Publish immediately to project archive
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={assigning}
                >
                  {assigning ? "Assigning..." : "Commit Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Storage Health & Audit Modal */}
      {showAuditModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-window" style={{ maxWidth: "680px" }}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">Media Storage Health & Diagnostics</div>
              <button className="admin-modal-close" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {auditLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
                  Analyzing file integrity across disk and database...
                </div>
              ) : auditReport ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.8rem", marginBottom: "1.2rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.8rem", borderRadius: "4px", border: "1px solid var(--admin-border)" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>STORAGE ROOT</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: auditReport.uploads_root_exists ? "#10b981" : "#ef4444" }}>
                        {auditReport.uploads_root_exists ? "Active & Mounted" : "Missing"}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.8rem", borderRadius: "4px", border: "1px solid var(--admin-border)" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>VERIFIED ASSETS</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#10b981" }}>
                        {auditReport.valid_local_files + auditReport.valid_external_urls} / {auditReport.total_records_checked}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.8rem", borderRadius: "4px", border: "1px solid var(--admin-border)" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>MISSING ASSETS</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: auditReport.missing_local_files.length > 0 ? "#f59e0b" : "#10b981" }}>
                        {auditReport.missing_local_files.length}
                      </div>
                    </div>
                  </div>

                  {repairResult && (
                    <div style={{ padding: "0.6rem 0.8rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "4px", color: "#10b981", fontSize: "0.72rem", marginBottom: "1rem" }}>
                      ✓ {repairResult}
                    </div>
                  )}

                  {auditReport.missing_local_files.length > 0 ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Missing Asset References:</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={handleRunRepair}
                          disabled={repairing}
                          style={{ fontSize: "0.68rem", padding: "0.3rem 0.6rem" }}
                        >
                          {repairing ? "Repairing..." : "Auto-Repair Known Missing"}
                        </button>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "0.6rem", border: "1px solid var(--admin-border)" }}>
                        {auditReport.missing_local_files.map((item, idx) => (
                          <div key={idx} style={{ fontSize: "0.68rem", fontFamily: "var(--admin-font-mono)", padding: "0.4rem 0", borderBottom: idx < auditReport.missing_local_files.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                            <span style={{ color: "var(--admin-accent)" }}>[{item.model} #{item.id}]</span> {item.field}: <code style={{ color: "#ef4444" }}>{item.url}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "1rem", textAlign: "center", color: "#10b981", fontSize: "0.78rem", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "4px", background: "rgba(16, 185, 129, 0.05)" }}>
                      ✓ All {auditReport.total_records_checked} media records match valid files on disk or verified external URLs.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowAuditModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

