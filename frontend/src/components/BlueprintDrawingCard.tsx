import React from "react";
import { BlueprintDrawing } from "../types/blueprint";
import { StudioImage } from "./StudioImage";

interface BlueprintDrawingCardProps {
  drawing: BlueprintDrawing;
  index: number;
  onSelect: (drawing: BlueprintDrawing) => void;
}

export const BlueprintDrawingCard: React.FC<BlueprintDrawingCardProps> = ({
  drawing,
  index,
  onSelect,
}) => {
  const isPdf = drawing.file_type.toLowerCase() === "pdf";
  const sheetIndex = (index + 1).toString().padStart(2, "0");

  return (
    <article className="blueprint-card" onClick={() => onSelect(drawing)}>
      {/* Drawing Preview Container */}
      <div className="blueprint-card-media-wrapper">
        <div className="blueprint-sheet-badge">
          <span className="blueprint-badge-type">{drawing.drawing_type}</span>
          {isPdf && <span className="blueprint-badge-pdf">PDF</span>}
        </div>

        <StudioImage
          src={drawing.file_url}
          thumbnailSrc={drawing.thumbnail_url}
          alt={drawing.title}
          className="blueprint-card-img"
          loading="lazy"
          showMissingState={true}
        />

        <div className="blueprint-card-hover-overlay">
          <span className="blueprint-inspect-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            INSPECT DRAWING
          </span>
        </div>
      </div>

      {/* Technical Title Block */}
      <div className="blueprint-card-titleblock">
        <div className="blueprint-titleblock-top">
          <span className="blueprint-card-index">{sheetIndex}</span>
          <div className="blueprint-card-titles">
            <h3 className="blueprint-card-title">{drawing.title}</h3>
            {drawing.room_area && (
              <span className="blueprint-card-area">{drawing.room_area}</span>
            )}
          </div>
        </div>

        {/* Technical Data Stamps */}
        <div className="blueprint-metadata-grid">
          {drawing.drawing_number && (
            <div className="blueprint-meta-item">
              <span className="blueprint-meta-k">DRG NO</span>
              <span className="blueprint-meta-v">{drawing.drawing_number}</span>
            </div>
          )}

          {drawing.revision && (
            <div className="blueprint-meta-item">
              <span className="blueprint-meta-k">REV</span>
              <span className="blueprint-meta-v">{drawing.revision}</span>
            </div>
          )}

          {drawing.scale && (
            <div className="blueprint-meta-item">
              <span className="blueprint-meta-k">SCALE</span>
              <span className="blueprint-meta-v">{drawing.scale}</span>
            </div>
          )}

          {drawing.date && (
            <div className="blueprint-meta-item">
              <span className="blueprint-meta-k">DATE</span>
              <span className="blueprint-meta-v">{drawing.date}</span>
            </div>
          )}

          {drawing.sheet_size && (
            <div className="blueprint-meta-item">
              <span className="blueprint-meta-k">SHEET</span>
              <span className="blueprint-meta-v">{drawing.sheet_size}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
