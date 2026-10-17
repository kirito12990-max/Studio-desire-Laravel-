import React, { useState, useEffect } from "react";
import { BlueprintDrawing, BlueprintProjectSummary } from "../types/blueprint";
import { BlueprintService } from "../services/blueprintService";
import { BlueprintProjectNav } from "../components/BlueprintProjectNav";
import { BlueprintTypeFilter } from "../components/BlueprintTypeFilter";
import { BlueprintDrawingCard } from "../components/BlueprintDrawingCard";
import { BlueprintViewerModal } from "../components/BlueprintViewerModal";

interface BlueprintPageProps {
  onNavigateContact?: () => void;
}

export const BlueprintPage: React.FC<BlueprintPageProps> = ({ onNavigateContact }) => {
  const [projects, setProjects] = useState<BlueprintProjectSummary[]>([]);
  const [activeProjectSlug, setActiveProjectSlug] = useState<string>("");
  const [drawingTypes, setDrawingTypes] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string>("ALL");
  const [drawings, setDrawings] = useState<BlueprintDrawing[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active drawing in modal viewer
  const [activeViewerDrawing, setActiveViewerDrawing] = useState<BlueprintDrawing | null>(null);

  // Initial load: fetch projects and initial blueprint set
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await BlueprintService.getBlueprints();
        if (!isMounted) return;

        setProjects(data.projects);
        const defaultSlug = data.project?.project_slug || (data.projects[0]?.project_slug ?? "");
        setActiveProjectSlug(defaultSlug);
        setDrawingTypes(data.drawing_types);
        setDrawings(data.items);
        setTotalCount(data.total);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load architectural blueprints");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // When activeProjectSlug or activeType changes, fetch filtered drawings
  const handleSelectProject = async (slug: string) => {
    setActiveProjectSlug(slug);
    setActiveType("ALL");
    try {
      setIsLoading(true);
      const data = await BlueprintService.getBlueprints({
        project: slug,
        drawing_type: "ALL",
      });
      setDrawings(data.items);
      setTotalCount(data.total);
      setDrawingTypes(data.drawing_types);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project drawings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectType = async (type: string) => {
    setActiveType(type);
    try {
      setIsLoading(true);
      const data = await BlueprintService.getBlueprints({
        project: activeProjectSlug,
        drawing_type: type,
      });
      setDrawings(data.items);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to filter drawings");
    } finally {
      setIsLoading(false);
    }
  };

  const activeProject = projects.find((p) => p.project_slug === activeProjectSlug);

  return (
    <div className="blueprint-page-container">
      {/* Page Editorial Header */}
      <header className="blueprint-editorial-header">
        <div className="blueprint-header-top">
          <span className="blueprint-sec-number">03</span>
          <span className="blueprint-sec-tag">TECHNICAL ARCHIVE</span>
        </div>

        <h1 className="blueprint-main-heading">BLUEPRINT</h1>

        <p className="blueprint-intro-description">
          Architectural documentation, spatial layouts, and bespoke joinery details. 
          Each drawing represents Studio Desire&apos;s technical rigor, coordinating construction 
          precision, structural datums, and material interfaces.
        </p>
      </header>

      {/* Main Two-Column Archive Layout */}
      <div className="blueprint-archive-layout">
        {/* Left Column: Project Selector Index */}
        <aside className="blueprint-sidebar-column">
          <BlueprintProjectNav
            projects={projects}
            activeProjectSlug={activeProjectSlug}
            onSelectProject={handleSelectProject}
          />
        </aside>

        {/* Right Column: Drawings Repository */}
        <main className="blueprint-main-column">
          {/* Active Project Dossier Bar */}
          {activeProject && (
            <div className="blueprint-project-banner">
              <div className="blueprint-banner-left">
                <span className="blueprint-banner-eyebrow">SELECTED PROJECT</span>
                <h2 className="blueprint-banner-title">{activeProject.project_name}</h2>
              </div>

              <div className="blueprint-banner-meta">
                {activeProject.location && (
                  <div className="blueprint-banner-item">
                    <span className="blueprint-meta-k">LOCATION</span>
                    <span className="blueprint-meta-v">{activeProject.location}</span>
                  </div>
                )}
                {activeProject.year && (
                  <div className="blueprint-banner-item">
                    <span className="blueprint-meta-k">YEAR</span>
                    <span className="blueprint-meta-v">{activeProject.year}</span>
                  </div>
                )}
                <div className="blueprint-banner-item">
                  <span className="blueprint-meta-k">ARCHIVE SHEETS</span>
                  <span className="blueprint-meta-v">
                    {activeProject.drawing_count} {activeProject.drawing_count === 1 ? "SHEET" : "SHEETS"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Technical Drawing Type Filter */}
          <BlueprintTypeFilter
            drawingTypes={drawingTypes}
            activeType={activeType}
            onSelectType={handleSelectType}
            totalDrawings={totalCount}
          />

          {/* Error State */}
          {error && (
            <div className="blueprint-state-message is-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="blueprint-retry-btn"
                onClick={() => handleSelectProject(activeProjectSlug)}
              >
                RELOAD DRAWINGS
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !drawings.length && (
            <div className="blueprint-state-message" aria-live="polite">
              <span className="blueprint-loading-line"></span>
              <p>LOADING ARCHITECTURAL DRAWINGS...</p>
            </div>
          )}

          {/* Drawings Grid */}
          {!isLoading && drawings.length === 0 && (
            <div className="blueprint-state-message is-empty">
              <p>No drawings found for type &quot;{activeType}&quot; under this project.</p>
              <button
                type="button"
                className="blueprint-retry-btn"
                onClick={() => handleSelectType("ALL")}
              >
                VIEW ALL SHEETS
              </button>
            </div>
          )}

          {drawings.length > 0 && (
            <div className="blueprint-drawings-grid">
              {drawings.map((drawing, index) => (
                <BlueprintDrawingCard
                  key={drawing.id}
                  drawing={drawing}
                  index={index}
                  onSelect={(d) => setActiveViewerDrawing(d)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Fullscreen Technical Drawing Viewer Modal */}
      {activeViewerDrawing && (
        <BlueprintViewerModal
          drawing={activeViewerDrawing}
          drawingsList={drawings}
          onClose={() => setActiveViewerDrawing(null)}
          onNavigate={(d) => setActiveViewerDrawing(d)}
        />
      )}

      {/* Bottom Architectural Consultation CTA */}
      <section className="blueprint-bottom-cta">
        <div className="blueprint-cta-content">
          <span className="blueprint-cta-tag">TECHNICAL COMMISSIONS</span>
          <h2 className="blueprint-cta-heading">NEED PRECISE ARCHITECTURAL DOCUMENTATION?</h2>
          <p className="blueprint-cta-sub">
            Studio Desire produces comprehensive design packages, including millimeter-exact 
            joinery, reflected ceiling layouts, and construction execution sets.
          </p>
        </div>

        {onNavigateContact && (
          <button
            type="button"
            className="blueprint-cta-action"
            onClick={onNavigateContact}
          >
            CONTACT STUDIO DESIRE
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </section>
    </div>
  );
};
