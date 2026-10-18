import { API_BASE, API_BASE_URL } from "../config/api";
import { AuthUser, LoginResponse, UserRole } from "../types/user";

export type { AuthUser, LoginResponse, UserRole };

// Session storage key for non-sensitive user metadata (display username, role)
// Tokens are strictly stored in HttpOnly cookies and NEVER stored in localStorage or sessionStorage.
const USER_SESSION_KEY = "sd_owner_user_session";
const LEGACY_TOKEN_KEY = "sd_owner_token";
const LEGACY_USER_KEY = "sd_owner_user";

let inMemoryUser: AuthUser | null = null;
let inMemoryCsrfToken: string | null = null;
let isLoginInProgress = false;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

export function formatAuthErrorMessage(res: Response, data?: any): string {
  if (res.status === 419) {
    return "CSRF token mismatch or session expired (HTTP 419). Please refresh and try again.";
  }
  if (res.status === 429) {
    const retry = data?.retry_after ? ` Please try again in ${data.retry_after} seconds.` : " Please try again shortly.";
    return (data?.message || "Too many login attempts.") + retry;
  }
  if (res.status === 401) {
    return data?.message || data?.detail || "Invalid credentials or inactive account.";
  }
  if (res.status === 403) {
    return data?.message || data?.detail || "Access denied. Insufficient permissions.";
  }
  if (res.status === 422) {
    if (data?.errors && typeof data.errors === "object") {
      const firstField = Object.keys(data.errors)[0];
      if (firstField && Array.isArray(data.errors[firstField]) && data.errors[firstField].length > 0) {
        return data.errors[firstField][0];
      }
    }
    return data?.message || data?.detail || "Validation failed. Please verify submitted credentials.";
  }
  if (res.status >= 500) {
    return `Server error encountered (HTTP ${res.status}). Please check server logs or try again.`;
  }
  return data?.message || data?.detail || `Authentication request failed with status ${res.status}.`;
}

