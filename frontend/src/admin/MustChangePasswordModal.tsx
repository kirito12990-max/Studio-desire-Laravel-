import React, { useState } from "react";
import { authService } from "../services/authService";

interface MustChangePasswordModalProps {
  onSuccess: () => void;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({ onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to change password. Verify your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal-window" style={{ maxWidth: "480px" }}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">Security Requirement: Change Initial Password</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <p style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              As a security precaution, you must change your initial development password before accessing the Studio Desire Owner Dashboard.
            </p>

            {error && <div className="admin-error-banner">{error}</div>}

            <div className="admin-form-group">
              <label className="admin-form-label">Current / Temporary Password</label>
              <input
                type="password"
                className="admin-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (e.g. 12345678)"
                autoFocus
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">New Master Password</label>
              <input
                type="password"
                className="admin-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Confirm New Master Password</label>
              <input
                type="password"
                className="admin-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password & Enter Dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
