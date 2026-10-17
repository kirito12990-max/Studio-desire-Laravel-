import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { authService } from "../services/authService";

describe("authService (Hardened Cookie & CSRF Session Management)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    authService.clearSession();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("never stores authentication tokens in localStorage", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        access_token: "fake-jwt-cookie-token",
        csrf_token: "csrf-token-abc123xyz",
        token_type: "bearer",
        user_id: 1,
        username: "Zenith Suthar",
        role: "ADMIN",
        must_change_password: false,
      }),
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const session = await authService.login("zenith", "password123");

    expect(session.username).toBe("Zenith Suthar");
    expect(session.role).toBe("ADMIN");

    // CRITICAL: verify localStorage has zero tokens
    expect(localStorage.getItem("sd_owner_token")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("jwt")).toBeNull();

    // Verify CSRF token is stored and accessible via getCsrfHeaders()
    expect(authService.getCsrfToken()).toBe("csrf-token-abc123xyz");
    expect(authService.getCsrfHeaders()).toEqual({
      "X-CSRF-Token": "csrf-token-abc123xyz",
    });

    // Verify credentials: include was passed to fetch
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      })
    );
  });

  it("correctly evaluates user role permissions using hasRole", () => {
    authService.setSession({
      access_token: "mock-jwt",
      token_type: "bearer",
      user_id: 1,
      username: "Chetna Bhati",
      role: "PROJECT_MANAGER",
      must_change_password: false,
    });

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.hasRole(["PROJECT_MANAGER"])).toBe(true);
    expect(authService.hasRole(["DESIGNER"])).toBe(false);
    expect(authService.hasRole(["ADMIN", "PROJECT_MANAGER"])).toBe(true);
    // MASTER and OWNER have global access
    authService.setSession({
      access_token: "mock-jwt",
      token_type: "bearer",
      user_id: 2,
      username: "Studio Desier",
      role: "MASTER",
      must_change_password: false,
    });
    expect(authService.hasRole(["DESIGNER"])).toBe(true);
  });

  it("logout clears session and calls the backend endpoint with credentials", async () => {
    authService.setSession({
      access_token: "mock-jwt",
      token_type: "bearer",
      user_id: 2,
      username: "Jiniyas",
      role: "MASTER",
      csrf_token: "csrf-token-active",
      must_change_password: false,
    });

    const mockLogoutResponse = {
      ok: true,
      json: async () => ({ message: "Successfully logged out" }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockLogoutResponse);

    await authService.logout();

    expect(authService.getUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getCsrfToken()).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      })
    );
  });

  it("getMe verifies session via cookie without relying on localStorage", async () => {
    const mockMeResponse = {
      ok: true,
      json: async () => ({
        id: 1,
        username: "Studio Desier",
        role: "MASTER",
        must_change_password: false,
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockMeResponse);

    const user = await authService.getMe();

    expect(user).not.toBeNull();
    expect(user?.username).toBe("Studio Desier");
    expect(user?.role).toBe("MASTER");
    expect(authService.isAuthenticated()).toBe(true);
    expect(localStorage.getItem("sd_owner_token")).toBeNull();
  });
});
