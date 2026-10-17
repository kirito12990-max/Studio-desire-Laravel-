import React, { useState, useEffect } from "react";
import { blueprintService, BlueprintDrawingItem } from "../services/blueprintService";
import { StudioImage } from "../components/StudioImage";

export const BlueprintsManager: React.FC = () => {
  const [drawings, setDrawings] = useState<BlueprintDrawingItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedDrawing, setSelectedDrawing] = useState<BlueprintDrawingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const bList = await blueprintService.getDrawings(undefined, selectedType !== "ALL" ? selectedType : undefined);
      setDrawings(bList);
    } catch (err: any) {
      setError(err.message || "Failed to load architectural blueprints");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Architectural Working Drawings & Blueprints
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: "0.3rem 0 0" }}>
            Technical CAD drawing archive categorized by Floor Plan, Furniture Layout, Electrical, Plumbing, Ceiling, and Detail Drawings with version control
          </p>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[
          "ALL",
          "Floor Plan",
          "Furniture Plan",
          "Electrical Plan",
          "Ceiling Plan",
          "Wardrobe Detail",
          "Joinery Detail",
          "Construction Detail"
        ].map(type => (
          <button
            key={type}
            className={`admin-btn ${selectedType === type ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ fontSize: "0.72rem", padding: "0.4rem 0.8rem" }}
            onClick={() => setSelectedType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Blueprints Grid */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "2rem 0" }}>
          Loading blueprint drawings...
        </div>
      ) : drawings.length === 0 ? (
        <div style={{ padding: "3rem", backgroundColor: "var(--admin-surface)", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
          No working drawings found for "{selectedType}".
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {drawings.map(d => (
            <div
              key={d.id}
              className="admin-project-card"
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedDrawing(d)}
            >
              <div className="project-card-cover-wrapper" style={{ height: "180px", backgroundColor: "#0e131b" }}>
                <StudioImage
                  src={d.file_url}
                  thumbnailSrc={d.thumbnail_url}
                  alt={d.title}
                  className="project-card-cover"
                  style={{ objectFit: "contain", padding: "0.5rem" }}
                  loading="lazy"
                  showMissingState={true}
                />
                <span className="project-card-badge badge-published">
                  {d.drawing_type}
                </span>
                <span
                  className="badge-demo"
                  style={{ position: "absolute", bottom: "10px", right: "10px", backgroundColor: "var(--admin-accent)", color: "#111" }}
                >
                  {d.revision || "v1"} CURRENT
                </span>
              </div>

              <div className="project-card-body">
                <div className="project-card-header">
                  <span className="project-card-title">{d.title}</span>
                  <span className="project-card-meta">{d.drawing_number || d.project_name}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem", fontSize: "0.68rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                  <span>Scale: {d.scale || "1:50"}</span>
                  <span>Sheet: {d.sheet_size || "A1"}</span>
                  <span>{d.date || "2026"}</span>
                </div>

                <div style={{ marginTop: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>
                    {d.room_area || d.project_name}
                  </span>
                  <button
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.65rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(d.file_url, "_blank");
                    }}
                  >
                    High-Res ↗
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blueprint Lightbox / Inspector Modal */}
      {selectedDrawing && (
        <div className="admin-modal-overlay" onClick={() => setSelectedDrawing(null)}>
          <div
            className="admin-modal-dialog"
            style={{ maxWidth: "900px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--admin-text-main)" }}>
                  {selectedDrawing.title}
                </h3>
                <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.2rem" }}>
                  {selectedDrawing.drawing_number} · {selectedDrawing.drawing_type} · Rev: {selectedDrawing.revision || "v1"} · Scale: {selectedDrawing.scale}
                </div>
              </div>
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedDrawing(null)}>
                ✕ Close
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", backgroundColor: "#0b0e14", padding: "1rem", borderRadius: "4px", textAlign: "center" }}>
              <StudioImage
                src={selectedDrawing.file_url}
                thumbnailSrc={selectedDrawing.thumbnail_url}
                alt={selectedDrawing.title}
                style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
                showMissingState={true}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--admin-border)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                {selectedDrawing.description || "Architectural construction specification sheet."}
              </span>
              <a
                href={selectedDrawing.file_url}
                target="_blank"
                rel="noreferrer"
                className="admin-btn admin-btn-primary"
                style={{ fontSize: "0.72rem", textDecoration: "none" }}
              >
                Open Original Vector Drawing ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
