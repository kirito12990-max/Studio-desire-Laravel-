import React from "react";
import { ProjectSummary } from "../types/project";
import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: ProjectSummary[];
  activeCategory: string;
  onSelectProject: (slug: string) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  activeCategory,
  onSelectProject
}) => {
  if (projects.length === 0) {
    return (
      <div className="editorial-grid">
        <div className="grid-empty-state">
          <h3>No Projects Located</h3>
          <p>There are currently no spaces matching the selected "{activeCategory}" archive criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editorial-grid" role="region" aria-label="Projects Grid">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          onSelectProject={onSelectProject}
        />
      ))}
    </div>
  );
};
