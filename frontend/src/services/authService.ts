import { API_BASE } from "../config/api";
import { AuthUser, LoginResponse, UserRole } from "../types/user";

export type { AuthUser, LoginResponse, UserRole };

// Session storage key for non-sensitive user metadata (display username, role)
// Tokens are strictly stored in HttpOnly cookies and NEVER stored in localStorage or sessionStorage.
const USER_SESSION_KEY = "sd_owner_user_session";
const LEGACY_TOKEN_KEY = "sd_owner_token";
const LEGACY_USER_KEY = "sd_owner_user";

let inMemoryUser: AuthUser | null = null;
let inMemoryCsrfToken: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
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
    const token = this.getCsrfToken();
    return token ? { "X-CSRF-Token": token } : {};
  },

  /**
   * Fetches or refreshes CSRF token from the server.
   */
  async refreshCsrfToken(): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf-token`, {
        credentials: "include"
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
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Authentication failed. Please verify credentials.");
    }

    const data: LoginResponse = await res.json();
    this.setSession(data);
    return data;
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
      credentials: "include"
    });

    if (!res.ok) {
      this.clearSession();
      throw new Error("Session expired. Please log in again.");
    }

    const user: AuthUser = await res.json();
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
