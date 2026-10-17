import React from "react";
import { BlueprintProjectSummary } from "../types/blueprint";

interface BlueprintProjectNavProps {
  projects: BlueprintProjectSummary[];
  activeProjectSlug: string;
  onSelectProject: (slug: string) => void;
}

export const BlueprintProjectNav: React.FC<BlueprintProjectNavProps> = ({
  projects,
  activeProjectSlug,
  onSelectProject,
}) => {
  return (
    <nav className="blueprint-project-nav" aria-label="Blueprint Projects Index">
      <div className="blueprint-nav-header">
        <span className="blueprint-nav-label">PROJECT INDEX</span>
        <span className="blueprint-nav-count">
          {projects.length.toString().padStart(2, "0")} ARCHIVES
        </span>
      </div>

      <ul className="blueprint-project-list">
        {projects.map((proj, idx) => {
          const indexNum = (idx + 1).toString().padStart(2, "0");
          const isActive = proj.project_slug === activeProjectSlug;

          return (
            <li key={proj.project_slug} className="blueprint-project-item">
              <button
                type="button"
                className={`blueprint-project-btn ${isActive ? "is-active" : ""}`}
                onClick={() => onSelectProject(proj.project_slug)}
                aria-current={isActive ? "true" : undefined}
              >
                <div className="blueprint-btn-top">
                  <span className="blueprint-proj-index">{indexNum}</span>
                  <span className="blueprint-proj-name">{proj.project_name}</span>
                </div>

                <div className="blueprint-btn-meta">
                  <span className="blueprint-sheet-count">
                    {proj.drawing_count} {proj.drawing_count === 1 ? "DRAWING" : "DRAWINGS"}
                  </span>
                  {proj.location && (
                    <span className="blueprint-proj-location">{proj.location}</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
