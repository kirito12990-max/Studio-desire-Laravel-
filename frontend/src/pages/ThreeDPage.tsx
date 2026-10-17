import React, { useState, useEffect, useMemo } from "react";
import { VisualizationProjectArchive, ActiveRenderView } from "../types/visualization";
import { VisualizationService } from "../services/visualizationService";
import { ProjectCentralVrPortal } from "../components/ProjectCentralVrPortal";
import { RenderSpaceCard } from "../components/RenderSpaceCard";
import { RenderLightbox } from "../components/RenderLightbox";
import { RenderQrModal } from "../components/RenderQrModal";

interface ThreeDPageProps {
  onNavigateContact: () => void;
}

interface RenderQrState {
  title: string;
  projectName: string;
  roomName: string;
  vrUrl: string;
}

export const ThreeDPage: React.FC<ThreeDPageProps> = ({ onNavigateContact }) => {
  const [projects, setProjects] = useState<VisualizationProjectArchive[]>([]);
  const [activeProjectSlug, setActiveProjectSlug] = useState<string>("ALL");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox & Modal States
  const [activeRender, setActiveRender] = useState<ActiveRenderView | null>(null);
  const [activeRenderQr, setActiveRenderQr] = useState<RenderQrState | null>(null);

  // Fetch projects with their rooms & VR portals
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    VisualizationService.getProjectsArchive()
      .then((data) => {
        if (isMounted) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load 3D visual archive");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Distinct room categories across all projects
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("ALL");
    projects.forEach((p) => {
      p.rooms.forEach((r) => {
        if (r.category) {
          cats.add(r.category.toUpperCase());
        }
      });
    });
    return Array.from(cats);
  }, [projects]);

  // Filter projects and their rooms based on active project & room category
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => activeProjectSlug === "ALL" || p.slug === activeProjectSlug)
      .map((p) => {
        const matchingRooms = p.rooms.filter((r) => {
          if (activeCategory === "ALL") return true;
          return r.category.toUpperCase() === activeCategory;
        });

        return {
          ...p,
          rooms: matchingRooms
        };
      })
      .filter((p) => p.rooms.length > 0 || (activeCategory === "ALL" && p.has_central_vr));
  }, [projects, activeProjectSlug, activeCategory]);

  const handleOpenLightbox = (view: ActiveRenderView) => {
    setActiveRender(view);
  };

  const handleCloseLightbox = () => {
    setActiveRender(null);
  };

  const handlePrevRender = () => {
    if (!activeRender || activeRender.allImagesInSpace.length <= 1) return;
    const newIdx =
      (activeRender.index - 1 + activeRender.allImagesInSpace.length) %
      activeRender.allImagesInSpace.length;
    const newSelected = activeRender.allImagesInSpace[newIdx];
    setActiveRender({
      ...activeRender,
      url: newSelected.url,
      caption: newSelected.caption,
      angle: newSelected.angle,
      vr_url: newSelected.vr_url,
      has_vr: newSelected.has_vr,
      index: newIdx
    });
  };

  const handleNextRender = () => {
    if (!activeRender || activeRender.allImagesInSpace.length <= 1) return;
    const newIdx = (activeRender.index + 1) % activeRender.allImagesInSpace.length;
    const newSelected = activeRender.allImagesInSpace[newIdx];
    setActiveRender({
      ...activeRender,
      url: newSelected.url,
      caption: newSelected.caption,
      angle: newSelected.angle,
      vr_url: newSelected.vr_url,
      has_vr: newSelected.has_vr,
      index: newIdx
    });
  };

  const handleOpenRenderQr = (info: RenderQrState) => {
    setActiveRenderQr(info);
  };

  return (
    <div className="threed-view sd-fade-in" style={{ paddingTop: "1.5rem" }}>
      <div className="container">
        {/* Project Selector Bar */}
        <section className="threed-project-nav-section" aria-label="3D Projects Archive Navigation">
          <div className="threed-nav-header">
            <span className="threed-nav-eyebrow">PROJECT ARCHIVE SELECTOR</span>
            <span className="threed-nav-count">{projects.length} PROJECTS WITH 3D SPACES</span>
          </div>

          <div className="threed-project-tabs-scroll">
            <button
              type="button"
              className={`threed-project-tab-btn ${activeProjectSlug === "ALL" ? "active" : ""}`}
              onClick={() => setActiveProjectSlug("ALL")}
            >
              <span className="tab-title">ALL PROJECTS</span>
              <span className="tab-badge">
                {projects.reduce((acc, p) => acc + p.rooms.length, 0)} ROOMS
              </span>
            </button>

            {projects.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={`threed-project-tab-btn ${activeProjectSlug === p.slug ? "active" : ""}`}
                onClick={() => setActiveProjectSlug(p.slug)}
              >
                <span className="tab-index">0{idx + 1}</span>
                <span className="tab-title">{p.title}</span>
                <span className="tab-badge">
                  {p.rooms.length} {p.rooms.length === 1 ? "ROOM" : "ROOMS"}
                  {p.has_central_vr && " · FULL VR"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Room Category Secondary Filters */}
        {availableCategories.length > 2 && (
          <div className="threed-category-filter-bar">
            <span className="filter-bar-label">FILTER BY ROOM:</span>
            <div className="filter-pill-row">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill-btn ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Render Area */}
        {loading ? (
          <div className="state-container">
            <div className="loading-spinner"></div>
            <h3 className="state-title">Retrieving Spatial Visualizations...</h3>
            <p className="state-desc">Loading architectural renders, spatial volumes, and calibrated VR portals.</p>
          </div>
        ) : error ? (
          <div className="state-container">
            <h3 className="state-title">Visual Archive Unavailable</h3>
            <p className="state-desc">{error}</p>
            <button
              onClick={() => {
                setActiveProjectSlug("ALL");
                setActiveCategory("ALL");
              }}
              className="editorial-btn"
            >
              Reset Filters
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-archive">
            <p className="empty-title">NO 3D VISUALIZATIONS MATCHING CRITERIA</p>
            <p className="empty-subtitle">
              Studio Desire regularly publishes new rendered spatial studies across residential and commercial volumes.
            </p>
            <button
              onClick={() => {
                setActiveProjectSlug("ALL");
                setActiveCategory("ALL");
              }}
              className="editorial-btn reset-empty-btn"
            >
              View All Projects
            </button>
          </div>
        ) : (
          <div className="threed-projects-stream">
            {filteredProjects.map((project, pIdx) => (
              <section
                key={project.id}
                className="threed-project-group"
                id={`project-group-${project.slug}`}
              >
                {/* Project Header Dossier */}
                <header className="threed-project-dossier-header">
                  <div className="project-dossier-meta">
                    <span className="dossier-index">PROJECT 0{pIdx + 1}</span>
                    <span className="dossier-divider">/</span>
                    <span className="dossier-category">{project.category}</span>
                    {project.location && (
                      <>
                        <span className="dossier-divider">·</span>
                        <span className="dossier-location">{project.location}</span>
                      </>
                    )}
                    <span className="dossier-divider">·</span>
                    <span className="dossier-year">{project.year}</span>
                  </div>

                  <div className="project-dossier-title-row">
                    <h2 className="project-dossier-title">{project.title}</h2>
                    {project.has_central_vr && (
                      <span className="project-vr-indicator">
                        <span className="pulse-dot"></span> CENTRAL VR ENABLED
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p className="project-dossier-description">{project.description}</p>
                  )}
                </header>

                {/* Level 1: Central Project-Wide VR Portal (Prominent, Architectural) */}
                {project.has_central_vr && project.vr_url && (
                  <ProjectCentralVrPortal
                    projectName={project.title}
                    vrUrl={project.vr_url}
                    subtitle={project.subtitle}
                  />
                )}

                {/* Level 2 & Level 3: Rooms with Room VR & Render VR */}
                {project.rooms.length > 0 && (
                  <div className="threed-project-rooms-list">
                    {project.rooms.map((room, rIdx) => (
                      <RenderSpaceCard
                        key={room.id}
                        space={room}
                        index={rIdx}
                        onOpenLightbox={handleOpenLightbox}
                        onOpenRenderQr={handleOpenRenderQr}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Subtle Closing CTA */}
        <section className="archive-bottom-cta">
          <div className="bottom-cta-content">
            <span className="cta-eyebrow">COMMISSION A VISUALIZATION STUDY</span>
            <h2 className="cta-headline">NEED 3D SPATIAL EXPLORATION?</h2>
            <p className="cta-sub">
              We collaborate with private clients, developers, and architects to calibrate atmospheric interior illumination and bespoke joinery before construction.
            </p>
            <button
              className="editorial-btn cta-action-btn"
              onClick={onNavigateContact}
            >
              CONTACT STUDIO DESIRE →
            </button>
          </div>
        </section>
      </div>

      {/* Fullscreen Render Lightbox */}
      <RenderLightbox
        activeRender={activeRender}
        onClose={handleCloseLightbox}
        onPrev={handlePrevRender}
        onNext={handleNextRender}
      />

      {/* Level 3: Individual Render QR Modal */}
      {activeRenderQr && (
        <RenderQrModal
          isOpen={!!activeRenderQr}
          onClose={() => setActiveRenderQr(null)}
          title={activeRenderQr.title}
          projectName={activeRenderQr.projectName}
          roomName={activeRenderQr.roomName}
          vrUrl={activeRenderQr.vrUrl}
        />
      )}
    </div>
  );
};
