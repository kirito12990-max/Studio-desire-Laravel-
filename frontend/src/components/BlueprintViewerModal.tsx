import React, { useState, useEffect, useRef, useCallback } from "react";
import { BlueprintDrawing } from "../types/blueprint";
import { BlueprintService } from "../services/blueprintService";
import { StudioCloseButton } from "./StudioModal";
import { StudioImage } from "./StudioImage";

interface BlueprintViewerModalProps {
  drawing: BlueprintDrawing | null;
  drawingsList: BlueprintDrawing[];
  onClose: () => void;
  onNavigate: (drawing: BlueprintDrawing) => void;
}

export const BlueprintViewerModal: React.FC<BlueprintViewerModalProps> = ({
  drawing,
  drawingsList,
  onClose,
  onNavigate,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPdfEmbed, setShowPdfEmbed] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & position whenever drawing changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowPdfEmbed(false);
  }, [drawing?.id]);

  const currentIndex = drawing ? drawingsList.findIndex((d) => d.id === drawing.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < drawingsList.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(drawingsList[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, drawingsList, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(drawingsList[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, drawingsList, onNavigate]);

  const handleZoomIn = () => {
    setScale((prev: number) => Math.min(prev + 0.3, 4));
  };

  const handleZoomOut = () => {
    setScale((prev: number) => {
      const nextScale = Math.max(prev - 0.3, 1);
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!drawing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawing, handlePrev, handleNext, onClose]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (showPdfEmbed) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev: number) => Math.min(prev + 0.2, 4));
    } else {
      setScale((prev: number) => {
        const nextScale = Math.max(prev - 0.2, 1);
        if (nextScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return nextScale;
      });
    }
  };

  // Pan dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || showPdfEmbed) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1 || showPdfEmbed) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || showPdfEmbed) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || showPdfEmbed) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!drawing) return null;

  const isPdf = drawing.file_type.toLowerCase() === "pdf";
  const pdfUrl = BlueprintService.getPdfUrl(drawing.slug);

  return (
    <div
      ref={containerRef}
      className={`blueprint-viewer-overlay ${isFullscreen ? "is-fullscreen" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Technical Drawing: ${drawing.title}`}
    >
      {/* Top Controls Header */}
      <header className="blueprint-viewer-topbar">
        <div className="blueprint-viewer-titlegroup">
          <span className="blueprint-viewer-project">{drawing.project_name}</span>
          <span className="blueprint-viewer-divider">/</span>
          <span className="blueprint-viewer-drgtitle">{drawing.title}</span>
        </div>

        <div className="blueprint-viewer-actions">
          {/* Zoom Controls */}
          {!showPdfEmbed && (
            <div className="blueprint-zoom-controls" role="group" aria-label="Zoom controls">
              <button
                type="button"
                className="blueprint-ctrl-btn"
                onClick={handleZoomOut}
                disabled={scale <= 1}
                title="Zoom Out (-)"
                aria-label="Zoom out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                type="button"
                className="blueprint-zoom-pct"
                onClick={handleResetZoom}
                title="Reset Zoom (0)"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                className="blueprint-ctrl-btn"
                onClick={handleZoomIn}
                disabled={scale >= 4}
                title="Zoom In (+)"
                aria-label="Zoom in"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          )}

          {/* PDF toggles / actions */}
          {isPdf && (
            <div className="blueprint-pdf-actions">
              <button
                type="button"
                className={`blueprint-ctrl-btn blueprint-pdf-toggle-btn ${showPdfEmbed ? "is-active" : ""}`}
                onClick={() => setShowPdfEmbed(!showPdfEmbed)}
                title="Toggle PDF Document View"
              >
                {showPdfEmbed ? "SHOW DRAWING" : "EMBED PDF"}
              </button>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="blueprint-ctrl-btn blueprint-pdf-link-btn"
                title="Open PDF in new tab"
              >
                VIEW PDF ↗
              </a>

              <a
                href={pdfUrl}
                download={`${drawing.slug}.pdf`}
                className="blueprint-ctrl-btn blueprint-pdf-download-btn"
                title="Download PDF document"
              >
                DOWNLOAD ↓
              </a>
            </div>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            className="blueprint-ctrl-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            aria-label="Toggle fullscreen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isFullscreen ? (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              ) : (
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              )}
            </svg>
          </button>

          {/* Close Button */}
          <StudioCloseButton onClick={onClose} label="Close drawing viewer" darkSurface />
        </div>
      </header>

      {/* Main Drawing Canvas / Workspace */}
      <div
        className="blueprint-viewer-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {showPdfEmbed && isPdf ? (
          <div className="blueprint-pdf-embed-container">
            <iframe
              src={pdfUrl}
              title={drawing.title}
              className="blueprint-pdf-iframe"
            />
          </div>
        ) : (
          <div
            className="blueprint-drawing-stage"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
          >
            <StudioImage
              src={drawing.file_url}
              thumbnailSrc={drawing.thumbnail_url}
              alt={drawing.title}
              className="blueprint-fullscreen-img"
              draggable={false}
              showMissingState={true}
            />
          </div>
        )}

        {/* Previous / Next Arrow Controls */}
        {hasPrev && (
          <button
            type="button"
            className="blueprint-nav-arrow blueprint-arrow-prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Previous Drawing (←)"
            aria-label="Previous drawing"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            className="blueprint-nav-arrow blueprint-arrow-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Next Drawing (→)"
            aria-label="Next drawing"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Technical Title Block Overlay */}
      <footer className="blueprint-viewer-footer">
        <div className="blueprint-footer-primary">
          <div className="blueprint-footer-sheetindex">
            {(currentIndex + 1).toString().padStart(2, "0")} /{" "}
            {drawingsList.length.toString().padStart(2, "0")}
          </div>

          <div className="blueprint-footer-specs">
            <span className="blueprint-foot-type">{drawing.drawing_type}</span>
            {drawing.room_area && (
              <span className="blueprint-foot-area">| {drawing.room_area}</span>
            )}
            {drawing.description && (
              <p className="blueprint-foot-desc">{drawing.description}</p>
            )}
          </div>
        </div>

        {/* Technical Data Stamp */}
        <div className="blueprint-footer-stamp">
          {drawing.drawing_number && (
            <div className="blueprint-stamp-cell">
              <span className="blueprint-stamp-lbl">DRG NO</span>
              <span className="blueprint-stamp-val">{drawing.drawing_number}</span>
            </div>
          )}

          {drawing.revision && (
            <div className="blueprint-stamp-cell">
              <span className="blueprint-stamp-lbl">REV</span>
              <span className="blueprint-stamp-val">{drawing.revision}</span>
            </div>
          )}

          {drawing.scale && (
            <div className="blueprint-stamp-cell">
              <span className="blueprint-stamp-lbl">SCALE</span>
              <span className="blueprint-stamp-val">{drawing.scale}</span>
            </div>
          )}

          {drawing.date && (
            <div className="blueprint-stamp-cell">
              <span className="blueprint-stamp-lbl">DATE</span>
              <span className="blueprint-stamp-val">{drawing.date}</span>
            </div>
          )}

          {drawing.sheet_size && (
            <div className="blueprint-stamp-cell">
              <span className="blueprint-stamp-lbl">SHEET</span>
              <span className="blueprint-stamp-val">{drawing.sheet_size}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
