import React, { useState, useEffect, useRef } from "react";
import { adminService } from "../services/adminService";
import { AdminProject, UploadReviewItem } from "../types/admin";
import { StudioImage } from "../components/StudioImage";

interface BulkAddContentProps {
  onSuccess: () => void;
  preselectedProjectId?: number;
}

export const BulkAddContent: React.FC<BulkAddContentProps> = ({ onSuccess, preselectedProjectId }) => {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(preselectedProjectId);
  const [uploading, setUploading] = useState(false);
  const [reviewItems, setReviewItems] = useState<UploadReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminService.getProjects().then(setProjects).catch(() => {});
  }, []);

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    const fileArray: File[] = Array.from(files);
    const relativePaths: string[] = fileArray.map((f: any) => f.webkitRelativePath || f.name);

    try {
      const res = await adminService.uploadBulk(fileArray, selectedProjectId, relativePaths);
      setReviewItems(res.items);
      setSuccessMsg(`Uploaded ${res.total_uploaded} files. Please review and assign spaces below before publishing.`);
    } catch (err: any) {
      setError(err.message || "Bulk upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleItemChange = (id: number, field: keyof UploadReviewItem, value: any) => {
    setReviewItems(reviewItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleCommit = async (publishNow: boolean) => {
    setUploading(true);
    setError(null);
    try {
      await adminService.commitUploadReview(reviewItems, publishNow);
      setSuccessMsg(publishNow ? "Content published successfully to live project archive!" : "Saved draft successfully in media library.");
      setReviewItems([]);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to commit upload.");
    } finally {
      setUploading(false);
    }
  };

  // Group summary
  const summaryCounts = reviewItems.reduce((acc, item) => {
    const t = item.detected_type || "other";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>
          + Add Content (Bulk & Folder Upload)
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
          Upload multiple content types (Photos, Videos, 3D Renders, Drawings, Documents) in one unified operation.
        </p>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}
      {successMsg && <div className="admin-success-banner">{successMsg}</div>}

      {/* Project Selector */}
      <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "1.5rem", marginBottom: "2rem" }}>
        <label className="admin-form-label">Target Project Archive (Optional)</label>
        <select
          className="admin-select"
          value={selectedProjectId || ""}
          onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : undefined)}
          disabled={uploading}
        >
          <option value="">— Unassigned (Store in Unassigned Media Bucket) —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.year} · {p.category})
            </option>
          ))}
        </select>
        <div style={{ fontSize: "0.68rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", marginTop: "0.4rem" }}>
          Unassigned files are preserved in the Media Library and can be linked to projects or rooms at any time.
        </div>
      </div>

      {/* Upload Zone if no review items */}
      {reviewItems.length === 0 ? (
        <div
          className={`bulk-upload-dropzone ${dragActive ? "drag-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files) handleFilesChosen(e.dataTransfer.files);
          }}
        >
          <div className="dropzone-title">
            {uploading ? "Processing & Auto-Classifying Files..." : "Drag & Drop Files or Complete Folder"}
          </div>
          <div className="dropzone-subtitle">
            Accepts JPEGs, WebP, PNGs, MP4 videos, 3D render archives, and PDF/CAD documents
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Multiple Files
            </button>

            <input
              type="file"
              ref={folderInputRef}
              {...({ webkitdirectory: "" } as any)}
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              title="Select folder with subdirectories (e.g. Project AA/Photos, 3D, Blueprints)"
            >
              Upload Project Folder
            </button>
          </div>
        </div>
      ) : (
        /* Review Stage */
        <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "1.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>
                Upload Review Screen
              </h3>
              <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                Detected Content: Photos ({summaryCounts["image"] || 0}) · Videos ({summaryCounts["video"] || 0}) · 3D Renders ({summaryCounts["3d"] || 0}) · Blueprints ({summaryCounts["blueprint"] || 0})
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.8rem" }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => handleCommit(false)}
                disabled={uploading}
              >
                Save Draft
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => handleCommit(true)}
                disabled={uploading}
              >
                Publish Now
              </button>
            </div>
          </div>

          <table className="review-items-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Preview</th>
                <th>Filename</th>
                <th>Content Type</th>
                <th>Assigned Project</th>
                <th>Room (3D / Photos)</th>
                <th>Document / CAD Type</th>
                <th>Caption</th>
              </tr>
            </thead>
            <tbody>
              {reviewItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <StudioImage
                      src={item.url}
                      thumbnailSrc={item.thumbnail_url}
                      alt={item.filename}
                      className="review-thumb"
                      showMissingState={false}
                    />
                  </td>
                  <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.filename}
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      style={{ padding: "0.4rem", fontSize: "0.72rem" }}
                      value={item.detected_type}
                      onChange={(e) => handleItemChange(item.id, "detected_type", e.target.value)}
                    >
                      <option value="image">Photo / Image</option>
                      <option value="3d">3D Render</option>
                      <option value="video">Video</option>
                      <option value="document">Document / CAD</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      style={{ padding: "0.4rem", fontSize: "0.72rem" }}
                      value={item.project_id || ""}
                      onChange={(e) => handleItemChange(item.id, "project_id", e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">Unassigned</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ padding: "0.4rem", fontSize: "0.72rem" }}
                      value={item.room_name || ""}
                      placeholder="e.g. Living Room"
                      onChange={(e) => handleItemChange(item.id, "room_name", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      style={{ padding: "0.4rem", fontSize: "0.72rem" }}
                      value={item.drawing_type || "Floor Plan"}
                      onChange={(e) => handleItemChange(item.id, "drawing_type", e.target.value)}
                      disabled={item.detected_type !== "blueprint"}
                    >
                      <option value="Floor Plan">Floor Plan</option>
                      <option value="Furniture Plan">Furniture Plan</option>
                      <option value="Electrical Plan">Electrical Plan</option>
                      <option value="Ceiling Plan">Ceiling Plan</option>
                      <option value="Elevation">Elevation</option>
                      <option value="Section">Section</option>
                      <option value="Detail Drawing">Detail Drawing</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ padding: "0.4rem", fontSize: "0.72rem" }}
                      value={item.caption || ""}
                      onChange={(e) => handleItemChange(item.id, "caption", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
