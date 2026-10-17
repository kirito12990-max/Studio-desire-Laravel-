/**
 * Studio Desire — Centralized Frontend API Configuration
 *
 * Supports development, staging, and production environments via VITE_API_URL.
 * Gracefully strips trailing slashes to prevent malformed URL queries.
 */

const rawApiUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim() : "";

// Normalized base URL without trailing slash (e.g. "http://localhost:8000" or empty for relative proxy)
export const API_BASE_URL: string = rawApiUrl.replace(/\/+$/, "");

// API base URL including /api prefix
export const API_BASE: string = API_BASE_URL ? `${API_BASE_URL}/api` : "/api";

/**
 * Builds a clean, fully-qualified API URL for a given relative endpoint.
 *
 * Examples:
 *   buildApiUrl("/projects") -> "http://localhost:8000/api/projects" or "/api/projects"
 *   buildApiUrl("/api/projects") -> "http://localhost:8000/api/projects" or "/api/projects"
 */
export function buildApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (clean.startsWith("/api/")) {
    return API_BASE_URL ? `${API_BASE_URL}${clean}` : clean;
  }
  return `${API_BASE}${clean}`;
}
