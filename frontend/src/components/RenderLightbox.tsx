import React, { useEffect } from "react";
import { ActiveRenderView } from "../types/visualization";
import { StudioCloseButton } from "./StudioModal";
import { StudioImage } from "./StudioImage";

interface RenderLightboxProps {
  activeRender: ActiveRenderView | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const RenderLightbox: React.FC<RenderLightboxProps> = ({
  activeRender,
  onClose,
  onPrev,
  onNext
}) => {
  useEffect(() => {
    if (!activeRender) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeRender, onClose, onPrev, onNext]);

  if (!activeRender) return null;

  return (
    <div
      className="render-lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="3D Render Fullscreen Viewer"
    >
      {/* Top Bar */}
      <div className="render-lightbox-top-bar" onClick={(e) => e.stopPropagation()}>
        <div className="render-lightbox-info">
          <span className="render-lightbox-project">{activeRender.projectName}</span>
          <span className="render-lightbox-sep">/</span>
          <span className="render-lightbox-room">{activeRender.room}</span>
          {activeRender.angle && (
            <>
              <span className="render-lightbox-sep">·</span>
              <span className="render-lightbox-angle">{activeRender.angle}</span>
            </>
          )}
        </div>

        <div className="render-lightbox-counter-area">
          {activeRender.has_vr && activeRender.vr_url && (
            <a
              href={activeRender.vr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="render-lightbox-vr-btn"
              title="Open Interactive 3D/VR Experience"
            >
              <span>Explore VR ↗</span>
            </a>
          )}
          <span className="render-lightbox-counter">
            {activeRender.index + 1} / {activeRender.totalInSpace}
          </span>
          <StudioCloseButton onClick={onClose} label="Close Fullscreen Viewer" darkSurface />
        </div>
      </div>

      {/* Navigation Arrows */}
      {activeRender.totalInSpace > 1 && (
        <>
          <button
            className="render-nav-arrow prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous Render (Left Arrow)"
            title="Previous (Left Arrow)"
          >
            ‹
          </button>
          <button
            className="render-nav-arrow next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next Render (Right Arrow)"
            title="Next (Right Arrow)"
          >
            ›
          </button>
        </>
      )}

      {/* Main Render Image */}
      <div className="render-lightbox-image-box" onClick={(e) => e.stopPropagation()}>
        <StudioImage
          src={activeRender.url}
          alt={`${activeRender.projectName} — ${activeRender.room} 3D Visualization`}
          className="render-lightbox-img"
          fallbackSrc="/uploads/projects/placeholder.webp"
          showMissingState={false}
        />
        {activeRender.caption && (
          <div className="render-lightbox-caption">
            <p>{activeRender.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};
