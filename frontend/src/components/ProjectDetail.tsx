import React, { useEffect, useState, useRef } from "react";
import { ProjectDetail as IProjectDetail, ProjectSummary, ProjectMedia } from "../types/project";
import { ProjectService } from "../services/projectService";
import { VisualizationService } from "../services/visualizationService";
import { VideoViewer } from "./VideoViewer";
import { GalleryViewer } from "./GalleryViewer";
import { ProjectCentralVrPortal } from "./ProjectCentralVrPortal";
import { StudioCloseButton } from "./StudioModal";
import { StudioImage } from "./StudioImage";

interface ProjectDetailProps {
  slug: string | null;
  allProjects: ProjectSummary[];
  onClose: () => void;
  onNavigateProject: (slug: string) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  slug,
  allProjects,
  onClose,
  onNavigateProject
}) => {
  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [projectRooms, setProjectRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [showDesktopQrModal, setShowDesktopQrModal] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) {
      setProject(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setActiveLightboxIndex(null);
    setShowDesktopQrModal(false);
    setProjectRooms([]);

    ProjectService.getProjectBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setProject(data);
          setLoading(false);
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }

          // Fetch associated 3D room visualization spaces for this project
          VisualizationService.getProjectsArchive(data.slug)
            .then((archives) => {
              if (isMounted && archives && archives.length > 0) {
                setProjectRooms(archives[0].rooms || []);
              }
            })
            .catch(() => {
              // Gracefully handle if no separate room archive exists
            });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load project details");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!slug) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if lightbox is open (lightbox handles its own keys)
      if (activeLightboxIndex !== null) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handleAdjacent(-1);
      if (e.key === "ArrowRight") handleAdjacent(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slug, project, allProjects, activeLightboxIndex]);

  const handleAdjacent = (direction: number) => {
    if (!slug || allProjects.length === 0) return;
    const currentIndex = allProjects.findIndex((p) => p.slug === slug || String(p.id) === slug);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = allProjects.length - 1;
    if (nextIndex >= allProjects.length) nextIndex = 0;

    onNavigateProject(allProjects[nextIndex].slug);
  };

  if (!slug) return null;

  const videoMedia = project?.media.find((m) => m.media_type === "video");

  // Construct deduplicated image list where hero cover is always at index 0
  const buildDeduplicatedGallery = (p: IProjectDetail): ProjectMedia[] => {
    const rawImages = (p.media || []).filter((m) => m.media_type === "image");
    const normalize = (u?: string | null) => (u || "").trim().toLowerCase();
    const coverUrl = normalize(p.cover_image);

    // Look for matching cover image in media by URL or ID
    const coverIdx = rawImages.findIndex((m) => normalize(m.url) === coverUrl);

    if (coverIdx !== -1) {
      // Move cover image to top
      const coverItem = rawImages[coverIdx];
      const rest = rawImages.filter((_, idx) => idx !== coverIdx);
      return [coverItem, ...rest];
    } else if (p.cover_image) {
      // Create hero item from cover_image without duplication
      const heroItem: ProjectMedia = {
        id: -1,
        project_id: p.id,
        media_type: "image",
        url: p.cover_image,
        caption: `${p.title} — Main Architectural Cover`,
        alt_text: `${p.title} — Hero perspective`,
        sort_order: -1,
        vr_url: p.vr_url,
        has_vr: Boolean(p.vr_url),
        show_qr: p.show_qr
      };
      return [heroItem, ...rawImages];
    }
    return rawImages;
  };

  const galleryImages = project ? buildDeduplicatedGallery(project) : [];
  const heroImage = galleryImages[0] || null;
  const supportingImages = galleryImages.slice(1, 3);

  // Dynamic Eyebrow Hierarchy: PROJECT [NAME] · [CATEGORY] · [LOCATION]
  const eyebrowText = project
    ? `PROJECT ${(project.title || "STUDIO SPACE").toUpperCase()} · ${(project.category || "ARCHITECTURAL").toUpperCase()} · ${(project.location || "CONFIDENTIAL").toUpperCase()}`
    : "PROJECT DOSSIER";

  // Room VR determination:
  const roomWithVr = projectRooms.find((r) => r.vr_url && r.vr_url.trim());
  const mediaRoomWithVr = (project?.media || []).find((m) => m.vr_url && m.vr_url.trim() && m.room_name);
  const roomVrUrl = roomWithVr?.vr_url || mediaRoomWithVr?.vr_url || null;
  const roomName = roomWithVr?.room || roomWithVr?.title || mediaRoomWithVr?.room_name || `${project?.category || "Architectural"} Suite`;
  const roomShowQr = roomWithVr ? (roomWithVr.show_qr !== false) : (mediaRoomWithVr ? (mediaRoomWithVr.show_qr !== false) : true);

  // Project-wide VR determination:
  const projectVrUrl = project?.vr_url && project.vr_url.trim() ? project.vr_url : null;
  const projectShowQr = project?.show_qr !== false;

  // Action row directly beneath photographs:
  const actionRowVrUrl = projectVrUrl || roomVrUrl;
  const actionRowShowQr = actionRowVrUrl === projectVrUrl ? projectShowQr : roomShowQr;

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget && activeLightboxIndex === null && !showDesktopQrModal) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
    >
      <div className="modal-container" ref={containerRef}>
        {/* Modal Sticky Header */}
        <header className="modal-header">
          <div className="modal-header-meta">
            <span style={{ fontWeight: 600, letterSpacing: "0.14em" }}>{eyebrowText}</span>
          </div>
          <div className="modal-actions">
            <StudioCloseButton onClick={onClose} label="Close project dossier" darkSurface />
          </div>
        </header>

        {/* Modal Body */}
        <div className="modal-body">
          {loading && (
            <div className="state-container">
              <h3 className="state-title">Loading Architectural Dossier...</h3>
              <p className="state-desc">Retrieving space details and high-resolution assets.</p>
            </div>
          )}

          {error && (
            <div className="state-container">
              <h3 className="state-title">Space Not Found</h3>
              <p className="state-desc">{error}</p>
              <button className="btn-primary-editorial" onClick={onClose}>
                Return to Archive
              </button>
            </div>
          )}

          {project && !loading && (
            <>
              {/* Refined Project Identity Header */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--accent-warm, #c8a265)",
                  fontFamily: "var(--font-mono, monospace)",
                  marginBottom: "0.6rem"
                }}>
                  {eyebrowText}
                </div>
                <h2 className="modal-project-title" id="modalTitle" style={{ marginBottom: "0.35rem" }}>
                  {project.title}
                </h2>
                {project.subtitle && (
                  <p className="modal-project-subtitle" style={{ marginBottom: "0" }}>
                    {project.subtitle}
                  </p>
                )}
              </div>

              {/* EDITORIAL IMAGE COMPOSITION: Main Image (650x410) + 2 Supporting (220x165) */}
              <div className="project-editorial-showcase">
                <div className="project-hero-composition">
                  {/* Left: Main Hero Photograph (Target 650 x 410) */}
                  {heroImage && (
                    <figure
                      className="hero-main-wrapper"
                      onClick={() => setActiveLightboxIndex(0)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveLightboxIndex(0);
                        }
                      }}
                      aria-label={`Open main photo for ${project.title} in gallery lightbox`}
                    >
                      <StudioImage
                        src={heroImage.url}
                        thumbnailSrc={heroImage.thumbnail_url}
                        alt={heroImage.alt_text || `${project.title} Main Architecture`}
                        className="hero-main-image"
                        loading="eager"
                        fallbackSrc="/uploads/projects/placeholder.webp"
                        showMissingState={false}
                      />
                      <div className="hero-main-scrim" />
                      <div className="hero-badge-tag">
                        <span>Cover Perspective</span>
                      </div>
                      <div className="hero-main-footer">
                        <span className="hero-main-caption">
                          {heroImage.caption || `${project.title} — Primary Spatial View`}
                        </span>
                        <span className="hero-gallery-prompt">
                          View Gallery ({galleryImages.length} Photos) ↗
                        </span>
                      </div>
                    </figure>
                  )}

                  {/* Right Column: Two Supporting Images arranged horizontally side-by-side (Target 220 x 165 each) */}
                  <div className="hero-supporting-column">
                    <div className="supporting-images-cluster">
                      {supportingImages.map((img, idx) => {
                        const galleryIdx = idx + 1; // 1-indexed in gallery
                        return (
                          <figure
                            key={img.id || idx}
                            className="supporting-image-card"
                            onClick={() => setActiveLightboxIndex(galleryIdx)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setActiveLightboxIndex(galleryIdx);
                              }
                            }}
                            aria-label={`Open supporting photo ${idx + 1} for ${project.title}`}
                          >
                            <StudioImage
                              src={img.url}
                              thumbnailSrc={img.thumbnail_url}
                              alt={img.alt_text || `${project.title} Supporting Perspective ${idx + 1}`}
                              className="supporting-image-img"
                              loading="lazy"
                              fallbackSrc="/uploads/projects/placeholder.webp"
                              showMissingState={false}
                            />
                            <div className="supporting-image-overlay">
                              <div className="supporting-image-meta">
                                <span className="supporting-image-caption">
                                  {img.caption || `Perspective 0${idx + 2}`}
                                </span>
                                <span className="supporting-image-expand">↗</span>
                              </div>
                            </div>
                          </figure>
                        );
                      })}

                      {/* Placeholder Slot if fewer than 2 supporting images */}
                      {supportingImages.length < 2 && (
                        <div className="supporting-image-placeholder">
                          <span className="placeholder-slot-code">Archival Slot 02</span>
                          <span className="placeholder-slot-label">Detail Render Pending</span>
                        </div>
                      )}
                    </div>

                    <div className="supporting-spatial-context">
                      <span className="spatial-context-label">Architectural Plates</span>
                      <p className="spatial-context-text">
                        Secondary spatial perspectives capturing volumetric transitions, joinery details, and natural illumination studies.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Restrained Action Row directly beneath the photograph composition */}
                {actionRowVrUrl && (
                  <div className="project-action-row-beneath">
                    <div className="action-row-identity">
                      <span className="action-row-dot" />
                      <span className="action-row-tag">
                        {projectVrUrl ? "Central VR Destination Configured" : "Room VR Destination Configured"}
                      </span>
                    </div>
                    <div className="action-row-controls">
                      {actionRowShowQr && (
                        <button
                          className="action-row-btn btn-scan-qr"
                          onClick={() => setShowDesktopQrModal(true)}
                          aria-label="Scan QR code with phone camera"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                          </svg>
                          <span>Scan QR</span>
                        </button>
                      )}
                      <a
                        href={actionRowVrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-row-btn btn-open-vr"
                        aria-label={`Open interactive VR experience for ${project.title}`}
                      >
                        <span>Open VR ↗</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop QR Inspection Modal */}
              {showDesktopQrModal && actionRowVrUrl && (
                <div className="desktop-qr-modal-backdrop" onClick={() => setShowDesktopQrModal(false)}>
                  <div className="desktop-qr-modal-card" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="desktop-qr-close"
                      onClick={() => setShowDesktopQrModal(false)}
                      aria-label="Close QR inspection"
                    >
                      ✕
                    </button>
                    <div className="desktop-qr-badge">GENUINE VR QR DESTINATION</div>
                    <h4 className="desktop-qr-title">Scan with Phone Camera</h4>
                    <p className="desktop-qr-desc">
                      Point your mobile phone camera at this high-resolution vector QR code to launch the 360° virtual tour for {project.title}.
                    </p>
                    <div className="desktop-qr-frame">
                      <img
                        src={VisualizationService.getDynamicQrUrl(actionRowVrUrl)}
                        alt={`Genuine QR code for ${project.title}`}
                        className="desktop-qr-image"
                      />
                    </div>
                    <div className="desktop-qr-url">{actionRowVrUrl}</div>
                    <div className="desktop-qr-actions">
                      <a
                        href={actionRowVrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="desktop-qr-launch-btn"
                      >
                        Open Destination in New Tab ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Specifications Matrix */}
              <div className="project-spec-grid">
                <div className="spec-item">
                  <span className="spec-label">Location</span>
                  <span className="spec-value">{project.location}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Category</span>
                  <span className="spec-value">{project.category}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Year</span>
                  <span className="spec-value">{project.year}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Scale</span>
                  <span className="spec-value">{project.area || "Confidential"}</span>
                </div>
              </div>

              {/* Architectural Narrative */}
              <div className="modal-narrative-section">
                <div className="narrative-headline">Design Narrative</div>
                <p className="narrative-body">{project.description}</p>
              </div>

              {/* Video Walkthrough (if project has motion) */}
              {videoMedia && (
                <VideoViewer media={videoMedia} fallbackPoster={project.cover_image} />
              )}

              {/* Complete Photo Gallery Stack & Fullscreen Lightbox */}
              <GalleryViewer
                mediaList={galleryImages}
                projectTitle={project.title}
                initialLightboxIndex={activeLightboxIndex}
                onCloseLightbox={() => setActiveLightboxIndex(null)}
                hideInlineStack={false}
              />

              {/* REFINED ROOM VR PORTAL (Below Gallery) */}
              {(roomVrUrl || projectVrUrl) && (
                <div className="project-vr-action-slot">
                  <ProjectCentralVrPortal
                    portalType={roomVrUrl ? "room" : "project"}
                    roomName={roomVrUrl ? roomName : project.title}
                    projectName={project.title}
                    vrUrl={roomVrUrl || projectVrUrl!}
                    subtitle={project.subtitle || `${project.category} · ${project.location}`}
                    showQr={roomVrUrl ? roomShowQr : projectShowQr}
                  />
                </div>
              )}

              {/* Adjacent Navigation */}
              <div className="modal-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handleAdjacent(-1)}
                  aria-label="Navigate to previous project"
                >
                  <span>← Previous Space</span>
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => handleAdjacent(1)}
                  aria-label="Navigate to next project"
                >
                  <span>Next Space →</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
