import React, { useState } from "react";
import { VisualizationSpace, ActiveRenderView, RenderImageItem } from "../types/visualization";
import { VisualizationService } from "../services/visualizationService";
import { StudioImage } from "./StudioImage";

interface RenderSpaceCardProps {
  space: VisualizationSpace;
  index: number;
  onOpenLightbox: (view: ActiveRenderView) => void;
  onOpenRenderQr?: (info: { title: string; projectName: string; roomName: string; vrUrl: string }) => void;
}

export const RenderSpaceCard: React.FC<RenderSpaceCardProps> = ({
  space,
  index,
  onOpenLightbox,
  onOpenRenderQr
}) => {
  const [qrError, setQrError] = useState(false);

  // Compile all images in this space for lightbox sequence
  const allImages = React.useMemo<RenderImageItem[]>(() => {
    const list: RenderImageItem[] = [
      {
        url: space.cover_image,
        caption: space.description || `${space.title} — Primary Spatial View`,
        angle: "Primary Perspective",
        vr_url: space.vr_url,
        has_vr: space.has_vr
      }
    ];

    if (space.media && space.media.length > 0) {
      space.media.forEach((m) => {
        list.push({
          url: m.url,
          caption: m.caption || "",
          angle: m.angle || "Detail Perspective",
          vr_url: m.vr_url,
          has_vr: m.has_vr
        });
      });
    }

    return list;
  }, [space]);

  const handleImageClick = (imgIndex: number) => {
    const selected = allImages[imgIndex];
    onOpenLightbox({
      url: selected.url,
      caption: selected.caption,
      angle: selected.angle,
      spaceTitle: space.title,
      projectName: space.project_name,
      room: space.room,
      index: imgIndex,
      totalInSpace: allImages.length,
      vr_url: selected.vr_url,
      has_vr: selected.has_vr,
      allImagesInSpace: allImages
    });
  };

  const roomQrCodeUrl = (space.has_vr && space.vr_url)
    ? VisualizationService.getDynamicQrUrl(space.vr_url)
    : null;

  return (
    <article className="render-space-block" id={`space-${space.slug}`}>
      {/* Space Section Header */}
      <div className="space-header-row">
        <div className="space-title-meta">
          <div className="space-tag-line">
            <span className="space-project-name">{space.project_name}</span>
            <span className="space-divider-dot">·</span>
            <span className="space-room-badge">{space.room}</span>
            {space.location && (
              <>
                <span className="space-divider-dot">·</span>
                <span className="space-location">{space.location}</span>
              </>
            )}
          </div>
          <h2 className="space-title">{space.title}</h2>
        </div>

        <div className="space-counter-tag">
          <span>VOLUME 0{index + 1}</span>
        </div>
      </div>

      {/* Editorial Asymmetric Visual Layout */}
      <div className="space-layout-grid">
        {/* Left / Top Primary Large Render */}
        <div className="primary-render-col">
          <div
            className="render-image-wrapper primary-render-frame"
            onClick={() => handleImageClick(0)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleImageClick(0)}
            aria-label={`Enlarge primary render: ${space.title}`}
          >
            <StudioImage
              src={space.cover_image}
              alt={`${space.project_name} ${space.room} — Primary 3D Visualization`}
              className="render-img primary-img"
              loading="lazy"
              fallbackSrc="/uploads/projects/placeholder.webp"
              showMissingState={false}
            />
            <div className="render-overlay-badge">
              <span className="render-view-pill">Primary Perspective · Click to View Fullscreen</span>
            </div>
          </div>

          {space.description && (
            <div className="space-narrative">
              <p>{space.description}</p>
            </div>
          )}
        </div>

        {/* Right / Secondary Perspective Renders & VR QR Area */}
        <div className="secondary-render-col">
          {/* Secondary Renders */}
          {space.media && space.media.length > 0 && (
            <div className="secondary-renders-grid">
              {space.media.map((item, mIdx) => (
                <div key={item.id} className="secondary-render-card">
                  <div
                    className="render-image-wrapper secondary-render-frame"
                    onClick={() => handleImageClick(mIdx + 1)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleImageClick(mIdx + 1)}
                    aria-label={item.caption || `View secondary render angle ${item.angle}`}
                  >
                    <StudioImage
                      src={item.url}
                      alt={item.caption || `${space.room} perspective`}
                      className="render-img secondary-img"
                      loading="lazy"
                      fallbackSrc="/uploads/projects/placeholder.webp"
                      showMissingState={false}
                    />
                    <div className="secondary-render-tag">
                      <span>{item.angle || `Angle 0${mIdx + 1}`}</span>
                    </div>
                  </div>

                  {/* Level 3: Individual Render VR Contextual Option */}
                  {item.has_vr && item.vr_url && (
                    <div className="render-vr-context-strip">
                      <div className="render-vr-tag-row">
                        <span className="render-vr-pulse-dot"></span>
                        <span className="render-vr-label">VR AVAILABLE</span>
                      </div>
                      <div className="render-vr-action-buttons">
                        {onOpenRenderQr && (
                          <button
                            type="button"
                            className="render-vr-scan-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRenderQr({
                                title: item.caption || `${space.room} — ${item.angle || 'Render 0' + (mIdx + 1)}`,
                                projectName: space.project_name,
                                roomName: space.room,
                                vrUrl: item.vr_url!
                              });
                            }}
                            title="Scan QR code with your phone camera"
                          >
                            <span>⊞ Scan QR</span>
                          </button>
                        )}
                        <a
                          href={item.vr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="render-vr-open-link"
                          onClick={(e) => e.stopPropagation()}
                          title={`Open ${item.angle || 'render'} VR experience in new tab`}
                        >
                          <span>Open VR ↗</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Level 2: Room-Specific VR Experience Panel */}
          {space.has_vr && space.vr_url ? (
            <div className="vr-experience-panel">
              <div className="vr-active-card room-vr-card">
                <div className="vr-card-header">
                  <div className="vr-indicator-pulse"></div>
                  <span className="vr-eyebrow">ROOM VR PORTAL</span>
                </div>
                <h3 className="vr-card-title">EXPLORE THIS ROOM IN VR</h3>

                <div className="vr-qr-frame">
                  {roomQrCodeUrl && !qrError ? (
                    <div className="qr-svg-container">
                      <img
                        src={roomQrCodeUrl}
                        alt={`QR code for VR room experience: ${space.title}`}
                        className="qr-svg-image"
                        onError={() => setQrError(true)}
                      />
                    </div>
                  ) : (
                    <div className="qr-fallback-box">
                      <span>VR LINK CONFIGURED</span>
                    </div>
                  )}
                </div>

                <p className="vr-instructions">
                  Scan with your phone camera to launch the interactive {space.room.toLowerCase()} VR experience.
                </p>

                {/* Direct Action for Mobile / Immediate Access */}
                <a
                  href={space.vr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vr-direct-link-btn"
                  title={`Open interactive 3D VR portal for ${space.room}`}
                >
                  <span>Open Room VR ↗</span>
                </a>
              </div>

              {/* Room Technical Specifications */}
              <div className="space-specs-card">
                <div className="spec-row">
                  <span className="spec-name">ROOM</span>
                  <span className="spec-val">{space.room}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-name">PROJECT</span>
                  <span className="spec-val">{space.project_name}</span>
                </div>
                {space.software && (
                  <div className="spec-row">
                    <span className="spec-name">CALIBRATION</span>
                    <span className="spec-val">{space.software}</span>
                  </div>
                )}
                <div className="spec-row">
                  <span className="spec-name">YEAR</span>
                  <span className="spec-val">{space.year}</span>
                </div>
              </div>
            </div>
          ) : (
            /* When no room VR URL exists: omit VR block cleanly, only show technical specs if desirable */
            <div className="vr-experience-panel room-no-vr">
              <div className="space-specs-card">
                <div className="spec-row">
                  <span className="spec-name">ROOM</span>
                  <span className="spec-val">{space.room}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-name">PROJECT</span>
                  <span className="spec-val">{space.project_name}</span>
                </div>
                {space.software && (
                  <div className="spec-row">
                    <span className="spec-name">CALIBRATION</span>
                    <span className="spec-val">{space.software}</span>
                  </div>
                )}
                <div className="spec-row">
                  <span className="spec-name">YEAR</span>
                  <span className="spec-val">{space.year}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
