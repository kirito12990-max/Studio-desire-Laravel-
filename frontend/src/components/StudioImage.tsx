import React, { useState, useEffect } from "react";
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_IMAGE } from "../utils/mediaResolver";

export interface StudioImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  thumbnailSrc?: string | null;
  fallbackSrc?: string;
  showMissingState?: boolean;
}

/**
 * StudioImage — Centralized Resilient Image Loader Component
 *
 * Capabilities:
 * 1. Automatic URL resolution via resolveMediaUrl.
 * 2. Two-stage graceful fallback:
 *    - Tries `thumbnailSrc` if provided.
 *    - If `thumbnailSrc` fails to load, gracefully falls back to `src`.
 *    - If `src` fails (or no original is available), switches to `fallbackSrc`.
 * 3. Prevents infinite image error loops via state flags.
 * 4. Preserves all native <img> props, styles, object-fit, and accessibility attributes.
 */
export const StudioImage: React.FC<StudioImageProps> = ({
  src,
  thumbnailSrc,
  alt = "",
  className = "",
  style,
  loading = "lazy",
  fallbackSrc = DEFAULT_PLACEHOLDER_IMAGE,
  showMissingState = false,
  onError,
  ...props
}) => {
  // Compute initial target URL
  const initialUrl = thumbnailSrc ? resolveMediaUrl(thumbnailSrc) : resolveMediaUrl(src);
  const primaryResolved = resolveMediaUrl(src);
  const defaultFallback = resolveMediaUrl(fallbackSrc) || DEFAULT_PLACEHOLDER_IMAGE;

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl || defaultFallback);
  const [triedOriginal, setTriedOriginal] = useState(false);
  const [isBroken, setIsBroken] = useState(!initialUrl);

  useEffect(() => {
    const nextStart = thumbnailSrc ? resolveMediaUrl(thumbnailSrc) : resolveMediaUrl(src);
    setCurrentSrc(nextStart || defaultFallback);
    setTriedOriginal(false);
    setIsBroken(!nextStart);
  }, [src, thumbnailSrc, defaultFallback]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Stage 1: If thumbnail was used and failed, try original full-res src
    if (thumbnailSrc && !triedOriginal && primaryResolved && primaryResolved !== currentSrc) {
      setTriedOriginal(true);
      setCurrentSrc(primaryResolved);
      return;
    }

    // Stage 2: Mark as broken
    setIsBroken(true);

    // Switch to fallback placeholder once if not already on it
    if (currentSrc !== defaultFallback) {
      setCurrentSrc(defaultFallback);
    }

    if (onError) {
      onError(e);
    }
  };

  if (isBroken && showMissingState) {
    return (
      <div
        className={`studio-img-missing ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#18181b",
          border: "1px dashed #3f3f46",
          color: "#a1a1aa",
          width: "100%",
          height: "100%",
          minHeight: "120px",
          boxSizing: "border-box",
          padding: "0.75rem",
          textAlign: "center",
          ...style
        }}
        title={`Asset unavailable: ${alt || src || "No URL"}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.6, marginBottom: "0.35rem" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" strokeWidth="2" />
        </svg>
        <span style={{ fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.05em", color: "#e4e4e7" }}>
          IMAGE MISSING
        </span>
        {alt && (
          <span style={{ fontSize: "0.58rem", opacity: 0.7, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
            {alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={`studio-img ${isBroken ? "studio-img-fallback" : ""} ${className}`}
      style={style}
      loading={loading}
      onError={handleError}
    />
  );
};

export default StudioImage;
