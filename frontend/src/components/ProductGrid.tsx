import React from "react";
import { ProductSummary } from "../types/product";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: ProductSummary[];
  onSelectProduct: (slug: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onSelectProduct
}) => {
  if (products.length === 0) {
    return (
      <div className="empty-archive">
        <p className="empty-title">NO OBJECTS IN THIS ARCHIVE CATEGORY</p>
        <p className="empty-subtitle">Studio Desire creates bespoke editions across furniture, lighting, and interior objects.</p>
      </div>
    );
  }

  return (
    <div className="product-grid" id="productGridArchive">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          onSelectProduct={onSelectProduct}
        />
      ))}
    </div>
  );
};
