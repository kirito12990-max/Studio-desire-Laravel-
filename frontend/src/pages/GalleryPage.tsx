import React, { useState, useEffect, useMemo } from "react";
import { ProjectSummary } from "../types/project";
import { PortfolioCategory } from "../types/category";
import { projectService } from "../services/projectService";
import { adminService } from "../services/adminService";
import { StudioImage } from "../components/StudioImage";

interface GalleryPageProps {
  projects?: ProjectSummary[];
  initialCategory?: string;
  onSelectProject: (slug: string) => void;
  onBackToCurated?: () => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({
  projects,
  initialCategory = "ALL",
  onSelectProject,
  onBackToCurated
}) => {
  const [internalProjects, setInternalProjects] = useState<ProjectSummary[]>(projects || []);
  const [authoritativeCats, setAuthoritativeCats] = useState<PortfolioCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(!projects || projects.length === 0);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");

  useEffect(() => {
    if (projects && projects.length > 0) {
      setInternalProjects(projects);
      setLoading(false);
    } else {
      setLoading(true);
      projectService.getProjects()
        .then((res) => {
          setInternalProjects(res.projects || []);
        })
        .catch((err) => {
          console.error("Failed to fetch gallery projects", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projects]);

  useEffect(() => {
    adminService.getPublicCategories()
      .then((data) => {
        if (Array.isArray(data)) {
          setAuthoritativeCats(data.filter(c => c.is_active));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Extract distinct authoritative categories, years, and locations
  const categories = useMemo(() => {
    if (authoritativeCats.length > 0) {
      return ["ALL", ...authoritativeCats.map(c => c.name.toUpperCase())];
    }
    const cats = new Set<string>();
    internalProjects.forEach((p) => {
      if (p.category) cats.add(p.category.toUpperCase());
    });
    return ["ALL", ...Array.from(cats)];
  }, [authoritativeCats, internalProjects]);

  const years = useMemo(() => {
    const ySet = new Set<number>();
    internalProjects.forEach((p) => {
      if (p.year) ySet.add(p.year);
    });
    return ["ALL", ...Array.from(ySet).sort((a, b) => b - a).map(String)];
  }, [internalProjects]);

  const locations = useMemo(() => {
    const lSet = new Set<string>();
    internalProjects.forEach((p) => {
      if (p.location) lSet.add(p.location);
    });
    return ["ALL", ...Array.from(lSet).sort()];
  }, [internalProjects]);

  // Filtered projects respecting authoritative category relationships
  const filteredProjects = useMemo(() => {
    return internalProjects.filter((p) => {
      // Category match
      if (selectedCategory !== "ALL") {
        const catTarget = selectedCategory.trim().toLowerCase();
        const pCat = (p.category || "").trim().toLowerCase();

        const authCat = authoritativeCats.find(c =>
          c.slug.toLowerCase() === catTarget ||
          c.name.toLowerCase() === catTarget
        );

        if (authCat) {
          const matchSlug = pCat === authCat.slug.toLowerCase();
          const matchName = pCat === authCat.name.toLowerCase();
          const matchId = p.category_id === authCat.id;
          if (!matchSlug && !matchName && !matchId) return false;
        } else {
          if (pCat !== catTarget) return false;
        }
      }
      // Year match
      if (selectedYear !== "ALL") {
        if (String(p.year) !== selectedYear) return false;
      }
      // Location match
      if (selectedLocation !== "ALL") {
        if (p.location !== selectedLocation) return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || "").toLowerCase().includes(q);
        const matchLoc = (p.location || "").toLowerCase().includes(q);
        const matchCat = (p.category || "").toLowerCase().includes(q);
        const matchDesc = (p.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [internalProjects, selectedCategory, selectedYear, selectedLocation, searchQuery, authoritativeCats]);

  return (
    <div className="gallery-view-container container sd-fade-in">
      {/* Top Header & Navigation Bar */}
      <div className="gallery-header-bar">
        <div className="gallery-header-left">
          {onBackToCurated && (
            <button
              type="button"
              className="gallery-back-btn"
              onClick={onBackToCurated}
            >
              ← Back to Curated Board
            </button>
          )}
          <span className="gallery-results-count">
            {filteredProjects.length} {filteredProjects.length === 1 ? "Project" : "Projects"} in Archive
          </span>
        </div>

        {/* Search Bar */}
        <div className="gallery-search-box">
          <input
            type="text"
            placeholder="Search projects by name, location, material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gallery-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="gallery-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="gallery-filters-row">
        {/* Category Tabs */}
        <div className="gallery-category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`gallery-cat-btn ${selectedCategory.toUpperCase() === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Year & Location Dropdowns */}
        <div className="gallery-dropdowns">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="gallery-select"
            aria-label="Filter by Year"
          >
            <option value="ALL">All Years</option>
            {years.filter((y) => y !== "ALL").map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="gallery-select"
            aria-label="Filter by Location"
          >
            <option value="ALL">All Locations</option>
            {locations.filter((l) => l !== "ALL").map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {(selectedCategory !== "ALL" || selectedYear !== "ALL" || selectedLocation !== "ALL" || searchQuery) && (
            <button
              type="button"
              className="gallery-reset-btn"
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedYear("ALL");
                setSelectedLocation("ALL");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Masonry / Grid Project Cards */}
      {loading ? (
        <div className="gallery-empty-state">
          <p className="empty-title">Loading architectural archives...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="gallery-empty-state">
          <p className="empty-title">No architectural projects matched your criteria.</p>
          <button
            type="button"
            className="btn-reset-editorial"
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedYear("ALL");
              setSelectedLocation("ALL");
              setSearchQuery("");
            }}
          >
            View Full Portfolio
          </button>
        </div>
      ) : (
        <div className="gallery-masonry-grid">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="gallery-project-card"
              onClick={() => onSelectProject(project.slug)}
            >
              <div className="gallery-card-media">
                <StudioImage
                  src={project.cover_image}
                  alt={project.title}
                  className="gallery-card-img"
                  loading="lazy"
                  fallbackSrc="/uploads/projects/placeholder.webp"
                  showMissingState={false}
                />
                <div className="gallery-card-hover-overlay">
                  <span className="gallery-hover-cta">VIEW DOSSIER →</span>
                </div>
                {project.featured && (
                  <span className="gallery-card-badge-featured">FEATURED</span>
                )}
                {project.category && (
                  <span className="gallery-card-badge-cat">{project.category}</span>
                )}
              </div>

              <div className="gallery-card-details">
                <div className="gallery-card-title-row">
                  <h3 className="gallery-card-title">{project.title}</h3>
                  {project.year && (
                    <span className="gallery-card-year">{project.year}</span>
                  )}
                </div>
                <div className="gallery-card-location">{project.location || "Ahmedabad, Gujarat"}</div>
                {project.description && (
                  <p className="gallery-card-desc">{project.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
