import React from "react";

interface ThreeDFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  spaceCount: number;
}

export const ThreeDFilters: React.FC<ThreeDFiltersProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  spaceCount
}) => {
  return (
    <section className="product-filters-section threed-filters-section" aria-label="3D Room Category Filter">
      <div className="product-filter-bar">
        <div className="category-pills" role="tablist">
          {categories.map((cat) => {
            const isActive = activeCategory.toUpperCase() === cat.toUpperCase();
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                className={`filter-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelectCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="archive-count-badge">
          <span>{spaceCount} {spaceCount === 1 ? "ROOM VOLUME" : "ROOM VOLUMES"}</span>
        </div>
      </div>
    </section>
  );
};
