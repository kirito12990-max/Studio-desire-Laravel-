import React from "react";
import { ProjectMedia } from "../types/project";
import { resolveMediaUrl } from "../utils/mediaResolver";

interface VideoViewerProps {
  media: ProjectMedia;
  fallbackPoster: string;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({ media, fallbackPoster }) => {
  const resolvedPoster = resolveMediaUrl(media.thumbnail_url || fallbackPoster);
  const resolvedVideo = resolveMediaUrl(media.url);

  return (
    <div className="modal-video-section">
      <div className="section-label">
        <span>Spatial Motion & Atmosphere</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--accent-warm)" }}>4K Walkthrough</span>
      </div>

      <div className="video-frame-wrapper">
        <video
          controls
          preload="metadata"
          poster={resolvedPoster}
          aria-label={media.alt_text || "Architectural interior spatial video walkthrough"}
        >
          <source src={resolvedVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {media.caption && <p className="video-caption">{media.caption}</p>}
    </div>
  );
};
