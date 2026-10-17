import React from "react";
import { ProjectSummary } from "../types/project";
import { StudioImage } from "./StudioImage";

interface FeaturedHeroProps {
  project: ProjectSummary;
  onSelectProject: (slug: string) => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({ project, onSelectProject }) => {
  return (
    <section className="featured-project-section">
      <div className="container">
        <div className="featured-label-bar">
          <div className="featured-flag">01 FEATURED PROJECT</div>
          <div className="featured-index">{project.slug.toUpperCase()}</div>
        </div>

        <div
          className="featured-card"
          onClick={() => onSelectProject(project.slug)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectProject(project.slug);
            }
          }}
          aria-label={`View featured project: ${project.title}`}
        >
          <div className="featured-media-container">
            <StudioImage
              src={project.cover_image}
              alt={`${project.title} — ${project.location}`}
              className="featured-image"
              loading="eager"
              fallbackSrc="/uploads/projects/placeholder.webp"
              showMissingState={false}
            />
            <div className="demo-tag">DEMO PROJECT</div>
            <div className="featured-overlay">
              <div className="featured-info">
                <div className="featured-title-group">
                  <h2>{project.title}</h2>
                  <div className="featured-meta">
                    <span>{project.location}</span>
                    <span>·</span>
                    <span>{project.category}</span>
                    <span>·</span>
                    <span>{project.year}</span>
                  </div>
                </div>
                <div className="featured-action">
                  <span>View Project</span>
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
