import React, { useState, useEffect } from "react";
import { ProjectMedia } from "../types/project";
import { VisualizationService } from "../services/visualizationService";
import { StudioImage } from "./StudioImage";

interface GalleryViewerProps {
  mediaList: ProjectMedia[];
  projectTitle: string;
  initialLightboxIndex?: number | null;
  onCloseLightbox?: () => void;
  hideInlineStack?: boolean;
}

export const GalleryViewer: React.FC<GalleryViewerProps> = ({
  mediaList,
  projectTitle,
  initialLightboxIndex = null,
  onCloseLightbox,
  hideInlineStack = false
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(initialLightboxIndex);
  const [showImageQr, setShowImageQr] = useState<boolean>(false);

  // Sync with external initialLightboxIndex
  useEffect(() => {
    if (initialLightboxIndex !== null && initialLightboxIndex !== undefined) {
      setLightboxIndex(initialLightboxIndex);
      setShowImageQr(false);
    }
  }, [initialLightboxIndex]);

  const images = mediaList.filter((m) => m.media_type === "image");

  const closeLightbox = () => {
    setLightboxIndex(null);
    setShowImageQr(false);
    if (onCloseLightbox) onCloseLightbox();
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        if (showImageQr) {
          setShowImageQr(false);
        } else {
          closeLightbox();
        }
      }
      if (e.key === "ArrowLeft") {
        setShowImageQr(false);
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === "ArrowRight") {
        setShowImageQr(false);
        setLightboxIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, images.length, showImageQr]);

  if (images.length === 0) return null;

  const currentImg = lightboxIndex !== null && images[lightboxIndex] ? images[lightboxIndex] : null;
  const currentQrUrl = currentImg?.vr_url ? VisualizationService.getDynamicQrUrl(currentImg.vr_url) : null;

  return (
    <>
      {/* Optional In-Page Gallery Stack */}
      {!hideInlineStack && (
        <div className="modal-gallery-section">
          <div className="section-label">
            <span>Archival Photo Gallery</span>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Click plate to expand</span>
          </div>

          <div className="gallery-stack">
            {images.map((img, idx) => (
              <figure
                key={img.id || idx}
                className="gallery-item"
                onClick={() => {
                  setLightboxIndex(idx);
                  setShowImageQr(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightboxIndex(idx);
                    setShowImageQr(false);
                  }
                }}
                aria-label={`Open photo ${idx + 1} of ${images.length} in fullscreen`}
              >
                <div className="gallery-item-image-wrapper">
                  <StudioImage
                    src={img.url}
                    thumbnailSrc={img.thumbnail_url}
                    alt={img.alt_text || `${projectTitle} - Space Detail ${idx + 1}`}
                    loading="lazy"
                    fallbackSrc="/uploads/projects/placeholder.webp"
                    showMissingState={false}
                  />
                  {img.has_vr && (
                    <span className="gallery-vr-badge" title="Has 360° VR Experience">
                      VR
                    </span>
                  )}
                </div>
                <figcaption className="gallery-caption">
                  <span>{img.caption || `${projectTitle} — Archival view`}</span>
                  <span className="gallery-index">
                    0{idx + 1} / 0{images.length}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxIndex !== null && currentImg && (
        <div
          className="lightbox-backdrop open"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen photo viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <button
            className="lightbox-close-btn"
            onClick={closeLightbox}
            aria-label="Close fullscreen view"
          >
            ✕
          </button>

          <button
            className="lightbox-nav-btn lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              setShowImageQr(false);
              setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
            }}
            aria-label="Previous photo"
          >
            ←
          </button>

          <button
            className="lightbox-nav-btn lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              setShowImageQr(false);
              setLightboxIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next photo"
          >
            →
          </button>

          <div className="lightbox-content-box">
            <StudioImage
              src={currentImg.url}
              thumbnailSrc={currentImg.thumbnail_url}
              alt={currentImg.alt_text || projectTitle}
              className="lightbox-image"
              fallbackSrc="/uploads/projects/placeholder.webp"
              showMissingState={false}
            />

            {/* Optional Scannable QR Code Overlay */}
            {showImageQr && currentQrUrl && (
              <div className="lightbox-qr-overlay" onClick={() => setShowImageQr(false)}>
                <div className="lightbox-qr-card" onClick={(e) => e.stopPropagation()}>
                  <button className="lightbox-qr-close" onClick={() => setShowImageQr(false)}>✕</button>
                  <div className="lightbox-qr-tag">GENUINE VR QR CODE</div>
                  <div className="lightbox-qr-img-box">
                    <img src={currentQrUrl} alt="Scannable VR QR" className="lightbox-qr-svg" />
                  </div>
                  <div className="lightbox-qr-caption">
                    Scan with your phone to open VR for this viewpoint
                  </div>
                  <div className="lightbox-qr-url-text">{currentImg.vr_url}</div>
                  <div className="lightbox-qr-actions">
                    <a
                      href={currentImg.vr_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lightbox-vr-launch-btn"
                    >
                      Open Destination ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="lightbox-caption-bar">
              <div className="lightbox-caption-meta">
                <span className="lightbox-caption-text">
                  {currentImg.caption || `${projectTitle} Archival Plate`}
                </span>
                <span className="lightbox-index-text">
                  0{lightboxIndex + 1} / 0{images.length}
                </span>
              </div>

              {/* Action Buttons: VR & QR */}
              {currentImg.vr_url && (
                <div className="lightbox-action-buttons">
                  <a
                    href={currentImg.vr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lightbox-action-btn vr-btn"
                    title="Launch dedicated 360° VR experience for this viewpoint"
                  >
                    <span>EXPLORE IN VR ↗</span>
                  </a>
                  {currentImg.show_qr && (
                    <button
                      className="lightbox-action-btn qr-btn"
                      onClick={() => setShowImageQr(!showImageQr)}
                      title="Show scannable QR code for phone viewing"
                    >
                      <span>{showImageQr ? "HIDE QR" : "SCAN QR"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
