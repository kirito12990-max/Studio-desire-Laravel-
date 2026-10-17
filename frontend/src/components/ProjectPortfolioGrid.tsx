import React from "react";
import { ProjectSummary } from "../types/project";
import { StudioImage } from "./StudioImage";

interface ProjectPortfolioGridProps {
  projects: ProjectSummary[];
  onSelectProject: (slug: string) => void;
}

/**
 * Deterministic Asymmetrical Layout Algorithm:
 * Ensures pairs and groupings sum cleanly to 12 columns on desktop with no orphan holes.
 */
function getTileSpanClass(index: number, total: number): string {
  // If only 1 project
  if (total === 1) return "tile-wide";
  
  // If only 2 projects
  if (total === 2) return "tile-half";

  // If last single item in an odd count that would otherwise leave a gap
  const mod6 = index % 6;
  if (index === total - 1) {
    if (mod6 === 0 || mod6 === 3) return "tile-wide"; // fills the row nicely
    if (mod6 === 1 || mod6 === 4) return "tile-half";
  }

  // 6-item cyclic balanced pattern:
  // Item 0 (8 cols) + Item 1 (4 cols) = 12 cols
  // Item 2 (6 cols) + Item 3 (6 cols) = 12 cols
  // Item 4 (4 cols) + Item 5 (8 cols) = 12 cols
  switch (mod6) {
    case 0:
      return "tile-large"; // 8 cols, 2 rows
    case 1:
      return "tile-tall";  // 4 cols, 2 rows
    case 2:
      return "tile-half";  // 6 cols, 1 row
    case 3:
      return "tile-half";  // 6 cols, 1 row
    case 4:
      return "tile-small"; // 4 cols, 1 row
    case 5:
      return "tile-wide";  // 8 cols, 1 row
    default:
      return "tile-half";
  }
}

export const ProjectPortfolioGrid: React.FC<ProjectPortfolioGridProps> = ({
  projects,
  onSelectProject
}) => {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="portfolio-editorial-section container" aria-label="Selected Architectural Works">
      {/* Compact Editorial Introduction */}
      <div className="portfolio-section-intro">
        <div className="portfolio-intro-meta">
          <span className="portfolio-eyebrow">SELECTED WORKS</span>
          <span className="portfolio-count-pill">{projects.length} Works</span>
        </div>
        <div className="portfolio-intro-header">
          <h2 className="portfolio-section-title">Architectural &amp; Interior Works</h2>
          <p className="portfolio-section-subtitle">
            A curated portfolio of bespoke residences, luxury hospitality, and progressive commercial spaces.
          </p>
        </div>
      </div>

      {/* Editorial Asymmetrical Project Mosaic */}
      <div className="portfolio-editorial-grid">
        {projects.map((project, idx) => {
          const spanClass = getTileSpanClass(idx, projects.length);

          // Construct clean, restrained location & category metadata
          const typeLabel = project.project_type || project.category || "Architecture";
          const locationLabel = project.location || "India";
          const metaLine = `${locationLabel} · ${typeLabel}`;

          return (
            <article
              key={project.id || project.slug || `project-${idx}`}
              className={`portfolio-card ${spanClass}`}
              onClick={() => onSelectProject(project.slug)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectProject(project.slug);
                }
              }}
              aria-label={`View dossier for ${project.title}, ${metaLine}`}
            >
              <div className="portfolio-card-media">
                <StudioImage
                  src={project.cover_image}
                  alt={project.title}
                  className="portfolio-card-img"
                  loading={idx < 4 ? "eager" : "lazy"}
                  fallbackSrc="/uploads/projects/placeholder.webp"
                  showMissingState={false}
                />
                <div className="portfolio-card-overlay" />
              </div>

              <div className="portfolio-card-content">
                <div className="portfolio-card-top">
                  {project.year && (
                    <span className="portfolio-card-year">{project.year}</span>
                  )}
                </div>

                <div className="portfolio-card-bottom">
                  <div className="portfolio-card-title-row">
                    <h3 className="portfolio-card-title">{project.title}</h3>
                    <span className="portfolio-card-arrow" aria-hidden="true">→</span>
                  </div>
                  <p className="portfolio-card-meta">{metaLine}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
