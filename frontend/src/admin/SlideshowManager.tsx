import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { AdminProject } from "../types/admin";
import { SlideshowItem } from "../components/OwnerSlideshow";
import { StudioImage } from "../components/StudioImage";

export const SlideshowManager: React.FC = () => {
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customCategory, setCustomCategory] = useState("Residential");

  // Live Preview Modal
  const [previewIdx, setPreviewIdx] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resSlides, pList] = await Promise.all([
        adminService.getAdminContent("slideshow"),
        adminService.getProjects()
      ]);

      setProjects(pList);

      if (resSlides?.content?.slides && Array.isArray(resSlides.content.slides) && resSlides.content.slides.length > 0) {
        setSlides(resSlides.content.slides.slice(0, 10));
      } else {
        // Build initial 5-10 slides from existing projects
        const initial = pList.filter((p) => p.cover_image).slice(0, 8).map((p) => ({
          id: `p-${p.id}`,
          image_url: p.cover_image || "/uploads/projects/placeholder.webp",
          title: p.title,
          subtitle: p.location ? `${p.category} · ${p.location}` : p.category,
          category: p.category,
          location: p.location,
          project_slug: p.slug
        }));
        setSlides(initial);
      }
    } catch (err: any) {
      console.warn("Could not load slideshow CMS data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSlides = async (updatedSlides: SlideshowItem[]) => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminService.updateAdminContent(
        "slideshow",
        JSON.stringify({
          auto_play: true,
          interval_seconds: 5,
          slides: updatedSlides.slice(0, 10)
        })
      );
      setSlides(updatedSlides.slice(0, 10));
      setSuccessMsg("Featured Owner Slideshow saved successfully! The public website reflects these 10 photos immediately.");
    } catch (err: any) {
      setError(err.message || "Failed to save slideshow");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFromProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (slides.length >= 10) {
      alert("Maximum 10 featured photos allowed in the cinematic slideshow.");
      return;
    }

    if (selectedProjectId) {
      const p = projects.find((proj) => proj.id === Number(selectedProjectId));
      if (p) {
        const newSlide: SlideshowItem = {
          id: `slide-${Date.now()}`,
          image_url: customImageUrl.trim() || p.cover_image || "/uploads/projects/placeholder.webp",
          title: customTitle.trim() || p.title,
          subtitle: customSubtitle.trim() || (p.location ? `${p.category} · ${p.location}` : p.category),
          category: customCategory || p.category,
          location: p.location,
          project_slug: p.slug
        };
        handleSaveSlides([...slides, newSlide]);
      }
    } else {
      if (!customImageUrl.trim() || !customTitle.trim()) {
        alert("Please provide both an Image URL and Title.");
        return;
      }
      const newSlide: SlideshowItem = {
        id: `slide-${Date.now()}`,
        image_url: customImageUrl.trim(),
        title: customTitle.trim(),
        subtitle: customSubtitle.trim(),
        category: customCategory
      };
      handleSaveSlides([...slides, newSlide]);
    }

    setShowAddModal(false);
    setSelectedProjectId("");
    setCustomTitle("");
    setCustomSubtitle("");
    setCustomImageUrl("");
  };

  const handleRemoveSlide = (index: number) => {
    const updated = slides.filter((_, i) => i !== index);
    handleSaveSlides(updated);
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const copy = [...slides];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    handleSaveSlides(copy);
  };

  return (
    <div className="sd-admin-section sd-fade-in">
      <div className="sd-admin-header-row">
        <div>
          <span className="sd-admin-eyebrow">WEBSITE HERO EXPERIENCE</span>
          <h1 className="sd-admin-title">Featured Slideshow Manager</h1>
          <p className="sd-admin-subtitle">
            Curate up to 10 full-width cinematic architectural photos displayed on the main projects landing page. Auto-rotates every 5 seconds.
          </p>
        </div>

        <div className="sd-admin-header-actions">
          {slides.length > 0 && (
            <button
              type="button"
              className="sd-admin-btn-secondary"
              onClick={() => {
                setPreviewIdx(0);
                setShowPreviewModal(true);
              }}
            >
              👁 Preview Slideshow
            </button>
          )}

          <button
            type="button"
            className="sd-admin-btn-primary"
            onClick={() => {
              setSelectedProjectId("");
              setCustomTitle("");
              setCustomSubtitle("");
              setCustomImageUrl("");
              setShowAddModal(true);
            }}
            disabled={slides.length >= 10}
          >
            + Add Slide ({slides.length}/10)
          </button>
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}
      {successMsg && <div className="admin-success-banner">{successMsg}</div>}

      {loading ? (
        <div className="sd-admin-loading">Loading slideshow curated list...</div>
      ) : slides.length === 0 ? (
        <div className="sd-empty-state">
          <p>No featured photos configured yet.</p>
          <button
            type="button"
            className="sd-admin-btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ marginTop: "1rem" }}
          >
            + Add First Slide
          </button>
        </div>
      ) : (
        <div className="sd-table-wrap">
          <table className="sd-admin-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>Order</th>
                <th style={{ width: "120px" }}>Preview</th>
                <th>Title & Subtitle</th>
                <th>Category</th>
                <th>Project Dossier Link</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, idx) => (
                <tr key={slide.id || idx}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}
                        onClick={() => handleMoveSlide(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", cursor: idx === slides.length - 1 ? "default" : "pointer", opacity: idx === slides.length - 1 ? 0.3 : 1 }}
                        onClick={() => handleMoveSlide(idx, "down")}
                        disabled={idx === slides.length - 1}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <strong style={{ marginLeft: "0.25rem", fontSize: "0.85rem" }}>#{idx + 1}</strong>
                    </div>
                  </td>

                  <td>
                    <StudioImage
                      src={slide.image_url}
                      alt={slide.title}
                      style={{
                        width: "100px",
                        height: "56px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid var(--admin-border)"
                      }}
                      fallbackSrc="/uploads/projects/placeholder.webp"
                    />
                  </td>

                  <td>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--admin-text-main)" }}>
                      {slide.title}
                    </div>
                    {slide.subtitle && (
                      <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "0.15rem" }}>
                        {slide.subtitle}
                      </div>
                    )}
                  </td>

                  <td>
                    <span className="sd-type-pill">{slide.category || "General"}</span>
                  </td>

                  <td>
                    {slide.project_slug ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--admin-teal)", fontWeight: 600 }}>
                        🔗 #{slide.project_slug}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--admin-text-dim)" }}>Direct Display Only</span>
                    )}
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div className="sd-action-cell" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="sd-delete-btn"
                        onClick={() => handleRemoveSlide(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Slide Modal */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "580px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Add Featured Photo to Slideshow</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFromProject}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Pick from Existing Studio Project</label>
                  <select
                    className="admin-select"
                    value={selectedProjectId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setSelectedProjectId(pId);
                      if (pId) {
                        const found = projects.find((p) => p.id === Number(pId));
                        if (found) {
                          setCustomTitle(found.title);
                          setCustomSubtitle(found.location ? `${found.category} · ${found.location}` : found.category);
                          setCustomImageUrl(found.cover_image || "");
                          setCustomCategory(found.category);
                        }
                      }
                    }}
                  >
                    <option value="">-- Custom Slide / Freeform Image --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.category} {p.year ? `· ${p.year}` : ""})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Slide Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Minimalist Travertine Residence"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Subtitle / Location Tag</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="e.g. Residential · Ahmedabad, Gujarat"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Category</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Residential, Villa, Commercial"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Image URL *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="/uploads/projects/... or https://..."
                    required
                  />
                </div>

                {customImageUrl && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <label className="admin-form-label">Image Preview</label>
                    <StudioImage
                      src={customImageUrl}
                      alt="Slide Preview"
                      style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--admin-border)" }}
                      fallbackSrc="/uploads/projects/placeholder.webp"
                      showMissingState={false}
                    />
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="sd-admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sd-admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add to Slideshow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {showPreviewModal && slides.length > 0 && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "880px", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", padding: "0 0.5rem" }}>
              <strong style={{ fontSize: "0.95rem" }}>Cinematic Slideshow Live Preview ({previewIdx + 1}/{slides.length})</strong>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ position: "relative", width: "100%", height: "460px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#000" }}>
              <StudioImage
                src={slides[previewIdx].image_url}
                alt={slides[previewIdx].title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                fallbackSrc="/uploads/projects/placeholder.webp"
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "2rem"
                }}
              >
                <span style={{ color: "#d4af37", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {slides[previewIdx].category}
                </span>
                <h2 style={{ color: "#fff", fontSize: "1.8rem", margin: "0.3rem 0" }}>{slides[previewIdx].title}</h2>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>{slides[previewIdx].subtitle}</p>
              </div>

              {/* Navigation Arrows */}
              <button
                type="button"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer"
                }}
                onClick={() => setPreviewIdx((prev) => (prev - 1 + slides.length) % slides.length)}
              >
                ‹
              </button>
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  cursor: "pointer"
                }}
                onClick={() => setPreviewIdx((prev) => (prev + 1) % slides.length)}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
