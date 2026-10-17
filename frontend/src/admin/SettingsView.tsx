import React, { useState, useEffect } from "react";
import { authService, AuthUser } from "../services/authService";
import { enquiryService } from "../services/enquiryService";
import { EmailSettings } from "../types/enquiry";

interface SettingsViewProps {
  user?: AuthUser;
  onUserUpdated?: (user: AuthUser) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUserUpdated }) => {
  const fallbackUser: AuthUser = { id: 1, username: "Studio Desire", role: "MASTER", must_change_password: false, email: "" };
  const activeUser: AuthUser = user || authService.getUser() || fallbackUser;
  const [username, setUsername] = useState(activeUser.username || "");
  const [email, setEmail] = useState(activeUser.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email SMTP Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    sender_name: "Studio Desire",
    sender_email: "",
    smtp_host: "",
    smtp_port: 587,
    security: "starttls",
    smtp_username: "",
    smtp_password: "",
    recipients: [],
    customer_confirmation_enabled: true,
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isMasterOrAdmin = authService.hasRole(["MASTER", "ADMIN"]);

  useEffect(() => {
    if (isMasterOrAdmin) {
      loadEmailSettings();
    }
  }, [isMasterOrAdmin]);

  const loadEmailSettings = async () => {
    setLoadingEmail(true);
    try {
      const data = await enquiryService.getEmailSettings();
      setEmailSettings(data);
      if (data.recipients && data.recipients.length > 0) {
        setTestRecipient(data.recipients[0]);
      }
    } catch (err: any) {
      console.warn("Could not load email settings:", err);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProfileMsg(null);
    try {
      const updated = await authService.updateProfile({ username: username.trim(), email: email.trim() || undefined });
      onUserUpdated?.(updated);
      setProfileMsg("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPwdMsg(null);
    if (!currentPassword || !newPassword) {
      setError("Please complete all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      await authService.changePassword(currentPassword, newPassword);
      setPwdMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    }
  };

  const handleAddRecipient = () => {
    const trimmed = newRecipient.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!emailSettings.recipients.includes(trimmed)) {
      setEmailSettings(prev => ({
        ...prev,
        recipients: [...prev.recipients, trimmed],
      }));
    }
    setNewRecipient("");
  };

  const handleRemoveRecipient = (idx: number) => {
    setEmailSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailSuccessMsg(null);
    setEmailErrorMsg(null);
    try {
      const payload: EmailSettings = {
        ...emailSettings,
        smtp_password: newPasswordInput.trim() ? newPasswordInput.trim() : (emailSettings.smtp_password || undefined),
      };
      const saved = await enquiryService.updateEmailSettings(payload);
      setEmailSettings(saved);
      setNewPasswordInput("");
      setEmailSuccessMsg("SMTP email configuration saved successfully.");
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || "Failed to save email settings");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    const to = testRecipient.trim() || emailSettings.recipients[0];
    if (!to) {
      alert("Please specify a test recipient email address.");
      return;
    }
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await enquiryService.testEmail({ to_email: to });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.detail || "Test email delivery failed.",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div style={{ maxWidth: "780px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>
          Settings & Email Configuration
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
          Manage your credentials, studio profile, and connected Studio Desire SMTP dispatch server.
        </p>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}
      {profileMsg && <div className="admin-success-banner">{profileMsg}</div>}
      {pwdMsg && <div className="admin-success-banner">{pwdMsg}</div>}

      {/* SMTP Email Server Configuration (Requirements 15, 16, 17) */}
      {isMasterOrAdmin && (
        <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--admin-accent)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                STUDIO DESIRE MAILBOX & NOTIFICATION DISPATCH
              </span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0.2rem 0 0" }}>
                SMTP Email Account
              </h3>
            </div>
            {emailSettings.has_password && (
              <span className="sd-tag-success">&#10003; Credentials Active</span>
            )}
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Connect your existing Studio Desire mailbox (Google Workspace, Microsoft 365, Zoho, cPanel or private SMTP). When clients submit rough sketches or project briefs, instant architectural notifications are dispatched to your team.
          </p>

          {emailSuccessMsg && <div className="admin-success-banner mb-3">{emailSuccessMsg}</div>}
          {emailErrorMsg && <div className="admin-error-banner mb-3">{emailErrorMsg}</div>}

          {loadingEmail ? (
            <div className="sd-admin-loading">Loading mailbox settings...</div>
          ) : (
            <form onSubmit={handleSaveEmailSettings}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Sender Name</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={emailSettings.sender_name}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                    placeholder="Studio Desire"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Sender Email Address</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={emailSettings.sender_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sender_email: e.target.value })}
                    placeholder="abc@studiodesire.in"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">SMTP Host</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.zoho.com or smtp.gmail.com"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">SMTP Port</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Encryption</label>
                  <select
                    className="admin-input"
                    value={emailSettings.security}
                    onChange={(e) => setEmailSettings({ ...emailSettings, security: e.target.value as any })}
                  >
                    <option value="starttls">STARTTLS (Port 587)</option>
                    <option value="ssl_tls">SSL / TLS (Port 465)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.2rem" }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">SMTP Username</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={emailSettings.smtp_username}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_username: e.target.value })}
                    placeholder="abc@studiodesire.in"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    SMTP Password / App Password {emailSettings.has_password && "(Stored Securely)"}
                  </label>
                  <input
                    type="password"
                    className="admin-input"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder={emailSettings.has_password ? "•••••••• (Enter to replace)" : "Enter mailbox or app password"}
                  />
                </div>
              </div>

              {/* Recipient Addresses List */}
              <div className="admin-form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="admin-form-label">Studio Desire Notification Recipients (Multiple allowed)</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
                  <input
                    type="email"
                    className="admin-input"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="e.g. design@studiodesire.in"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleAddRecipient}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    + Add Recipient
                  </button>
                </div>

                {emailSettings.recipients.length === 0 ? (
                  <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                    No recipient addresses specified yet.
                  </span>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {emailSettings.recipients.map((rec, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.6rem",
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--admin-border)",
                          fontSize: "0.75rem",
                          fontFamily: "var(--admin-font-mono)",
                        }}
                      >
                        {rec}
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ff6b6b",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: "0.9rem",
                            lineHeight: 1,
                          }}
                          title="Remove recipient"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-form-group" style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem" }}>
                  <input
                    type="checkbox"
                    checked={emailSettings.customer_confirmation_enabled}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        customer_confirmation_enabled: e.target.checked,
                      })
                    }
                  />
                  <span>Send automatic confirmation receipt to client's submitted email address</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--admin-border)", paddingTop: "1.2rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="email"
                    className="admin-input"
                    style={{ width: "220px", fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                    placeholder="Test to email..."
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {testingEmail ? "Sending Test..." : "Send Test Email"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={savingEmail}
                >
                  {savingEmail ? "Saving..." : "Save Email Configuration"}
                </button>
              </div>

              {testResult && (
                <div
                  className={`admin-${testResult.success ? "success" : "error"}-banner`}
                  style={{ marginTop: "1rem" }}
                >
                  {testResult.message}
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Profile Form */}
      <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "2rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          Profile Credentials
        </h3>

        <form onSubmit={handleUpdateProfile}>
          <div className="admin-form-group">
            <label className="admin-form-label">Username</label>
            <input
              type="text"
              className="admin-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Email Address</label>
            <input
              type="email"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@studiodesire.com"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Authorized Role</label>
            <input
              type="text"
              className="admin-input"
              value={activeUser.role}
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          <button type="submit" className="admin-btn admin-btn-primary">
            Save Profile Updates
          </button>
        </form>
      </div>

      {/* Change Password Form */}
      <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", padding: "2rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          Update Secret Password
        </h3>

        <form onSubmit={handleChangePassword}>
          <div className="admin-form-group">
            <label className="admin-form-label">Current Password</label>
            <input
              type="password"
              className="admin-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">New Password</label>
            <input
              type="password"
              className="admin-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Confirm New Password</label>
            <input
              type="password"
              className="admin-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <button type="submit" className="admin-btn admin-btn-secondary">
            Change Account Password
          </button>
        </form>
      </div>
    </div>
  );
};
