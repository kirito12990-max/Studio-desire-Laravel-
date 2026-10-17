import React, { useEffect, useState, useRef } from "react";
import { ProductDetailType, ProductSummary } from "../types/product";
import { ProductService } from "../services/productService";
import { StudioCloseButton } from "./StudioModal";
import { StudioImage } from "./StudioImage";

interface ProductDetailProps {
  slug: string | null;
  allProducts: ProductSummary[];
  onClose: () => void;
  onNavigateProduct: (slug: string) => void;
  onContactClick: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  slug,
  allProducts,
  onClose,
  onNavigateProduct,
  onContactClick
}) => {
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setActiveImageIndex(null);

    ProductService.getProductBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          setLoading(false);
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load product details");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Handle keyboard events (Escape, Left, Right)
  useEffect(() => {
    if (!slug) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImageIndex !== null) {
        if (e.key === "Escape") setActiveImageIndex(null);
        if (e.key === "ArrowLeft") handlePrevImage();
        if (e.key === "ArrowRight") handleNextImage();
        return;
      }

      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handleAdjacentProduct(-1);
      if (e.key === "ArrowRight") handleAdjacentProduct(1);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slug, activeImageIndex, allProducts, product]);

  const handleAdjacentProduct = (direction: number) => {
    if (!product || allProducts.length <= 1) return;
    const currentIndex = allProducts.findIndex((p) => p.slug === product.slug);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + allProducts.length) % allProducts.length;
    onNavigateProduct(allProducts[nextIndex].slug);
  };

  const allImages = React.useMemo(() => {
    if (!product) return [];
    const list = [{ url: product.cover_image, caption: product.title }];
    if (product.media && product.media.length > 0) {
      product.media.forEach((m) => {
        if (m.url !== product.cover_image) {
          list.push({ url: m.url, caption: m.caption || product.title });
        }
      });
    }
    return list;
  }, [product]);

  const handlePrevImage = () => {
    if (activeImageIndex === null || allImages.length === 0) return;
    setActiveImageIndex((activeImageIndex - 1 + allImages.length) % allImages.length);
  };

  const handleNextImage = () => {
    if (activeImageIndex === null || allImages.length === 0) return;
    setActiveImageIndex((activeImageIndex + 1) % allImages.length);
  };

  if (!slug) return null;

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Product Architectural Dossier"
      onClick={onClose}
    >
      <div
        className="detail-panel"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="detail-top-bar">
          <div className="detail-breadcrumbs">
            <span className="breadcrumb-root">05 / PRODUCTS</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{product?.title || slug}</span>
          </div>

          <div className="detail-top-actions">
            <button
              className="detail-nav-btn"
              onClick={() => handleAdjacentProduct(-1)}
              title="Previous Design Object (Left Arrow)"
              aria-label="Previous Object"
            >
              ← Prev
            </button>
            <button
              className="detail-nav-btn"
              onClick={() => handleAdjacentProduct(1)}
              title="Next Design Object (Right Arrow)"
              aria-label="Next Object"
            >
              Next →
            </button>
            <StudioCloseButton onClick={onClose} label="Close Dossier" />
          </div>
        </div>

        {loading && (
          <div className="detail-loading">
            <div className="loading-spinner"></div>
            <p>Retrieving product archive...</p>
          </div>
        )}

        {error && (
          <div className="detail-error">
            <p>{error}</p>
            <button onClick={onClose} className="editorial-btn">
              Back to Products
            </button>
          </div>
        )}

        {product && !loading && (
          <div className="detail-content">
            {/* Header section */}
            <header className="detail-header">
              <div className="detail-tag-row">
                <span className="detail-category-badge">{product.category}</span>
                <span className="detail-demo-tag">DEMO CONCEPT</span>
                <span className="detail-year">{product.year}</span>
              </div>
              <h1 className="detail-title">{product.title}</h1>
              {product.subtitle && (
                <p className="detail-subtitle">{product.subtitle}</p>
              )}
            </header>

            {/* Hero Presentation Image */}
            <div
              className="product-detail-hero"
              onClick={() => setActiveImageIndex(0)}
              title="Click to view full size"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveImageIndex(0)}
            >
              <StudioImage
                src={product.cover_image}
                alt={`${product.title} — Architectural Presentation`}
                className="detail-hero-img"
                fallbackSrc="/uploads/projects/placeholder.webp"
                showMissingState={false}
              />
              <div className="hero-expand-badge">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.5" fill="none">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                <span>Enlarge</span>
              </div>
            </div>

            {/* Editorial Metadata Grid */}
            <div className="product-meta-specs-grid">
              <div className="spec-item">
                <span className="spec-label">OBJECT CATEGORY</span>
                <span className="spec-value">{product.category}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">YEAR</span>
                <span className="spec-value">{product.year}</span>
              </div>
              {product.materials && (
                <div className="spec-item">
                  <span className="spec-label">MATERIALS & FINISHES</span>
                  <span className="spec-value">{product.materials}</span>
                </div>
              )}
              {product.dimensions && (
                <div className="spec-item">
                  <span className="spec-label">DIMENSIONS</span>
                  <span className="spec-value">{product.dimensions}</span>
                </div>
              )}
            </div>

            {/* Design Concept Narrative */}
            <section className="detail-description-section">
              <h3 className="section-eyebrow">DESIGN CONCEPT</h3>
              <div className="detail-body-text">
                <p>{product.description}</p>
              </div>
              {product.specifications && (
                <div className="product-spec-callout">
                  <span className="spec-callout-title">ARCHITECTURAL NOTES</span>
                  <p>{product.specifications}</p>
                </div>
              )}
            </section>

            {/* Additional Views / Gallery */}
            {product.media && product.media.length > 0 && (
              <section className="product-gallery-section">
                <h3 className="section-eyebrow">STUDIO VIEWS & PERSPECTIVES</h3>
                <div className="product-gallery-grid">
                  {product.media.map((mediaItem, idx) => (
                    <div
                      key={mediaItem.id}
                      className="product-gallery-item"
                      onClick={() => setActiveImageIndex(idx + 1)}
                      tabIndex={0}
                      role="button"
                      aria-label={mediaItem.caption || `View ${product.title} perspective`}
                    >
                      <StudioImage
                        src={mediaItem.url}
                        alt={mediaItem.alt_text || mediaItem.caption || product.title}
                        loading="lazy"
                        fallbackSrc="/uploads/projects/placeholder.webp"
                        showMissingState={false}
                      />
                      {mediaItem.caption && (
                        <p className="product-media-caption">{mediaItem.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bottom Inquire / Commission CTA */}
            <div className="product-dossier-cta">
              <div>
                <h4>CUSTOM SPATIAL COMMISSION</h4>
                <p>
                  Every Studio Desire furniture piece and object can be custom tailored, 
                  scaled, and materialized for your residential or commercial interior.
                </p>
              </div>
              <button
                className="editorial-btn"
                onClick={() => {
                  onClose();
                  onContactClick();
                }}
              >
                Inquire About Custom Design →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Minimal Image Viewer */}
      {activeImageIndex !== null && allImages[activeImageIndex] && (
        <div
          className="product-image-lightbox"
          onClick={() => setActiveImageIndex(null)}
          role="dialog"
          aria-label="Image Viewer"
        >
          <button
            className="lightbox-close-btn"
            onClick={() => setActiveImageIndex(null)}
            aria-label="Close Image Viewer"
          >
            ✕
          </button>

          {allImages.length > 1 && (
            <>
              <button
                className="lightbox-nav-btn prev"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className="lightbox-nav-btn next"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          <div
            className="lightbox-content-box"
            onClick={(e) => e.stopPropagation()}
          >
            <StudioImage
              src={allImages[activeImageIndex].url}
              alt={allImages[activeImageIndex].caption}
              className="lightbox-img"
              fallbackSrc="/uploads/projects/placeholder.webp"
              showMissingState={false}
            />
            {allImages[activeImageIndex].caption && (
              <p className="lightbox-caption">
                {allImages[activeImageIndex].caption}
                <span className="lightbox-counter">
                  {activeImageIndex + 1} / {allImages.length}
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
