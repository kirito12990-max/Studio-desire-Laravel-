import React from "react";
import { MediaFilter } from "../types/project";

interface ProjectFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  activeMedia: MediaFilter;
  onSelectMedia: (media: MediaFilter) => void;
  projectCount: number;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  activeMedia,
  onSelectMedia,
  projectCount
}) => {
  const mediaOptions: { id: MediaFilter; label: string }[] = [
    { id: "all", label: "ALL" },
    { id: "photos", label: "PHOTOS" },
    { id: "videos", label: "VIDEOS" }
  ];

  return (
    <div className="archive-controls-bar">
      {/* Category Tabs */}
      <ul className="category-filter-list" role="tablist" aria-label="Project Categories">
        {categories.map((cat) => (
          <li key={cat}>
            <button
              className={`filter-btn ${cat.toUpperCase() === activeCategory.toUpperCase() ? "active" : ""}`}
              onClick={() => onSelectCategory(cat)}
              role="tab"
              aria-selected={cat.toUpperCase() === activeCategory.toUpperCase()}
            >
              {cat}
            </button>
          </li>
        ))}
      </ul>

      {/* Counter & Media Segment */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <span className="project-counter">
          [ {projectCount} {projectCount === 1 ? "Space" : "Spaces"} Indexed ]
        </span>

        <div className="media-filter-segment" role="group" aria-label="Media format filter">
          {mediaOptions.map((opt) => (
            <button
              key={opt.id}
              className={`media-filter-btn ${activeMedia === opt.id ? "active" : ""}`}
              onClick={() => onSelectMedia(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
