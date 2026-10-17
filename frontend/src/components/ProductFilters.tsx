import React from "react";

interface ProductFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  productCount: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  productCount
}) => {
  return (
    <section className="product-filters-section" aria-label="Product Category Filter">
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
          <span>{productCount} {productCount === 1 ? "OBJECT" : "OBJECTS"}</span>
        </div>
      </div>
    </section>
  );
};
