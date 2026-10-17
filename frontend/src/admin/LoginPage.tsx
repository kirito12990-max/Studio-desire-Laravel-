import React, { useState } from "react";
import { authService, LoginResponse } from "../services/authService";

interface LoginPageProps {
  onLoginSuccess: (session: LoginResponse) => void;
  onCancel: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await authService.login(username.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="login-brand-header">
          <div className="login-brand-title">STUDIO DESIRE</div>
          <div className="login-brand-subtitle">OWNER ACCESS</div>
        </div>

        {error && <div className="admin-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="admin-form-group">
            <label className="admin-form-label">Username</label>
            <input
              type="text"
              className="admin-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginTop: "2rem" }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-full"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "SIGN IN"}
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-full"
              onClick={onCancel}
              disabled={loading}
            >
              Return to Studio Desire
            </button>
          </div>
        </form>

        <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--admin-border)", paddingTop: "1.2rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", letterSpacing: "0.1em" }}>
            Encrypted Session · Studio Desire Private Authentication
          </span>
        </div>
      </div>
    </div>
  );
};
