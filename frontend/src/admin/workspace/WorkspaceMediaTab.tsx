import React from "react";
import { ProjectWorkspaceData, UnifiedMediaItem } from "../../types/admin";
import { StudioImage } from "../../components/StudioImage";

interface WorkspaceMediaTabProps {
  workspace: ProjectWorkspaceData;
  mediaItems: UnifiedMediaItem[];
  isUploadingMedia: boolean;
  uploadingMediaVR: number | null;
  editingMedia: UnifiedMediaItem | null;
  setEditingMedia: (item: UnifiedMediaItem | null) => void;
  mediaPreviewQr: { url: string; title: string } | null;
  setMediaPreviewQr: (qr: { url: string; title: string } | null) => void;
  onOpenPublicSite?: (slug: string) => void;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSetCoverPhoto: (m: UnifiedMediaItem) => void;
  handleReorderMedia: (m: UnifiedMediaItem, direction: -1 | 1) => void;
  handleToggleMediaQr: (m: UnifiedMediaItem, checked: boolean) => void;
  handleSaveMediaEdits: (e: React.FormEvent) => void;
  handleUploadItemVRBuild: (file: File, mediaId: number) => void;
}

export const WorkspaceMediaTab: React.FC<WorkspaceMediaTabProps> = ({
  workspace,
  mediaItems,
  isUploadingMedia,
  uploadingMediaVR,
  editingMedia,
  setEditingMedia,
  mediaPreviewQr,
  setMediaPreviewQr,
  onOpenPublicSite,
  handleMediaUpload,
  handleSetCoverPhoto,
  handleReorderMedia,
  handleToggleMediaQr,
  handleSaveMediaEdits,
  handleUploadItemVRBuild,
}) => {
  return (
    <div>
      {/* Header & Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              margin: "0 0 0.3rem",
            }}
          >
            Photographs & Media Workspace
          </h2>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--admin-text-muted)",
              fontFamily: "var(--admin-font-mono)",
              margin: 0,
            }}
          >
            Select main cover photograph, arrange supporting images, edit
            captions, and configure optional photograph VR/QR destinations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          {onOpenPublicSite && (
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => onOpenPublicSite(workspace.project.slug)}
              title="Open live public project detail dossier"
            >
              Preview Public Gallery ↗
            </button>
          )}
          <label
            className="admin-btn admin-btn-primary"
            style={{ cursor: "pointer" }}
          >
            {isUploadingMedia ? "Uploading..." : "+ Upload Photographs"}
            <input
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              disabled={isUploadingMedia}
              onChange={handleMediaUpload}
            />
          </label>
        </div>
      </div>

      {/* Central Project VR Status Card */}
      {workspace.project.vr_url && (
        <div
          className="admin-surface-card"
          style={{
            padding: "1rem 1.4rem",
            marginBottom: "1.5rem",
            borderLeft: "3px solid var(--admin-accent)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "var(--admin-accent)",
                  fontFamily: "var(--admin-font-mono)",
                  fontWeight: 600,
                }}
              >
                ★ LEVEL 01 · PROJECT CENTRAL VR ACTIVE
              </span>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--admin-text-main)",
                  marginTop: "0.2rem",
                  wordBreak: "break-all",
                }}
              >
                {workspace.project.vr_url}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="admin-btn admin-btn-secondary"
                style={{ fontSize: "0.68rem", padding: "0.3rem 0.6rem" }}
                onClick={() =>
                  setMediaPreviewQr({
                    url: workspace.project.vr_url!,
                    title: `${workspace.project.title} Central VR`,
                  })
                }
              >
                View QR
              </button>
              <a
                href={workspace.project.vr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-secondary"
                style={{
                  fontSize: "0.68rem",
                  padding: "0.3rem 0.6rem",
                  textDecoration: "none",
                }}
              >
                Open ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Media Items List/Grid */}
      {mediaItems.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--admin-text-muted)",
            fontFamily: "var(--admin-font-mono)",
            fontSize: "0.8rem",
            border: "1px dashed var(--admin-border)",
            borderRadius: "2px",
          }}
        >
          No photographs attached to this project yet. Click "+ Upload
          Photographs" to add images.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.2rem",
          }}
        >
          {mediaItems.map((m, idx) => {
            const isCover =
              (m.url || "").trim().toLowerCase() ===
              (workspace.project.cover_image || "").trim().toLowerCase();

            return (
              <div
                key={m.id}
                className="admin-surface-card"
                style={{
                  overflow: "hidden",
                  border: isCover
                    ? "1px solid var(--admin-accent)"
                    : "1px solid var(--admin-border)",
                  boxShadow: isCover
                    ? "0 4px 16px rgba(200, 162, 101, 0.12)"
                    : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Media Thumbnail & Badges */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "160px",
                    backgroundColor: "#111",
                  }}
                >
                  <StudioImage
                    src={m.url}
                    thumbnailSrc={m.thumbnail_url}
                    alt={m.caption || "Project photo"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    showMissingState={true}
                  />
                  {/* Cover Badge */}
                  {isCover ? (
                    <span
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        background: "var(--admin-accent)",
                        color: "#121211",
                        fontFamily: "var(--admin-font-mono)",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "2px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ★ MAIN COVER
                    </span>
                  ) : (
                    <span
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        background: "rgba(18, 18, 17, 0.8)",
                        color: "#fff",
                        fontFamily: "var(--admin-font-mono)",
                        fontSize: "0.6rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "2px",
                      }}
                    >
                      SUPPORTING {String(idx + 1).padStart(2, "0")}
                    </span>
                  )}

                  {/* VR / QR Status Badges */}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "4px",
                    }}
                  >
                    {m.vr_url && (
                      <span
                        style={{
                          background: "rgba(0, 0, 0, 0.8)",
                          color: "var(--admin-accent)",
                          fontFamily: "var(--admin-font-mono)",
                          fontSize: "0.58rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.4rem",
                          borderRadius: "2px",
                          border: "1px solid var(--admin-accent)",
                        }}
                      >
                        VR
                      </span>
                    )}
                    {m.show_qr && (
                      <span
                        style={{
                          background: "rgba(22, 101, 52, 0.9)",
                          color: "#86efac",
                          fontFamily: "var(--admin-font-mono)",
                          fontSize: "0.58rem",
                          fontWeight: 600,
                          padding: "0.2rem 0.4rem",
                          borderRadius: "2px",
                        }}
                      >
                        QR
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata & Actions Box */}
                <div
                  style={{
                    padding: "0.9rem",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "var(--admin-text-main)",
                        marginBottom: "0.3rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {m.caption || `${workspace.project.title} Perspective`}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--admin-text-muted)",
                        fontFamily: "var(--admin-font-mono)",
                        marginBottom: "0.8rem",
                      }}
                    >
                      Order: {m.sort_order || idx + 1}{" "}
                      {m.room_name ? `· Room: ${m.room_name}` : ""}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingTop: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {!isCover && (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{
                            fontSize: "0.62rem",
                            padding: "0.25rem 0.5rem",
                          }}
                          onClick={() => handleSetCoverPhoto(m)}
                          title="Set this photograph as the project hero cover image"
                        >
                          ★ Set as Cover
                        </button>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.3rem",
                          marginLeft: "auto",
                        }}
                      >
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{
                            padding: "0.25rem 0.45rem",
                            fontSize: "0.62rem",
                          }}
                          onClick={() => handleReorderMedia(m, -1)}
                          disabled={idx === 0}
                          title="Move photo earlier in order"
                        >
                          ▲
                        </button>
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{
                            padding: "0.25rem 0.45rem",
                            fontSize: "0.62rem",
                          }}
                          onClick={() => handleReorderMedia(m, 1)}
                          disabled={idx === mediaItems.length - 1}
                          title="Move photo later in order"
                        >
                          ▼
                        </button>
                        <button
                          className="admin-btn admin-btn-primary"
                          style={{
                            fontSize: "0.62rem",
                            padding: "0.25rem 0.6rem",
                          }}
                          onClick={() => setEditingMedia({ ...m })}
                        >
                          Edit & VR
                        </button>
                      </div>
                    </div>

                    {/* Quick VR / QR Action Row */}
                    {m.vr_url && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(0, 0, 0, 0.2)",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "2px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "0.62rem",
                            color: "var(--admin-text-muted)",
                            fontFamily: "var(--admin-font-mono)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(m.show_qr)}
                            onChange={(e) =>
                              handleToggleMediaQr(m, e.target.checked)
                            }
                          />
                          Show QR
                        </label>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            className="admin-btn admin-btn-secondary"
                            style={{
                              fontSize: "0.58rem",
                              padding: "0.2rem 0.4rem",
                            }}
                            onClick={() =>
                              setMediaPreviewQr({
                                url: m.vr_url!,
                                title: m.caption || `Photo #${m.id}`,
                              })
                            }
                          >
                            QR
                          </button>
                          <a
                            href={m.vr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-secondary"
                            style={{
                              fontSize: "0.58rem",
                              padding: "0.2rem 0.4rem",
                              textDecoration: "none",
                            }}
                          >
                            Launch ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Media Metadata & Dedicated VR Destination Modal */}
      {editingMedia && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setEditingMedia(null)}
        >
          <div
            className="admin-modal-window"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="admin-modal-title">
                Edit Photo & VR Configuration
              </div>
              <button
                className="admin-modal-close"
                onClick={() => setEditingMedia(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveMediaEdits} className="admin-modal-body">
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <StudioImage
                  src={editingMedia.url}
                  thumbnailSrc={editingMedia.thumbnail_url}
                  alt=""
                  style={{
                    maxHeight: "140px",
                    borderRadius: "2px",
                    objectFit: "cover",
                  }}
                />
              </div>

              <div className="admin-form-group">
                <label>Photograph Caption</label>
                <input
                  type="text"
                  value={editingMedia.caption || ""}
                  onChange={(e) =>
                    setEditingMedia({
                      ...editingMedia,
                      caption: e.target.value,
                    })
                  }
                  placeholder="e.g. Master Suite Evening Perspective"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div className="admin-form-group">
                  <label>Room / Volume Name</label>
                  <input
                    type="text"
                    value={editingMedia.room_name || ""}
                    onChange={(e) =>
                      setEditingMedia({
                        ...editingMedia,
                        room_name: e.target.value,
                      })
                    }
                    placeholder="e.g. Kitchen, Living Room"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Sort Order Index</label>
                  <input
                    type="number"
                    value={editingMedia.sort_order || 0}
                    onChange={(e) =>
                      setEditingMedia({
                        ...editingMedia,
                        sort_order: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Alternative Text (Accessibility)</label>
                <input
                  type="text"
                  value={editingMedia.alt_text || ""}
                  onChange={(e) =>
                    setEditingMedia({
                      ...editingMedia,
                      alt_text: e.target.value,
                    })
                  }
                  placeholder="Descriptive text for accessibility"
                />
              </div>

              {/* VR Destination Settings */}
              <div
                style={{
                  borderTop: "1px solid var(--admin-border)",
                  paddingTop: "1rem",
                  marginTop: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--admin-text-main)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Dedicated 360° VR Destination
                </div>

                <div className="admin-form-group">
                  <label>Mode A: External VR URL</label>
                  <input
                    type="url"
                    value={editingMedia.vr_url || ""}
                    onChange={(e) =>
                      setEditingMedia({
                        ...editingMedia,
                        vr_url: e.target.value,
                      })
                    }
                    placeholder="https://... (Enter external WebXR or panorama link)"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mode B: Upload VR Package (.ZIP)</label>
                  <label
                    className="admin-btn admin-btn-secondary"
                    style={{
                      cursor: "pointer",
                      display: "inline-block",
                      fontSize: "0.68rem",
                    }}
                  >
                    {uploadingMediaVR === editingMedia.id
                      ? "Extracting VR..."
                      : "Upload ZIP Build Package"}
                    <input
                      type="file"
                      accept=".zip"
                      style={{ display: "none" }}
                      disabled={uploadingMediaVR === editingMedia.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadItemVRBuild(f, editingMedia.id);
                      }}
                    />
                  </label>
                </div>

                <div style={{ marginTop: "0.8rem" }}>
                  <label
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--admin-text-main)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontFamily: "var(--admin-font-mono)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(editingMedia.show_qr)}
                      onChange={(e) =>
                        setEditingMedia({
                          ...editingMedia,
                          show_qr: e.target.checked,
                        })
                      }
                    />
                    Display public scannable QR code for this photograph
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.8rem",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setEditingMedia(null)}
                >
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

      {/* Scannable QR Code Modal */}
      {mediaPreviewQr && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setMediaPreviewQr(null)}
        >
          <div
            className="admin-modal-window"
            style={{ maxWidth: "380px", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div className="admin-modal-title">
                QR Code: {mediaPreviewQr.title}
              </div>
              <button
                className="admin-modal-close"
                onClick={() => setMediaPreviewQr(null)}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "1.2rem",
                  display: "inline-block",
                  border: "1px solid var(--admin-border)",
                  marginBottom: "1rem",
                }}
              >
                <img
                  src={`/api/admin/vr/qr?url=${encodeURIComponent(
                    mediaPreviewQr.url
                  )}&format=svg`}
                  alt="Scannable QR"
                  style={{ width: "180px", height: "180px", display: "block" }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--admin-text-muted)",
                  fontFamily: "var(--admin-font-mono)",
                  wordBreak: "break-all",
                  marginBottom: "1.2rem",
                }}
              >
                {mediaPreviewQr.url}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.8rem",
                }}
              >
                <a
                  href={mediaPreviewQr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn-secondary"
                  style={{ textDecoration: "none" }}
                >
                  Open Destination ↗
                </a>
                <a
                  href={`/api/admin/vr/qr?url=${encodeURIComponent(
                    mediaPreviewQr.url
                  )}&format=png`}
                  download={`${mediaPreviewQr.title.replace(/\s+/g, "_")}_QR.png`}
                  className="admin-btn admin-btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  Download PNG
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
