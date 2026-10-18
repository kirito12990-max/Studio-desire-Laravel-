import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { DashboardStats } from "../types/admin";

interface DashboardOverviewProps {
  onNavigateTab: (tab: string, context?: any) => void;
  onOpenProjectDetail?: (slug: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await adminService.getDashboardStats();
      setStats(s);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem 0", color: "var(--admin-text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
        Loading studio operations and metrics...
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div>
      {error && <div className="admin-error-banner">{error}</div>}

      {/* Hero Welcome Banner */}
      <div
        style={{
          backgroundColor: "var(--admin-surface)",
          border: "1px solid var(--admin-border)",
          borderRadius: "var(--admin-radius-md)",
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          boxShadow: "var(--admin-shadow-xs)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#d4af37", backgroundColor: "#fefce8", padding: "0.2rem 0.6rem", borderRadius: "4px", border: "1px solid #fef08a" }}>
              Studio Operations Live
            </span>
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--admin-text-main)", margin: 0, letterSpacing: "-0.01em" }}>
            Executive Operations Dashboard
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)", margin: "0.3rem 0 0" }}>
            Real-time pipeline metrics, high-priority tasks, scheduled consultations, and project financials.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => onNavigateTab("enquiries")}
          >
            Review Leads ({stats?.new_enquiries || 0})
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => onNavigateTab("projects")}
          >
            + View Projects
          </button>
        </div>
      </div>

      {/* SECTION 1: STATISTIC METRIC CARDS */}
      {stats && (
        <div className="admin-stats-grid">
          {/* Active Projects */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("projects")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">Active Projects</div>
                <div className="admin-stat-value">{stats.active_projects}</div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-blue">
                📁
              </div>
            </div>
            <div className="admin-stat-footer">
              <span className="badge-published" style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem" }}>
                {stats.published_projects_count} Published
              </span>
              <span>· {stats.draft_projects_count} In Progress</span>
            </div>
          </div>

          {/* New Leads / Enquiries */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("enquiries")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">New Enquiries</div>
                <div className="admin-stat-value" style={{ color: stats.new_enquiries > 0 ? "var(--admin-success)" : "inherit" }}>
                  {stats.new_enquiries}
                </div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-green">
                📥
              </div>
            </div>
            <div className="admin-stat-footer">
              <span>{stats.total_enquiries} Total Customer Leads</span>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("tasks")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">Overdue Tasks</div>
                <div className="admin-stat-value" style={{ color: stats.overdue_tasks > 0 ? "var(--admin-danger)" : "inherit" }}>
                  {stats.overdue_tasks}
                </div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-orange">
                ✓
              </div>
            </div>
            <div className="admin-stat-footer">
              <span>{stats.tasks_due_today} Due Today</span>
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("meetings")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">Meetings</div>
                <div className="admin-stat-value" style={{ color: "var(--admin-primary)" }}>
                  {stats.upcoming_meetings_count}
                </div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-teal">
                📅
              </div>
            </div>
            <div className="admin-stat-footer">
              <span>Client Consultations</span>
            </div>
          </div>

          {/* Total Clients */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("clients")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">Total Clients</div>
                <div className="admin-stat-value">{stats.total_clients}</div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-purple">
                👥
              </div>
            </div>
            <div className="admin-stat-footer">
              <span>Registered Accounts</span>
            </div>
          </div>

          {/* Contracted Value */}
          <div
            className="admin-stat-card"
            style={{ cursor: "pointer" }}
            onClick={() => onNavigateTab("finance")}
          >
            <div className="admin-stat-top">
              <div>
                <div className="admin-stat-label">Contracted Value</div>
                <div className="admin-stat-value" style={{ color: "var(--admin-teal)" }}>
                  {formatCurrency(stats.total_project_value || 0)}
                </div>
              </div>
              <div className="admin-stat-icon-wrapper admin-stat-icon-teal">
                💰
              </div>
            </div>
            <div className="admin-stat-footer">
              <span style={{ color: "var(--admin-success)", fontWeight: 600 }}>
                {formatCurrency(stats.total_amount_received || 0)} Received
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ACTION PRIORITY STREAM */}
      <div className="admin-surface-card">
        <div className="admin-surface-card-header">
          <div>
            <h3 className="admin-card-title">⚡ High-Priority Action Stream</h3>
            <div className="admin-card-desc">
              Direct matters requiring studio owner attention: Unaddressed leads, overdue milestones, upcoming site visits
            </div>
          </div>
        </div>

        {stats?.action_items && stats.action_items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {stats.action_items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "1.2rem",
                  backgroundColor: "var(--admin-surface-subtle)",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "var(--admin-radius-md)",
                  borderLeft: `4px solid ${
                    item.badge_color === "red" ? "#dc2626" :
                    item.badge_color === "green" ? "#16a34a" :
                    item.badge_color === "blue" ? "#0284c7" : "var(--admin-teal)"
                  }`,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => onNavigateTab(item.link_tab, item.link_context)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span
                    className={`badge-demo ${
                      item.badge_color === "red" ? "badge-danger" :
                      item.badge_color === "green" ? "badge-published" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                  {item.date && (
                    <span style={{ fontSize: "0.7rem", color: "var(--admin-text-dim)" }}>
                      {item.date}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: "0.25rem" }}>
                  {item.title}
                </div>

                {item.subtitle && (
                  <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", lineHeight: 1.4 }}>
                    {item.subtitle}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--admin-teal)" }}>
                    Open {item.link_tab.toUpperCase()} →
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "1.5rem", backgroundColor: "var(--admin-surface-subtle)", borderRadius: "var(--admin-radius-md)", color: "var(--admin-text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
            ✓ All caught up! No urgent unassigned leads or overdue deadlines.
          </div>
        )}
      </div>

      {/* SECTION 3: QUICK WORKSPACE SHORTCUTS & RECENT ENQUIRIES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Quick Operations Modules */}
        <div className="admin-surface-card">
          <div className="admin-surface-card-header">
            <h3 className="admin-card-title">Portfolio Modules</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("projects")}
            >
              📁 Projects Archive ({stats?.total_projects || 0})
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("clients")}
            >
              👥 Client Directory ({stats?.total_clients || 0})
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("enquiries")}
            >
              📥 Leads Pipeline ({stats?.total_enquiries || 0})
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("media")}
            >
              🖼️ Media Library ({stats?.total_photos || 0} Assets)
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("categories")}
            >
              🏷️ Portfolio Categories
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ justifyContent: "flex-start", padding: "0.85rem 1rem", fontSize: "0.8rem" }}
              onClick={() => onNavigateTab("content")}
            >
              🌐 Website Content
            </button>
          </div>
        </div>

        {/* Real Inquiries Stream from Backend */}
        <div className="admin-surface-card">
          <div className="admin-surface-card-header">
            <h3 className="admin-card-title">Recent Inquiries</h3>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-small"
              onClick={() => onNavigateTab("enquiries")}
            >
              View All Leads →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {stats?.recent_enquiries && stats.recent_enquiries.length > 0 ? (
              stats.recent_enquiries.slice(0, 5).map((enq) => (
                <div
                  key={enq.id}
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--admin-surface-subtle)",
                    borderRadius: "var(--admin-radius-sm)",
                    border: "1px solid var(--admin-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                  onClick={() => onNavigateTab("enquiries")}
                >
                  <div>
                    <strong style={{ color: "var(--admin-teal)" }}>{enq.name}</strong>
                    <span style={{ color: "var(--admin-text-main)", marginLeft: "0.5rem" }}>
                      {enq.project_type || "Consultation"}
                    </span>
                    <span style={{ color: "var(--admin-text-muted)", marginLeft: "0.4rem", fontSize: "0.72rem" }}>
                      ({enq.email})
                    </span>
                  </div>
                  <span
                    className={`badge-demo ${
                      enq.status === "NEW" ? "badge-danger" : "badge-published"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {enq.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "1.5rem", color: "var(--admin-text-muted)", textAlign: "center", fontSize: "0.8rem" }}>
                No customer inquiries received yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
