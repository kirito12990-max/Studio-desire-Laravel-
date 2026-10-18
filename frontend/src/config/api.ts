/**
 * Studio Desire — Centralized Frontend API Configuration
 *
 * Supports same-origin (relative /api) and cross-origin environments via VITE_API_URL.
 * When running in a browser, same-origin relative URLs (/api) are preferred whenever
 * the frontend is served from the same server or when localhost/127.0.0.1 ports match.
 * This guarantees reliable authentication cookies and eliminates CORS issues.
 */

function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim() : "";
  if (!envUrl) {
    return "";
  }

  // If running in browser and the URL matches the current origin or local dev host, use relative paths
  if (typeof window !== "undefined" && window.location) {
    try {
      const parsed = new URL(envUrl, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return "";
      }
      const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1";
      if (isLocalHost(parsed.hostname) && isLocalHost(window.location.hostname) && parsed.port === window.location.port) {
        return "";
      }
    } catch {
      // Invalid URL string; fall back to relative
      return "";
    }
  }

  return envUrl.replace(/\/+$/, "");
}

// Normalized base URL without trailing slash (empty string "" for relative same-origin deployment)
export const API_BASE_URL: string = resolveBaseUrl();

// API base URL including /api prefix
export const API_BASE: string = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

/**
 * Builds a clean, fully-qualified or relative API URL for a given endpoint.
 *
 * Examples:
 *   buildApiUrl("/projects")     -> "/api/projects" (or "https://api.studiodesire.com/api/projects")
 *   buildApiUrl("/api/projects") -> "/api/projects" (or "https://api.studiodesire.com/api/projects")
 */
export function buildApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (clean.startsWith("/api/")) {
    return API_BASE_URL ? `${API_BASE_URL}${clean}` : clean;
  }
  return `${API_BASE}${clean}`;
}
