import React, { useState, useEffect } from "react";
import { ProjectSummary } from "../types/project";
import { PortfolioCategory } from "../types/category";
import { adminService } from "../services/adminService";
import { StudioImage } from "./StudioImage";

interface CategoryPuzzleBoardProps {
  projects?: ProjectSummary[];
  onOpenCategoryGallery: (categorySlugOrName: string) => void;
  onSelectProject?: (slug: string) => void;
}

/**
 * Editorial Category Showcase Card
 * Architecture photography is the primary visual element;
 * Category label is the primary identifier with restrained supporting metadata.
 */
const EditorialCategoryCard: React.FC<{
  category: PortfolioCategory;
  index: number;
  sizeClass: string;
  onOpenCategoryGallery: (categorySlugOrName: string) => void;
  onSelectProject?: (slug: string) => void;
}> = ({
  category,
  index,
  sizeClass,
  onOpenCategoryGallery
}) => {
  const representativeProject = category.featured_project || null;

  // Authoritative representative image -> category configured cover -> neutral fallback
  const displayImage =
    representativeProject?.cover_image ||
    category.cover_image ||
    "/uploads/projects/placeholder.webp";

  const projectCount =
    category.published_projects_count ??
    (category as any).published_projects ??
    0;

  const numeral = `№ ${String(index + 1).padStart(2, "0")}`;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenCategoryGallery(category.slug || category.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenCategoryGallery(category.slug || category.name);
    }
  };

  return (
    <article
      className={`editorial-cat-card ${sizeClass}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Explore ${category.name} architectural portfolio`}
    >
      {/* Background Photography & Scrim */}
      <div className="cat-card-media">
        <StudioImage
          src={displayImage}
          alt={`${category.name} Architectural Design — Studio Desire`}
          className="cat-card-img"
          loading="lazy"
          fallbackSrc="/uploads/projects/placeholder.webp"
          showMissingState={false}
        />
        <div className="cat-card-scrim" />
      </div>

      {/* Foreground Editorial Content */}
      <div className="cat-card-content">
        {/* Top Header: Numeral & Work Count */}
        <div className="cat-card-top">
          <span className="cat-card-numeral">{numeral}</span>
          {projectCount > 0 && (
            <span className="cat-card-count-badge">
              {projectCount} {projectCount === 1 ? "Work" : "Works"}
            </span>
          )}
        </div>

        {/* Bottom Content: Category Name, Restrained Metadata & CTA */}
        <div className="cat-card-bottom">
          <h3 className="cat-card-heading">
            {category.name}
          </h3>

          {/* Restrained Supporting Metadata without turning into generic project card */}
          <div className="cat-card-meta-line">
            <span className="cat-card-meta-dot" />
            <span>
              {representativeProject ? (
                <>
                  Featured: {representativeProject.title}
                  {representativeProject.location ? ` · ${representativeProject.location}` : ""}
                  {representativeProject.year ? ` (${representativeProject.year})` : ""}
                </>
              ) : (
                category.description || "Studio Desire Architectural Archive"
              )}
            </span>
          </div>

          {/* Explicit View Gallery Action */}
          <div className="cat-card-cta-row">
            <button
              type="button"
              className="cat-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCategoryGallery(category.slug || category.name);
              }}
              aria-label={`View ${category.name} architectural gallery`}
            >
              <span>View Gallery</span>
              <span className="cat-card-action-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const CategoryPuzzleBoard: React.FC<CategoryPuzzleBoardProps> = ({
  onOpenCategoryGallery,
  onSelectProject
}) => {
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    adminService.getPublicCategories()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          // Strictly filter active categories and sort by authoritative display_order
          const active = data
            .filter((c: PortfolioCategory) => c.is_active !== false)
            .sort((a: PortfolioCategory, b: PortfolioCategory) => (a.display_order || 0) - (b.display_order || 0));
          setCategories(active);
        } else {
          setCategories([]);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load authoritative portfolio categories.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    const cleanup = fetchCategories();
    return cleanup;
  }, []);

  /**
   * Deterministic Asymmetric Editorial Layout Algorithm
   * Balances the grid cleanly with no awkward empty spaces:
   * - Leading category: Large landscape feature footprint (7 columns)
   * - Companion category: Tall portrait companion (5 columns)
   * - Trailing categories: Balanced triad (4 columns each)
   */
  const getAsymmetricTileSize = (index: number, total: number, customSize?: string): string => {
    if (total === 5) {
      if (index === 0) return "tile-large"; // 7 cols landscape feature
      if (index === 1) return "tile-tall";  // 5 cols portrait companion (7 + 5 = 12)
      return "tile-small";                 // 4 cols balanced triad (4 + 4 + 4 = 12)
    }

    if (total === 4) {
      if (index === 0) return "tile-large"; // 8 cols
      if (index === 1) return "tile-tall";  // 4 cols
      return "tile-wide";                  // 6 cols each (6 + 6 = 12)
    }

    if (total === 3) {
      if (index === 0) return "tile-large"; // 7 cols
      if (index === 1) return "tile-tall";  // 5 cols
      return "tile-full";                  // 12 cols
    }

    if (customSize) {
      return `tile-${customSize}`;
    }

    const pattern = ["tile-large", "tile-tall", "tile-small", "tile-small", "tile-small", "tile-wide", "tile-wide"];
    return pattern[index % pattern.length];
  };

  if (loading) {
    return (
      <section className="editorial-category-showcase container" aria-label="Loading Architectural Portfolio">
        <div className="state-container" style={{ padding: "4.5rem 0", textAlign: "center" }}>
          <div className="loading-spinner" />
          <p className="state-desc" style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
            Curating Studio Desire authoritative architectural categories...
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="editorial-category-showcase container" aria-label="Portfolio Category Error">
        <div className="state-container" style={{ padding: "3.5rem 0", textAlign: "center" }}>
          <h3 className="state-title" style={{ color: "var(--accent-warm)" }}>
            Unable to Load Portfolio Archive
          </h3>
          <p className="state-desc">{error}</p>
          <button
            type="button"
            className="btn-reset-editorial"
            style={{ marginTop: "1.25rem" }}
            onClick={fetchCategories}
          >
            Retry Connection
          </button>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="editorial-category-showcase container" aria-label="No Categories">
        <div className="state-container" style={{ padding: "3rem 0", textAlign: "center" }}>
          <p className="state-desc">No active portfolio categories currently published.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="editorial-category-showcase container" aria-label="Selected Architecture Showcase">
      {/* Spacing & Section Transition Divider from Slider */}
      <div className="editorial-transition-divider">
        <span className="editorial-transition-tag">PORTFOLIO TAXONOMY</span>
        <div className="editorial-transition-line" />
        <span className="editorial-transition-coords">23.0225° N · 72.5714° E</span>
      </div>

      {/* Section 3: Premium Editorial Heading & Supporting Copy */}
      <header className="editorial-showcase-intro">
        <div className="editorial-intro-topline">
          <div className="editorial-eyebrow-wrap">
            <span className="editorial-eyebrow-bullet" />
            <span className="editorial-eyebrow-text">SELECTED ARCHITECTURE</span>
          </div>
          <div className="editorial-intro-meta-pill">
            AHMEDABAD · GUJARAT / {categories.length} DISCIPLINES
          </div>
        </div>

        <div className="editorial-intro-grid">
          <h2 className="editorial-main-heading">
            Spaces Designed to Inspire.
          </h2>
          <p className="editorial-supporting-copy">
            An authoritative curation of architectural commissions, residential sanctuaries, and commercial environments crafted with contextual restraint, tectonic clarity, and bespoke materiality.
          </p>
        </div>
      </header>

      {/* Section 4: Asymmetrical Architectural Mosaic Grid */}
      <div className="editorial-mosaic-grid">
        {categories.map((cat, idx) => {
          const sizeClass = getAsymmetricTileSize(idx, categories.length, cat.puzzle_size);

          return (
            <EditorialCategoryCard
              key={cat.id}
              category={cat}
              index={idx}
              sizeClass={sizeClass}
              onOpenCategoryGallery={onOpenCategoryGallery}
              onSelectProject={onSelectProject}
            />
          );
        })}
      </div>
    </section>
  );
};