export const authService = {
  /**
   * Deprecated token getter.
   * Authentication credentials are now securely stored exclusively in HttpOnly cookies.
   * Returns null to prevent JavaScript token exposure.
   */
  getToken(): string | null {
    return null;
  },

  /**
   * Retrieves current authenticated user metadata.
   */
  getUser(): AuthUser | null {
    if (inMemoryUser) return inMemoryUser;
    if (typeof window === "undefined" || !window.sessionStorage) return null;

    const raw = window.sessionStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    try {
      inMemoryUser = JSON.parse(raw);
      return inMemoryUser;
    } catch {
      return null;
    }
  },

  /**
   * Returns true if a user session is active.
   */
  isAuthenticated(): boolean {
    return !!this.getUser();
  },

  /**
   * Resolves the active CSRF protection token.
   * Reads from memory cache, client-readable cookie, or falls back to server query.
   */
  getCsrfToken(): string | null {
    if (inMemoryCsrfToken) return inMemoryCsrfToken;
    const fromCookie = readCookie("csrf_token");
    if (fromCookie) {
      inMemoryCsrfToken = fromCookie;
      return fromCookie;
    }
    return null;
  },

  /**
   * Generates request headers for state-changing operations including CSRF protection.
   */
  getCsrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.getCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
    const xsrf = readCookie("XSRF-TOKEN");
    if (xsrf) {
      headers["X-XSRF-TOKEN"] = xsrf;
    }
    return headers;
  },

  /**
   * Fetches or refreshes CSRF token from the server.
   */
  async refreshCsrfToken(): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf-token`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.csrf_token) {
          inMemoryCsrfToken = data.csrf_token;
          return data.csrf_token;
        }
      }
    } catch {
      // Ignore network errors on passive fetch
    }
    return this.getCsrfToken() || "";
  },

  /**
   * Mandatory Sanctum SPA CSRF handshake before submitting authentication credentials.
   * Calls GET /sanctum/csrf-cookie followed by GET /api/auth/csrf-token.
   */
  async ensureCsrfHandshake(): Promise<string> {
    try {
      await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // Allow fallback if same-origin doesn't require separate sanctum endpoint
    }

    try {
      const res = await fetch(`${API_BASE}/auth/csrf-token`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.csrf_token) {
          inMemoryCsrfToken = data.csrf_token;
          return data.csrf_token;
        }
      }
    } catch {
      // Ignore network errors on passive handshake
    }

    return this.getCsrfToken() || "";
  },

  /**
   * Sets local user session metadata (without storing raw JWTs).
   */
  setSession(data: LoginResponse): void {
    // Purge any obsolete/legacy localStorage tokens
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch {
      // Ignore storage restrictions
    }

    if (data.csrf_token) {
      inMemoryCsrfToken = data.csrf_token;
    }

    const user: AuthUser = {
      id: data.user_id,
      username: data.username,
      role: data.role,
      must_change_password: data.must_change_password
    };

    inMemoryUser = user;
    try {
      window.sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch {
      // Memory state persists in runtime
    }
  },

  /**
   * Clears active session state locally and purges legacy credentials.
   */
  clearSession(): void {
    inMemoryUser = null;
    inMemoryCsrfToken = null;
    try {
      window.sessionStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Authenticates user against backend and initializes HttpOnly cookie session.
   * Enforces CSRF handshake, credentialed transport, and post-login session verification.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    if (isLoginInProgress) {
      throw new Error("A login request is already in progress. Please wait.");
    }

    isLoginInProgress = true;
    try {
      // 1. Mandatory CSRF handshake prior to login
      await this.ensureCsrfHandshake();

      // 2. Prepare headers with both X-CSRF-TOKEN and X-XSRF-TOKEN
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const csrf = this.getCsrfToken();
      if (csrf) {
        headers["X-CSRF-TOKEN"] = csrf;
        headers["X-CSRF-Token"] = csrf;
      }
      const xsrf = readCookie("XSRF-TOKEN");
      if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
      }

      // 3. Submit credentials with credentials: "include"
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ username, password })
        });
      } catch (netErr: any) {
        throw new Error("Network connection failure. Please verify server connectivity.");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(formatAuthErrorMessage(res, errData));
      }

      const data: LoginResponse = await res.json();
      this.setSession(data);

      // 4. Confirm persistent session via /api/auth/me before returning
      try {
        await this.getMe();
      } catch (verifyErr: any) {
        this.clearSession();
        throw new Error("Login succeeded but persistent session could not be established. Please check cookie settings.");
      }

      return data;
    } finally {
      isLoginInProgress = false;
    }
  },

  /**
   * Terminates active session on server (clears HttpOnly cookies) and cleans up client state.
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...this.getCsrfHeaders()
        }
      });
    } catch {
      // Proceed with client cleanup even if network fails
    } finally {
      this.clearSession();
    }
  },

  /**
   * Verifies session validity with the backend using HttpOnly cookie credentials.
   */
  async getMe(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      this.clearSession();
      throw new Error("Session expired. Please log in again.");
    }

    const raw: any = await res.json();
    const user: AuthUser = {
      id: raw.id ?? raw.user_id,
      username: raw.username,
      email: raw.email,
      role: raw.role,
      must_change_password: Boolean(raw.must_change_password)
    };

    inMemoryUser = user;
    try {
      window.sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
    return user;
  },

  /**
   * Updates password for the authenticated user session.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.getCsrfHeaders()
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update password" }));
      throw new Error(err.detail || "Password change failed");
    }

    const user = this.getUser();
    if (user) {
      user.must_change_password = false;
      inMemoryUser = user;
      try {
        window.sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Updates profile metadata for the authenticated user session.
   */
  async updateProfile(data: { username?: string; email?: string }): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/update-profile`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.getCsrfHeaders()
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update profile" }));
      throw new Error(err.detail || "Profile update failed");
    }

    const updatedUser: AuthUser = await res.json();
    inMemoryUser = updatedUser;
    try {
      window.sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
    } catch {
      // Ignore
    }
    return updatedUser;
  },

  /**
   * Role-based access check.
   */
  hasRole(allowedRoles: string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    const userRole = (user.role || "").toUpperCase();
    if (userRole === "MASTER" || userRole === "OWNER") return true;
    const normalized = allowedRoles.map(r => r.toUpperCase());
    return normalized.includes(userRole);
  }
};
