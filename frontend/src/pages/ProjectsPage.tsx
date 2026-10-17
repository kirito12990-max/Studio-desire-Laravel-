import React, { useState, useEffect } from "react";
import { ProjectSummary } from "../types/project";
import { ProjectService } from "../services/projectService";
import { OwnerSlideshow } from "../components/OwnerSlideshow";
import { CategoryPuzzleBoard } from "../components/CategoryPuzzleBoard";

interface ProjectsPageProps {
  onSelectProject: (slug: string) => void;
  onOpenCategoryGallery?: (categoryName: string) => void;
  onProjectsLoaded?: (projects: ProjectSummary[]) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onSelectProject,
  onOpenCategoryGallery,
  onProjectsLoaded
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ProjectService.getProjects({
      category: "ALL",
      media_type: "all"
    })
      .then((data) => {
        if (isMounted) {
          setProjects(data.projects);
          setLoading(false);
          if (onProjectsLoaded) onProjectsLoaded(data.projects);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to connect to Studio Desire API");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="projects-landing-view sd-fade-in">
      {loading ? (
        <div className="state-container container" style={{ padding: "5rem 0", textAlign: "center" }}>
          <div className="loading-spinner" />
          <p className="state-desc" style={{ marginTop: "1rem" }}>Loading Studio Desire architectural portfolio...</p>
        </div>
      ) : error ? (
        <div className="state-container container" style={{ padding: "5rem 0", textAlign: "center" }}>
          <h3 className="state-title">Unable to Connect</h3>
          <p className="state-desc">{error}</p>
        </div>
      ) : (
        <>
          {/* SECTION 1 — HERO SLIDESHOW (Cinematic, Preserved Untouched) */}
          <OwnerSlideshow
            projects={projects}
            onSelectProject={onSelectProject}
          />

          {/* SECTION 2 — AUTHORITATIVE PORTFOLIO CATEGORY SHOWCASE */}
          {onOpenCategoryGallery && (
            <CategoryPuzzleBoard
              projects={projects}
              onOpenCategoryGallery={onOpenCategoryGallery}
              onSelectProject={onSelectProject}
            />
          )}
        </>
      )}
    </div>
  );
};

