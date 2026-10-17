import React from "react";
import { ProductSummary } from "../types/product";
import { StudioImage } from "./StudioImage";

interface ProductCardProps {
  product: ProductSummary;
  index: number;
  onSelectProduct: (slug: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  index,
  onSelectProduct
}) => {
  // Editorial asymmetric layout spans
  const getSpanClass = (i: number) => {
    if (product.grid_span) return product.grid_span;
    // Rhythmic alternating spans: Large (7) + Small (5), Small (4) + Large (8), Full (12), etc.
    const patterns = [
      "span-7", "span-5", 
      "span-4", "span-8", 
      "span-12", 
      "span-6", "span-6", 
      "span-5", "span-7", 
      "span-4", "span-4", "span-4"
    ];
    return patterns[i % patterns.length];
  };

  // Aspect ratios for architectural object archiving
  const getRatioClass = (i: number) => {
    const ratios = [
      "ratio-landscape", "ratio-portrait",
      "ratio-portrait", "ratio-landscape",
      "ratio-hero",
      "ratio-standard", "ratio-standard",
      "ratio-portrait", "ratio-landscape",
      "ratio-portrait", "ratio-portrait", "ratio-portrait"
    ];
    return ratios[i % ratios.length];
  };

  const spanClass = getSpanClass(index);
  const ratioClass = getRatioClass(index);

  return (
    <article
      className={`product-card ${spanClass}`}
      onClick={() => onSelectProduct(product.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectProduct(product.slug);
        }
      }}
      aria-label={`View product dossier: ${product.title}, ${product.category}`}
    >
      <div className={`card-media-wrapper product-media-box ${ratioClass}`}>
        <StudioImage
          src={product.cover_image}
          alt={`${product.title} — ${product.category} Design Object`}
          className="card-img"
          loading="lazy"
          fallbackSrc="/uploads/projects/placeholder.webp"
          showMissingState={false}
        />
        <span className="demo-tag">DEMO CONCEPT</span>
        <div className="product-card-quick-view">
          <span>View Archive Dossier →</span>
        </div>
      </div>

      <div className="card-header-row">
        <h3 className="card-title product-card-title">{product.title}</h3>
        <span className="card-arrow" aria-hidden="true">→</span>
      </div>

      <div className="card-meta-row">
        <span className="card-category-year">{product.category}</span>
        <span className="card-year">{product.year}</span>
      </div>
    </article>
  );
};
