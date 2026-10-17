import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { StudioModal, StudioConfirmModal } from "../components/StudioModal";
import { StudioImage } from "../components/StudioImage";

interface VRItem {
  level: number;
  level_name: string;
  project_id?: number;
  space_id?: number;
  media_id?: number;
  project_name?: string;
  space_name?: string;
  room_name?: string;
  target_name: string;
  vr_url?: string | null;
  has_vr: boolean;
  vr_type?: string;
  show_qr?: boolean;
  vr_build_entry?: string | null;
  is_project_media?: boolean;
  cover_image?: string;
  caption?: string;
  angle?: string;
}

export const VRManager: React.FC = () => {
  const [data, setData] = useState<{
    level1_projects: VRItem[];
    level2_rooms: VRItem[];
    level3_renders: VRItem[];
  }>({ level1_projects: [], level2_rooms: [], level3_renders: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form input states to maintain synchronization
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [activeModes, setActiveModes] = useState<Record<string, "external" | "hosted">>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Level 3 filter
  const [level3Filter, setLevel3Filter] = useState<"ALL" | "CONFIGURED" | "UNCONFIGURED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Active editing & QR preview
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  // Confirmation modal for removal
  const [confirmRemoval, setConfirmRemoval] = useState<{
    scope: "project" | "room" | "render";
    id: number;
    title: string;
    isProjectMedia?: boolean;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    loadVR();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadVR = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAllVR();
      setData(res);

      // Initialize controlled inputs
      const newInputs: Record<string, string> = {};
      const newModes: Record<string, "external" | "hosted"> = {};

      res.level1_projects.forEach((p: VRItem) => {
        const key = `p_${p.project_id}`;
        newInputs[key] = p.vr_url || "";
        newModes[key] = (p.vr_type as any) === "hosted" ? "hosted" : "external";
      });

      res.level2_rooms.forEach((r: VRItem) => {
        const key = `r_${r.space_id}`;
        newInputs[key] = r.vr_url || "";
        newModes[key] = (r.vr_type as any) === "hosted" ? "hosted" : "external";
      });

      res.level3_renders.forEach((ren: VRItem) => {
        const key = `ren_${ren.media_id}_${ren.is_project_media ? "pm" : "vm"}`;
        newInputs[key] = ren.vr_url || "";
        newModes[key] = (ren.vr_type as any) === "hosted" ? "hosted" : "external";
      });

      setUrlInputs(newInputs);
      setActiveModes(newModes);
    } catch (err: any) {
      setError(err.message || "Failed to load VR experiences matrix");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProjectVR = async (projectId: number, vrUrl: string, showQr: boolean = true) => {
    const key = `p_${projectId}`;
    setSavingKey(key);
    setError(null);
    try {
      const cleanUrl = vrUrl.trim() || null;
      await adminService.setProjectVR(projectId, cleanUrl, activeModes[key] || "external", showQr);
      triggerSuccess("Updated Project-Wide Central VR experience.");
      await loadVR();
    } catch (err: any) {
      setError("Failed to update Project VR: " + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateRoomVR = async (spaceId: number, vrUrl: string, showQr: boolean = true) => {
    const key = `r_${spaceId}`;
    setSavingKey(key);
    setError(null);
    try {
      const cleanUrl = vrUrl.trim() || null;
      await adminService.setRoomVR(spaceId, cleanUrl, activeModes[key] || "external", showQr);
      triggerSuccess("Updated Room VR experience.");
      await loadVR();
    } catch (err: any) {
      setError("Failed to update Room VR: " + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateRenderVR = async (mediaId: number, vrUrl: string, showQr: boolean = false, isProjectMedia: boolean = false) => {
    const key = `ren_${mediaId}_${isProjectMedia ? "pm" : "vm"}`;
    setSavingKey(key);
    setError(null);
    try {
      const cleanUrl = vrUrl.trim() || null;
      await adminService.setRenderVR(mediaId, cleanUrl, activeModes[key] || "external", showQr, isProjectMedia);
      triggerSuccess("Updated Render Perspective VR experience.");
      await loadVR();
    } catch (err: any) {
      setError("Failed to update Render VR: " + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUploadBuild = async (file: File, scope: "project" | "room" | "render", targetId: number, key: string) => {
    setUploadingKey(key);
    setError(null);
    try {
      const res = await adminService.uploadVRBuild(file, scope, targetId);
      triggerSuccess(`Imported self-hosted VR experience: ${res.vr_url}`);
      await loadVR();
    } catch (err: any) {
      setError("VR Import Failed: " + (err.message || "Invalid package or extract error"));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoval) return;
    setRemoveLoading(true);
    try {
      if (confirmRemoval.scope === "project") {
        await adminService.setProjectVR(confirmRemoval.id, null);
      } else if (confirmRemoval.scope === "room") {
        await adminService.setRoomVR(confirmRemoval.id, null);
      } else {
        await adminService.setRenderVR(confirmRemoval.id, null, "external", false, Boolean(confirmRemoval.isProjectMedia));
      }
      triggerSuccess(`Removed VR destination for '${confirmRemoval.title}'.`);
      setConfirmRemoval(null);
      await loadVR();
    } catch (err: any) {
      setError("Failed to remove VR destination: " + err.message);
    } finally {
      setRemoveLoading(false);
    }
  };

  const openQrPreview = (url: string, title: string) => {
    setPreviewQrUrl(url);
    setPreviewTitle(title);
  };

  // Filtered Level 3 renders
  const filteredLevel3 = data.level3_renders.filter((ren) => {
    if (level3Filter === "CONFIGURED" && !ren.has_vr) return false;
    if (level3Filter === "UNCONFIGURED" && ren.has_vr) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTarget = ren.target_name?.toLowerCase().includes(q);
      const matchProject = ren.project_name?.toLowerCase().includes(q);
      const matchSpace = ren.space_name?.toLowerCase().includes(q);
      const matchAngle = ren.angle?.toLowerCase().includes(q);
      return matchTarget || matchProject || matchSpace || matchAngle;
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: "3rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", textAlign: "center" }}>
        Loading 3-Level VR Matrix...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 0.35rem" }}>
            3D & VR Experience Management (3 Levels)
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
            Manage virtual reality destinations across Level 1 (Project-wide), Level 2 (Room-specific), and Level 3 (Individual 3D render & photograph perspectives).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            type="text"
            className="admin-form-input"
            placeholder="Search all VR destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "240px", fontSize: "0.75rem", padding: "0.45rem 0.75rem" }}
          />
        </div>
      </div>

      {error && (
        <div className="admin-error-banner" style={{ marginBottom: "1.25rem" }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="admin-success-banner" style={{ marginBottom: "1.25rem" }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      <div className="vr-levels-container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* ========================================================================= */}
        {/* LEVEL 1: PROJECT-WIDE CENTRAL VR                                          */}
        {/* ========================================================================= */}
        <div className="vr-level-section" style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "2px", padding: "1.25rem" }}>
          <div className="vr-level-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Level 1: Project-Wide Central VR
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.2rem" }}>
                Full-project walkthrough experience for the entire architectural residence.
              </div>
            </div>
            <span className="admin-status-pill pill-published" style={{ fontSize: "0.68rem" }}>
              {data.level1_projects.filter((p) => p.has_vr).length} / {data.level1_projects.length} Active
            </span>
          </div>

          <div>
            {data.level1_projects.map((item) => {
              const key = `p_${item.project_id}`;
              const currentVal = urlInputs[key] ?? (item.vr_url || "");
              const mode = activeModes[key] || (item.vr_type === "hosted" ? "hosted" : "external");
              const isSaving = savingKey === key;

              return (
                <div
                  key={item.project_id}
                  className="vr-item-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 180px 1fr 140px",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--admin-border)"
                  }}
                >
                  <StudioImage
                    src={item.cover_image}
                    alt=""
                    style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--admin-border)" }}
                    fallbackSrc="/uploads/projects/placeholder.webp"
                    showMissingState={false}
                  />

                  <div style={{ fontFamily: "var(--admin-font-mono)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--admin-text-main)" }}>
                      {item.target_name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>
                      Project Central VR
                    </div>
                    <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.3rem" }}>
                      <button
                        className={`admin-btn ${mode === "external" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ padding: "0.15rem 0.4rem", fontSize: "0.62rem" }}
                        onClick={() => setActiveModes({ ...activeModes, [key]: "external" })}
                      >
                        Mode A: URL
                      </button>
                      <button
                        className={`admin-btn ${mode === "hosted" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ padding: "0.15rem 0.4rem", fontSize: "0.62rem" }}
                        onClick={() => setActiveModes({ ...activeModes, [key]: "hosted" })}
                      >
                        Mode B: ZIP
                      </button>
                    </div>
                  </div>

                  <div>
                    {mode === "external" ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="url"
                          className="admin-form-input"
                          style={{ fontSize: "0.75rem", padding: "0.45rem 0.8rem", flex: 1 }}
                          placeholder="https://... (Enter Central VR URL)"
                          value={currentVal}
                          onChange={(e) => setUrlInputs({ ...urlInputs, [key]: e.target.value })}
                        />
                        <button
                          className="admin-btn admin-btn-primary"
                          style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}
                          onClick={() => handleUpdateProjectVR(item.project_id!, currentVal, item.show_qr !== false)}
                          disabled={isSaving}
                        >
                          {isSaving ? "Saving..." : "Save URL"}
                        </button>
                        {item.has_vr && (
                          <button
                            className="admin-btn admin-btn-danger"
                            style={{ fontSize: "0.7rem" }}
                            onClick={() => setConfirmRemoval({ scope: "project", id: item.project_id!, title: item.target_name })}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", fontSize: "0.7rem", padding: "0.45rem 0.8rem" }}>
                          {uploadingKey === key ? "Extracting ZIP..." : "Upload VR Package (.ZIP)"}
                          <input
                            type="file"
                            accept=".zip"
                            style={{ display: "none" }}
                            disabled={uploadingKey === key}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadBuild(file, "project", item.project_id!, key);
                            }}
                          />
                        </label>
                        {item.vr_build_entry && (
                          <span style={{ fontSize: "0.68rem", color: "var(--admin-accent)", fontFamily: "var(--admin-font-mono)" }}>
                            Entry: {item.vr_build_entry}
                          </span>
                        )}
                      </div>
                    )}

                    {/* QR Code Visibility Toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                      <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: "var(--admin-font-mono)" }}>
                        <input
                          type="checkbox"
                          checked={item.show_qr !== false}
                          onChange={(e) => handleUpdateProjectVR(item.project_id!, currentVal, e.target.checked)}
                        />
                        Show public QR code
                      </label>
                    </div>
                  </div>

                  <div className="vr-qr-preview-box" style={{ textAlign: "right" }}>
                    {item.has_vr && item.vr_url ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                        <img
                          src={`/api/admin/vr/qr?url=${encodeURIComponent(item.vr_url)}&format=svg`}
                          alt="QR"
                          className="qr-code-svg-small"
                          title="Click to view QR Code"
                          onClick={() => openQrPreview(item.vr_url!, item.target_name)}
                          style={{ cursor: "pointer", width: "40px", height: "40px", backgroundColor: "#fff", padding: "2px", borderRadius: "2px" }}
                        />
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem" }}
                            onClick={() => openQrPreview(item.vr_url!, item.target_name)}
                          >
                            QR
                          </button>
                          <a
                            href={item.vr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem", textDecoration: "none" }}
                          >
                            Test ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.65rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                        Unconfigured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 2: ROOM-SPECIFIC VR                                                 */}
        {/* ========================================================================= */}
        <div className="vr-level-section" style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "2px", padding: "1.25rem" }}>
          <div className="vr-level-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Level 2: Room-Specific VR Experiences
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.2rem" }}>
                Individual room 360° panoramas and room-scale VR tours (e.g. Living Room, Culinary Studio, Master Suite).
              </div>
            </div>
            <span className="admin-status-pill pill-published" style={{ fontSize: "0.68rem" }}>
              {data.level2_rooms.filter((r) => r.has_vr).length} / {data.level2_rooms.length} Active
            </span>
          </div>

          <div>
            {data.level2_rooms.map((item) => {
              const key = `r_${item.space_id}`;
              const currentVal = urlInputs[key] ?? (item.vr_url || "");
              const mode = activeModes[key] || (item.vr_type === "hosted" ? "hosted" : "external");
              const isSaving = savingKey === key;

              return (
                <div
                  key={item.space_id}
                  className="vr-item-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 180px 1fr 140px",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--admin-border)"
                  }}
                >
                  <StudioImage
                    src={item.cover_image}
                    alt=""
                    style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--admin-border)" }}
                    fallbackSrc="/uploads/projects/placeholder.webp"
                    showMissingState={false}
                  />

                  <div style={{ fontFamily: "var(--admin-font-mono)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--admin-text-main)" }}>
                      {item.room_name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>
                      {item.project_name}
                    </div>
                    <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.3rem" }}>
                      <button
                        className={`admin-btn ${mode === "external" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ padding: "0.15rem 0.4rem", fontSize: "0.62rem" }}
                        onClick={() => setActiveModes({ ...activeModes, [key]: "external" })}
                      >
                        Mode A: URL
                      </button>
                      <button
                        className={`admin-btn ${mode === "hosted" ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ padding: "0.15rem 0.4rem", fontSize: "0.62rem" }}
                        onClick={() => setActiveModes({ ...activeModes, [key]: "hosted" })}
                      >
                        Mode B: ZIP
                      </button>
                    </div>
                  </div>

                  <div>
                    {mode === "external" ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="url"
                          className="admin-form-input"
                          style={{ fontSize: "0.75rem", padding: "0.45rem 0.8rem", flex: 1 }}
                          placeholder="https://... (Enter Room VR URL)"
                          value={currentVal}
                          onChange={(e) => setUrlInputs({ ...urlInputs, [key]: e.target.value })}
                        />
                        <button
                          className="admin-btn admin-btn-primary"
                          style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}
                          onClick={() => handleUpdateRoomVR(item.space_id!, currentVal, item.show_qr !== false)}
                          disabled={isSaving}
                        >
                          {isSaving ? "Saving..." : "Save URL"}
                        </button>
                        {item.has_vr && (
                          <button
                            className="admin-btn admin-btn-danger"
                            style={{ fontSize: "0.7rem" }}
                            onClick={() => setConfirmRemoval({ scope: "room", id: item.space_id!, title: item.target_name })}
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", fontSize: "0.7rem", padding: "0.45rem 0.8rem" }}>
                          {uploadingKey === key ? "Extracting ZIP..." : "Upload VR Package (.ZIP)"}
                          <input
                            type="file"
                            accept=".zip"
                            style={{ display: "none" }}
                            disabled={uploadingKey === key}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadBuild(file, "room", item.space_id!, key);
                            }}
                          />
                        </label>
                        {item.vr_build_entry && (
                          <span style={{ fontSize: "0.68rem", color: "var(--admin-accent)", fontFamily: "var(--admin-font-mono)" }}>
                            Entry: {item.vr_build_entry}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                      <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: "var(--admin-font-mono)" }}>
                        <input
                          type="checkbox"
                          checked={item.show_qr !== false}
                          onChange={(e) => handleUpdateRoomVR(item.space_id!, currentVal, e.target.checked)}
                        />
                        Show public QR code
                      </label>
                    </div>
                  </div>

                  <div className="vr-qr-preview-box" style={{ textAlign: "right" }}>
                    {item.has_vr && item.vr_url ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                        <img
                          src={`/api/admin/vr/qr?url=${encodeURIComponent(item.vr_url)}&format=svg`}
                          alt="QR"
                          className="qr-code-svg-small"
                          title="Click to view QR Code"
                          onClick={() => openQrPreview(item.vr_url!, `${item.project_name} — ${item.room_name}`)}
                          style={{ cursor: "pointer", width: "40px", height: "40px", backgroundColor: "#fff", padding: "2px", borderRadius: "2px" }}
                        />
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem" }}
                            onClick={() => openQrPreview(item.vr_url!, `${item.project_name} — ${item.room_name}`)}
                          >
                            QR
                          </button>
                          <a
                            href={item.vr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem", textDecoration: "none" }}
                          >
                            Test ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.65rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                        Unconfigured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 3: INDIVIDUAL 3D RENDER & PHOTO VR                                  */}
        {/* ========================================================================= */}
        <div className="vr-level-section" style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "2px", padding: "1.25rem" }}>
          <div className="vr-level-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Level 3: Individual 3D Render & Photo VR Experiences
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.2rem" }}>
                Attach dedicated 360° panoramas or spatial models to individual photograph viewpoints. All eligible renders are shown below.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {(["ALL", "CONFIGURED", "UNCONFIGURED"] as const).map(tab => (
                <button
                  key={tab}
                  className={`admin-btn ${level3Filter === tab ? "admin-btn-primary" : "admin-btn-secondary"}`}
                  style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem" }}
                  onClick={() => setLevel3Filter(tab)}
                >
                  {tab === "ALL" ? `All (${data.level3_renders.length})` : tab === "CONFIGURED" ? `Configured (${data.level3_renders.filter(r => r.has_vr).length})` : `Unconfigured (${data.level3_renders.filter(r => !r.has_vr).length})`}
                </button>
              ))}
            </div>
          </div>

          <div>
            {filteredLevel3.length === 0 ? (
              <div style={{ padding: "2rem 0", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", fontSize: "0.75rem", textAlign: "center" }}>
                No render perspectives matching filter "{level3Filter}".
              </div>
            ) : (
              filteredLevel3.map((item) => {
                const key = `ren_${item.media_id}_${item.is_project_media ? "pm" : "vm"}`;
                const currentVal = urlInputs[key] ?? (item.vr_url || "");
                const mode = activeModes[key] || (item.vr_type === "hosted" ? "hosted" : "external");
                const isSaving = savingKey === key;

                return (
                  <div
                    key={key}
                    className="vr-item-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 180px 1fr 140px",
                      gap: "1rem",
                      alignItems: "center",
                      padding: "0.85rem 0",
                      borderBottom: "1px solid var(--admin-border)"
                    }}
                  >
                    <StudioImage
                      src={item.cover_image}
                      alt=""
                      style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--admin-border)" }}
                      fallbackSrc="/uploads/projects/placeholder.webp"
                      showMissingState={false}
                    />

                    <div style={{ fontFamily: "var(--admin-font-mono)" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--admin-text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.target_name}>
                        {item.target_name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>
                        {item.is_project_media ? "Project Photograph VR" : "Visualization Render VR"}
                      </div>
                      {item.has_vr ? (
                        <span style={{ fontSize: "0.62rem", color: "var(--admin-accent)", textTransform: "uppercase" }}>
                          ✓ Connected
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.62rem", color: "var(--admin-text-dim)", textTransform: "uppercase" }}>
                          Not configured
                        </span>
                      )}
                    </div>

                    <div>
                      {mode === "external" ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="url"
                            className="admin-form-input"
                            style={{ fontSize: "0.75rem", padding: "0.45rem 0.8rem", flex: 1 }}
                            placeholder="https://... (Enter Render VR URL)"
                            value={currentVal}
                            onChange={(e) => setUrlInputs({ ...urlInputs, [key]: e.target.value })}
                          />
                          <button
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}
                            onClick={() => handleUpdateRenderVR(item.media_id!, currentVal, Boolean(item.show_qr), Boolean(item.is_project_media))}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save URL"}
                          </button>
                          {item.has_vr && (
                            <button
                              className="admin-btn admin-btn-danger"
                              style={{ fontSize: "0.7rem" }}
                              onClick={() => setConfirmRemoval({ scope: "render", id: item.media_id!, title: item.target_name, isProjectMedia: item.is_project_media })}
                              disabled={isSaving}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                          <label className="admin-btn admin-btn-secondary" style={{ cursor: "pointer", fontSize: "0.7rem", padding: "0.45rem 0.8rem" }}>
                            {uploadingKey === key ? "Extracting..." : "Upload VR Build (.ZIP)"}
                            <input
                              type="file"
                              accept=".zip"
                              style={{ display: "none" }}
                              disabled={uploadingKey === key}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadBuild(file, "render", item.media_id!, key);
                              }}
                            />
                          </label>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                        <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: "var(--admin-font-mono)" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.show_qr)}
                            onChange={(e) => handleUpdateRenderVR(item.media_id!, currentVal, e.target.checked, Boolean(item.is_project_media))}
                          />
                          Show QR for this viewpoint
                        </label>
                      </div>
                    </div>

                    <div className="vr-qr-preview-box" style={{ textAlign: "right" }}>
                      {item.has_vr && item.vr_url ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                          <img
                            src={`/api/admin/vr/qr?url=${encodeURIComponent(item.vr_url)}&format=svg`}
                            alt="QR"
                            className="qr-code-svg-small"
                            title="Click to view QR Code"
                            onClick={() => openQrPreview(item.vr_url!, item.target_name)}
                            style={{ cursor: "pointer", width: "40px", height: "40px", backgroundColor: "#fff", padding: "2px", borderRadius: "2px" }}
                          />
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem" }}
                              onClick={() => openQrPreview(item.vr_url!, item.target_name)}
                            >
                              QR
                            </button>
                            <a
                              href={item.vr_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "0.2rem 0.45rem", fontSize: "0.62rem", textDecoration: "none" }}
                            >
                              Test ↗
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.65rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                          Unconfigured
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL WHEN REMOVING AN ACTIVE VR DESTINATION                 */}
      {/* ========================================================================= */}
      <StudioConfirmModal
        isOpen={Boolean(confirmRemoval)}
        onClose={() => setConfirmRemoval(null)}
        onConfirm={handleConfirmRemove}
        title="Remove VR Destination"
        eyebrow="ACTION REQUIRED"
        isDestructive={true}
        isLoading={removeLoading}
        confirmText="Confirm Remove"
        message={
          <div>
            Are you sure you want to remove the VR experience for <strong>"{confirmRemoval?.title}"</strong>?
            <br /><br />
            Public VR buttons and dynamic QR code generation for this scope will be immediately deactivated.
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* QR CODE LIGHTBOX PREVIEW MODAL                                            */}
      {/* ========================================================================= */}
      {previewQrUrl && (
        <StudioModal
          isOpen={true}
          onClose={() => setPreviewQrUrl(null)}
          size="sm"
          eyebrow="VR QR CODE PREVIEW"
          title={previewTitle}
          subtitle="Scan with mobile VR goggles or camera to verify the destination link."
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <a
                href={previewQrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-secondary"
                style={{ fontSize: "0.75rem", textDecoration: "none" }}
              >
                Launch Experience ↗
              </a>
              <a
                href={`/api/admin/vr/qr?url=${encodeURIComponent(previewQrUrl)}&format=png`}
                download={`${previewTitle.replace(/\s+/g, '_')}_QR.png`}
                className="admin-btn admin-btn-primary"
                style={{ fontSize: "0.75rem", textDecoration: "none" }}
              >
                Download PNG
              </a>
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
                src={`/api/admin/vr/qr?url=${encodeURIComponent(previewQrUrl)}&format=svg`}
                alt="QR Code"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>

            <div style={{ marginTop: "1rem", width: "100%", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "0.6rem 0.8rem", borderRadius: "2px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginBottom: "0.2rem" }}>
                CONFIGURED VR LINK:
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-main)", wordBreak: "break-all", fontFamily: "var(--admin-font-mono)" }}>
                {previewQrUrl}
              </div>
            </div>
          </div>
        </StudioModal>
      )}
    </div>
  );
};
