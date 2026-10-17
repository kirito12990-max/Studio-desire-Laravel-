import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ActivityLogItem } from "../types/admin";

export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getActivityLogs(100);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>
          Activity Log & Audit Trail
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", margin: 0 }}>
          Immutable chronological tracking of all owner, administrative, content, and file upload operations.
        </p>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {loading ? (
        <div style={{ padding: "3rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem" }}>
          Loading audit events...
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
          <table className="review-items-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: "160px" }}>Date & Time</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Entity Affected</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: "var(--admin-text-muted)", fontSize: "0.7rem" }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong style={{ color: "var(--admin-text-main)" }}>{log.username}</strong>
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "0.2rem 0.5rem",
                      backgroundColor: "var(--admin-surface-subtle)",
                      border: "1px solid var(--admin-border)",
                      fontSize: "0.65rem",
                      textTransform: "uppercase"
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--admin-text-dim)" }}>
                      {log.entity_type ? `${log.entity_type.toUpperCase()} #${log.entity_id || ''}` : "—"}
                    </span>
                  </td>
                  <td style={{ color: "var(--admin-text-muted)" }}>
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
