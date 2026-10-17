import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { authService } from "../services/authService";

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const currentUser = authService.getUser();
  const isMaster = currentUser?.role === "MASTER" || currentUser?.role === "OWNER";

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      alert("Please provide username and password.");
      return;
    }

    if (role === "MASTER" && !isMaster) {
      alert("Only the Master Administrator can create another Master account.");
      return;
    }

    setCreating(true);
    try {
      await adminService.createUser({
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        role
      });
      setShowAddModal(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("EDITOR");
      loadUsers();
    } catch (err: any) {
      alert("Failed to create user: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (newRole === "MASTER" && !isMaster) {
      alert("Only the Master Administrator can elevate accounts to Master.");
      return;
    }
    try {
      await adminService.updateUser(userId, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    }
  };

  const handleToggleActive = async (userId: number, currentActive: boolean) => {
    try {
      await adminService.updateUser(userId, { is_active: !currentActive });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    try {
      await adminService.resetUserPassword(resettingUser.id, newPassword);
      setResettingUser(null);
      setNewPassword("");
      alert(`Password reset for ${resettingUser.username}. They will be prompted to set a secret password on login.`);
    } catch (err: any) {
      alert("Failed to reset password: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Permanently delete user account '${username}'? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert("Failed to delete user: " + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>
            User Roles & Access Control (RBAC)
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
            Manage authorized studio team accounts across MASTER, ADMIN, EDITOR, UPLOADER, and OBSERVER roles.
          </p>
        </div>

        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Team Member
        </button>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {loading ? (
        <div style={{ padding: "3rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
          Loading user accounts...
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
          <table className="review-items-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong style={{ color: "var(--admin-text-main)" }}>{u.username}</strong>
                    {u.id === currentUser?.id && (
                      <span style={{ fontSize: "0.6rem", marginLeft: "0.5rem", color: "var(--admin-text-dim)" }}>(You)</span>
                    )}
                  </td>
                  <td>{u.email || "—"}</td>
                  <td>
                    {["MASTER", "OWNER"].includes(u.role) && !isMaster ? (
                      <span className="admin-user-role-badge" style={{ borderColor: "var(--admin-accent)", color: "var(--admin-text-main)" }}>
                        {u.role}
                      </span>
                    ) : (
                      <select
                        className="admin-select"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", width: "auto" }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === currentUser?.id}
                      >
                        {isMaster && <option value="MASTER">MASTER</option>}
                        {isMaster && <option value="OWNER">OWNER</option>}
                        <option value="ADMIN">ADMIN</option>
                        <option value="DESIGNER">DESIGNER</option>
                        <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="UPLOADER">UPLOADER</option>
                        <option value="VIEWER">VIEWER</option>
                        <option value="OBSERVER">OBSERVER</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={`project-card-badge ${u.is_active ? "badge-published" : "badge-draft"}`} style={{ position: "static" }}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.3rem 0.5rem", fontSize: "0.65rem" }}
                        onClick={() => { setResettingUser(u); setNewPassword(""); }}
                      >
                        Reset Password
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.65rem" }}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {u.id !== currentUser?.id && (
                        <button
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.65rem" }}
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title="Permanently remove user"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-window" style={{ maxWidth: "480px" }}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">Create Authorized User</div>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Username *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. zenith_architect"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@studiodesire.com"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Initial Password *</label>
                  <input
                    type="password"
                    className="admin-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Assigned Role *</label>
                  <select
                    className="admin-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {isMaster && <option value="MASTER">MASTER (Full Executive Clearance)</option>}
                    {isMaster && <option value="OWNER">OWNER (Studio Principal Owner)</option>}
                    <option value="ADMIN">ADMIN (Projects, Media, Team Management)</option>
                    <option value="DESIGNER">DESIGNER (3D, Visualizations, Materials)</option>
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER (Milestones, Tasks, Meetings)</option>
                    <option value="EDITOR">EDITOR (Projects, Content, Uploads)</option>
                    <option value="UPLOADER">UPLOADER (Asset Uploads & File Archive)</option>
                    <option value="VIEWER">VIEWER (Internal Project Observer)</option>
                    <option value="OBSERVER">OBSERVER (Read-Only Reviewer)</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-window" style={{ maxWidth: "440px" }}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">Reset Password: {resettingUser.username}</div>
              <button className="admin-modal-close" onClick={() => setResettingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">New Temporary Password</label>
                  <input
                    type="password"
                    className="admin-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                  The user will be required to change this password on their next login.
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setResettingUser(null)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={resetting}
                >
                  {resetting ? "Resetting..." : "Commit Password Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
