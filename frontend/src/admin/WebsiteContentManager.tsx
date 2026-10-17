import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";

export const WebsiteContentManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"about" | "contact">("about");
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSection(activeSection);
  }, [activeSection]);

  const loadSection = async (section: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminService.getAdminContent(section);
      setContent(res.content || {});
    } catch (err: any) {
      setError(err.message || "Failed to load content section");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await adminService.updateAdminContent(activeSection, JSON.stringify(content));
      setSuccessMsg(`Section '${activeSection.toUpperCase()}' saved successfully! Public pages are updated.`);
    } catch (err: any) {
      setError(err.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setContent({ ...content, [field]: value });
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>
          Website Content Management (CMS)
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
          Directly update studio copy, contact information, team credentials, and project delivery stages.
        </p>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}
      {successMsg && <div className="admin-success-banner">{successMsg}</div>}

      {/* Sub-tab selection */}
      <div className="media-filter-bar">
        <div className="media-tab-group">
          {(["about", "contact"] as const).map((sec) => (
            <button
              key={sec}
              className={`media-tab-btn ${activeSection === sec ? "active" : ""}`}
              onClick={() => setActiveSection(sec)}
            >
              {sec.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
          Loading section data...
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "2rem" }}>
          {/* ABOUT SECTION */}
          {activeSection === "about" && (
            <div>
              <div className="admin-form-group">
                <label className="admin-form-label">Studio Intro Heading</label>
                <input
                  type="text"
                  className="admin-input"
                  value={content.intro_heading || ""}
                  onChange={(e) => handleFieldChange("intro_heading", e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Intro Architectural Narrative</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={content.intro_paragraph || ""}
                  onChange={(e) => handleFieldChange("intro_paragraph", e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Design Philosophy</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={content.philosophy || ""}
                  onChange={(e) => handleFieldChange("philosophy", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Studio Location</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={content.location || ""}
                    onChange={(e) => handleFieldChange("location", e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Contact Email</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={content.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* CONTACT SECTION */}
          {activeSection === "contact" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={content.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Phone Numbers</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={content.phone || ""}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Studio Physical Address</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={content.address || ""}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Working Hours</label>
                <input
                  type="text"
                  className="admin-input"
                  value={content.hours || ""}
                  onChange={(e) => handleFieldChange("hours", e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Project Enquiry Invitation Note</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={content.enquiry_text || ""}
                  onChange={(e) => handleFieldChange("enquiry_text", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Instagram Link</label>
                  <input
                    type="url"
                    className="admin-input"
                    value={content.instagram || ""}
                    onChange={(e) => handleFieldChange("instagram", e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">LinkedIn Link</label>
                  <input
                    type="url"
                    className="admin-input"
                    value={content.linkedin || ""}
                    onChange={(e) => handleFieldChange("linkedin", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Section Content"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
