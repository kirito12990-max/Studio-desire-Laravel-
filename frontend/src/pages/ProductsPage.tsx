import React, { useState, useEffect } from "react";
import { ProductSummary } from "../types/product";
import { ProductService } from "../services/productService";
import { ProductFilters } from "../components/ProductFilters";
import { ProductGrid } from "../components/ProductGrid";

interface ProductsPageProps {
  onSelectProduct: (slug: string) => void;
  onProductsLoaded?: (products: ProductSummary[]) => void;
  onNavigateContact: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onSelectProduct,
  onProductsLoaded,
  onNavigateContact
}) => {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "ALL", "FURNITURE", "SEATING", "TABLES", "STORAGE", "BEDS", "LIGHTING", "CUSTOM"
  ]);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch distinct categories on mount
  useEffect(() => {
    ProductService.getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(() => {
        // Fallback default categories
      });
  }, []);

  // Fetch products whenever category changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ProductService.getProducts({ category: activeCategory })
      .then((res) => {
        if (isMounted) {
          setProducts(res.products);
          setLoading(false);
          if (onProductsLoaded) {
            onProductsLoaded(res.products);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load product archive");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  return (
    <div className="products-view sd-fade-in" style={{ paddingTop: "1.5rem" }}>
      {/* Controls & Grid */}
      <section className="archive-controls-section">
        <div className="container">
          <ProductFilters
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
            productCount={products.length}
          />

          {loading ? (
            <div className="state-container">
              <div className="loading-spinner"></div>
              <h3 className="state-title">Retrieving Product Archive...</h3>
              <p className="state-desc">Loading bespoke design objects and furniture editions.</p>
            </div>
          ) : error ? (
            <div className="state-container">
              <h3 className="state-title">Archive Unavailable</h3>
              <p className="state-desc">{error}</p>
              <button
                onClick={() => setActiveCategory("ALL")}
                className="editorial-btn"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <ProductGrid
              products={products}
              onSelectProduct={onSelectProduct}
            />
          )}

          {/* Subtle Bottom CTA */}
          <section className="archive-bottom-cta">
            <div className="bottom-cta-content">
              <span className="cta-eyebrow">CUSTOM EDITIONS & BESPOKE COMMISSIONS</span>
              <h2 className="cta-headline">INTERESTED IN A CUSTOM DESIGN?</h2>
              <p className="cta-sub">Let's discuss your space.</p>
              <button
                className="editorial-btn cta-action-btn"
                onClick={onNavigateContact}
              >
                CONTACT STUDIO DESIRE →
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
