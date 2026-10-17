import React from "react";
import { ProjectSummary } from "../types/project";
import { StudioImage } from "./StudioImage";

interface ProjectCardProps {
  project: ProjectSummary;
  index: number;
  onSelectProject: (slug: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, onSelectProject }) => {
  // Use custom grid_span and aspect_ratio or rhythmic fallback
  const getSpanClass = (i: number) => {
    if (project.grid_span) return project.grid_span;
    const patterns = [
      "span-7", "span-5", "span-4", "span-4", "span-4",
      "span-12", "span-5", "span-7", "span-6", "span-6"
    ];
    return patterns[i % patterns.length];
  };

  const getRatioClass = (i: number) => {
    if (project.aspect_ratio) return project.aspect_ratio;
    const ratios = [
      "ratio-landscape", "ratio-portrait", "ratio-standard", "ratio-standard", "ratio-standard",
      "ratio-hero", "ratio-portrait", "ratio-landscape", "ratio-standard", "ratio-landscape"
    ];
    return ratios[i % ratios.length];
  };

  const spanClass = getSpanClass(index);
  const ratioClass = getRatioClass(index);

  return (
    <article
      className={`project-card ${spanClass}`}
      onClick={() => onSelectProject(project.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectProject(project.slug);
        }
      }}
      aria-label={`View project dossier: ${project.title}, ${project.location}`}
    >
      <div className={`card-media-wrapper ${ratioClass}`}>
        <StudioImage
          src={project.cover_image}
          alt={`${project.title} — ${project.location} Architectural Interior`}
          className="card-img"
          loading="lazy"
          fallbackSrc="/uploads/projects/placeholder.webp"
          showMissingState={false}
        />
        <span className="demo-tag">DEMO PROJECT</span>
        {project.has_video && (
          <div className="video-indicator" title="Includes architectural spatial video">
            <svg viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Motion</span>
          </div>
        )}
      </div>

      <div className="card-header-row">
        <h3 className="card-title">{project.title}</h3>
        <span className="card-arrow" aria-hidden="true">→</span>
      </div>

      <div className="card-meta-row">
        <span className="card-location">{project.location}</span>
        <span className="card-category-year">{project.category} · {project.year}</span>
      </div>
    </article>
  );
};
