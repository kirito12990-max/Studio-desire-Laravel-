import { API_BASE_URL } from "../config/api";

export const DEFAULT_PLACEHOLDER_IMAGE = "/placeholder.svg";

/**
 * Studio Desire — Centralized Media URL Resolver
 *
 * Reliably normalizes media asset paths across development, staging, and production.
 *
 * Rules:
 * 1. Empty / null / undefined -> returns empty string or custom fallback.
 * 2. Absolute HTTP/HTTPS URLs -> preserved untouched (validated against dangerous schemes).
 * 3. Client-side preview URLs (blob:, data:image/) -> preserved untouched.
 * 4. Local uploads (/uploads/... or uploads/...) ->
 *    - Replaces backslashes with forward slashes.
 *    - Deduplicates repeated prefixes (/uploads/uploads/...).
 *    - Ensures root-relative path (/uploads/...).
 *    - If API_BASE_URL is configured (separate backend host), prefixes API_BASE_URL.
 *    - If API_BASE_URL is empty (same-origin / dev proxy), retains root-relative path.
 * 5. Rejects dangerous protocols (javascript:, file:, vbscript:).
 */
export function resolveMediaUrl(
  url?: string | null,
  fallback: string = ""
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();

  // Security: reject dangerous schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return fallback || DEFAULT_PLACEHOLDER_IMAGE;
  }

  // Preserve safe client-side blob & data preview schemes
  if (lower.startsWith("blob:") || lower.startsWith("data:image/")) {
    return trimmed;
  }

  // Strip hardcoded localhost / 127.0.0.1 development origins so URLs become canonical relative
  let normalized = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?=\/)/i, "");

  // Preserve valid absolute external HTTP/HTTPS URLs (e.g. CDN)
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  // Normalize Windows backslashes
  let cleanPath = normalized.replace(/\\+/g, "/");

  // Strip duplicate leading slashes and ensure single leading slash
  cleanPath = cleanPath.replace(/^\/+/, "/");
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  // Deduplicate repeated path segments
  cleanPath = cleanPath.replace(/\/uploads\/uploads\//g, "/uploads/");
  cleanPath = cleanPath.replace(/\/storage\/storage\//g, "/storage/");

  // When API_BASE_URL is configured (e.g. separate backend origin in dev mode),
  // prefix backend origin to root-relative media paths (/uploads/ or /storage/)
  if (API_BASE_URL && (cleanPath.startsWith("/uploads/") || cleanPath.startsWith("/storage/"))) {
    return `${API_BASE_URL}${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Helper to determine if a media URL points to an active valid file.
 */
export function isValidMediaUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("javascript:") &&
    !trimmed.startsWith("file:")
  );
}
