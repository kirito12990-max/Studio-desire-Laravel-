import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ProjectMeeting, MeetingStatus } from "../types/meeting";
import { AdminProject } from "../types/admin";
import { ClientSummary } from "../types/client";
import { StudioModal } from "../components/StudioModal";

type CalendarView = "month" | "week" | "day" | "agenda";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  all_day: boolean;
  type: "meeting" | "task" | "google_event";
  source: "studio_desire" | "google";
  raw_id?: number | string;
  status?: string;
  location?: string;
  details?: Record<string, any>;
}

export const MeetingsManager: React.FC = () => {
  const [meetings, setMeetings] = useState<ProjectMeeting[]>([]);
  const [mergedEvents, setMergedEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Calendar Integration state
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    status?: string;
    google_account_email?: string;
    calendar_id?: string;
    last_synced_at?: string;
    updated_at?: string;
    client_id_configured?: boolean;
    configuration_valid?: boolean;
    configuration_errors?: string[];
  }>({ connected: false });
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Calendar View controls
  const [currentView, setCurrentView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Selected Event Details modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Add Meeting Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [form, setForm] = useState({
    project_id: undefined as number | undefined,
    client_id: undefined as number | undefined,
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "14:00",
    location: "Studio Desire HQ",
    meeting_type: "Client Consultation",
    notes: "",
    participants: ""
  });

  // Disconnect Confirmation Modal
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    checkOAuthCallback();
    loadData();
  }, []);

  const checkOAuthCallback = () => {
    const hash = window.location.hash;
    const searchString = hash.includes("?") ? hash.substring(hash.indexOf("?")) : "";
    const params = new URLSearchParams(searchString);

    if (params.get("calendar_connected") === "true") {
      setSuccessNotice("Google Calendar successfully connected! Real-time two-way synchronization is active.");
      const cleanHash = hash.replace(/[\?&]calendar_connected=true/, "").replace(/[\?&]tab=meetings/, "");
      window.history.replaceState(null, "", cleanHash.includes("?") ? cleanHash : cleanHash.replace("?", ""));
    } else if (params.get("calendar_error")) {
      const errCode = params.get("calendar_error") || "";
      const friendlyMessages: Record<string, string> = {
        access_denied: "Google authorization was cancelled or denied.",
        missing_code_or_state: "Authorization was incomplete (missing authorization code or state token).",
        invalid_or_expired_state: "The authorization session expired or is invalid. Please try connecting again.",
        token_exchange_failed: "Failed to exchange authorization tokens with Google. Please verify Google Cloud OAuth configuration.",
        insufficient_permissions: "Google account connected, but lacked necessary calendar access permissions.",
        config_error: "Google Calendar OAuth is not properly configured on the server."
      };
      setError("Google Calendar Connection: " + (friendlyMessages[errCode] || decodeURIComponent(errCode)));
      const cleanHash = hash.replace(/[\?&]calendar_error=[^&]+/, "").replace(/[\?&]tab=meetings/, "");
      window.history.replaceState(null, "", cleanHash.includes("?") ? cleanHash : cleanHash.replace("?", ""));
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mList, pList, cList, gStatus, events] = await Promise.all([
        adminService.getMeetings(),
        adminService.getProjects(),
        adminService.getClients(),
        adminService.getGoogleCalendarStatus().catch(() => ({ connected: false, status: "DISCONNECTED" })),
        adminService.getMergedCalendarEvents().catch(() => [])
      ]);
      const normalizedEvents: CalendarEvent[] = (events || []).map((evt: any) => ({
        id: String(evt.id || Math.random()),
        title: evt.title || "Untitled Event",
        start: evt.start || evt.start_time || new Date().toISOString(),
        end: evt.end || evt.end_time,
        all_day: Boolean(evt.all_day),
        type: evt.source_type === "SD_TASK" ? "task" : evt.source_type === "SD_MEETING" ? "meeting" : "google_event",
        source: evt.source_type === "GOOGLE_EVENT" ? "google" : "studio_desire",
        raw_id: evt.entity_id || evt.id,
        status: evt.status,
        location: evt.location,
        details: {
          notes: evt.description,
          project_title: evt.project_title,
          assignee_name: evt.assignee_name,
          priority: evt.priority
        }
      }));

      setMeetings(mList);
      setProjects(pList);
      setClients(cList);
      setGoogleStatus(gStatus);
      setMergedEvents(normalizedEvents);
    } catch (err: any) {
      setError(err.message || "Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await adminService.getGoogleOAuthUrl();
      const targetUrl = res.authorization_url || res.auth_url;
      if (targetUrl) {
        window.location.assign(targetUrl);
      } else {
        alert("Could not obtain Google authorization URL.");
      }
    } catch (err: any) {
      alert("Failed to initiate Google OAuth: " + err.message);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await adminService.syncGoogleCalendar();
      if (res.success) {
        setSuccessNotice(res.message || "Google Calendar synchronized successfully.");
      } else {
        setError(`Synchronization notice: ${res.message}`);
      }
      await loadData();
    } catch (err: any) {
      setError("Google Calendar sync error: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await adminService.disconnectGoogleCalendar();
      setShowDisconnectConfirm(false);
      setSuccessNotice("Google Calendar disconnected.");
      await loadData();
    } catch (err: any) {
      setError("Failed to disconnect Google Calendar: " + err.message);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createMeeting(form);
      setMeetings([created, ...meetings]);
      setShowAddModal(false);
      setForm({
        project_id: undefined,
        client_id: undefined,
        title: "",
        date: new Date().toISOString().split("T")[0],
        time: "14:00",
        location: "Studio Desire HQ",
        meeting_type: "Client Consultation",
        notes: "",
        participants: ""
      });
      // Sync if Google is connected
      if (googleStatus.connected && syncToGoogle) {
        handleSyncNow();
      } else {
        loadData();
      }
    } catch (err: any) {
      alert("Failed to schedule meeting: " + err.message);
    }
  };

  const handleUpdateStatus = async (meeting: ProjectMeeting, newStatus: MeetingStatus) => {
    try {
      const updated = await adminService.updateMeeting(meeting.id, { status: newStatus });
      setMeetings(meetings.map(m => m.id === meeting.id ? updated : m));
      loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteMeeting = async (id: number, title: string) => {
    if (!window.confirm(`Cancel meeting '${title}'?`)) return;
    try {
      await adminService.deleteMeeting(id);
      setMeetings(meetings.filter(m => m.id !== id));
      loadData();
    } catch (err: any) {
      alert("Failed to delete meeting: " + err.message);
    }
  };

  // Date Navigation Helpers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (currentView === "month") d.setMonth(d.getMonth() - 1);
    else if (currentView === "week") d.setDate(d.getDate() - 7);
    else if (currentView === "day") d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (currentView === "month") d.setMonth(d.getMonth() + 1);
    else if (currentView === "week") d.setDate(d.getDate() + 7);
    else if (currentView === "day") d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatHeaderMonthYear = () => {
    return currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  // Month grid generator
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of week offset (0 = Sun, so make Mon = 0)
    let startDayOfWeek = (firstDay.getDay() + 6) % 7; 
    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        currentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        currentMonth: true
      });
    }

    // Next month padding to reach full weeks (35 or 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        currentMonth: false
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return mergedEvents.filter(evt => {
      if (!evt || !evt.start) return false;
      const evtDateStr = String(evt.start).split("T")[0];
      return evtDateStr === dateStr;
    });
  };

  return (
    <div>
      {/* SUCCESS NOTIFICATION BANNER */}
      {successNotice && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.86rem"
          }}
        >
          <span>✓ {successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            style={{
              background: "none",
              border: "none",
              color: "#065f46",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: GOOGLE CALENDAR CONNECTION BAR */}
      <div 
        className="admin-surface-card" 
        style={{ 
          padding: "1.2rem 1.5rem", 
          marginBottom: "1.5rem", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          borderRadius: "14px",
          borderLeft: googleStatus.connected ? "4px solid #10b981" : "4px solid #f59e0b"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.2rem" }}>📅</span>
            <strong style={{ fontSize: "0.95rem", color: "var(--admin-text-main)" }}>
              Google Calendar Integration
            </strong>
            {googleStatus.connected ? (
              <span className="badge-demo badge-published" style={{ marginLeft: "0.4rem" }}>
                Connected ✓
              </span>
            ) : (
              <span className="badge-demo badge-danger" style={{ marginLeft: "0.4rem" }}>
                Not Connected
              </span>
            )}
            {googleStatus.configuration_valid === false && (
              <span className="badge-demo badge-warning" style={{ marginLeft: "0.4rem" }}>
                Config Required
              </span>
            )}
          </div>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.76rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
            {googleStatus.connected ? (
              <>
                Account: <strong style={{ color: "var(--admin-text-main)" }}>{googleStatus.google_account_email}</strong> | Calendar: {googleStatus.calendar_id || "Primary"} | Last Sync: {googleStatus.last_synced_at || googleStatus.updated_at ? new Date(googleStatus.last_synced_at || googleStatus.updated_at!).toLocaleString() : "Never"}
              </>
            ) : (
              googleStatus.configuration_errors && googleStatus.configuration_errors.length > 0
                ? `Configuration notice: ${googleStatus.configuration_errors.join(", ")}`
                : "Connect your Google account to achieve real-time two-way synchronization for Studio Desire consultations, site visits, and project milestones."
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {googleStatus.connected ? (
            <>
              <button
                className="admin-btn admin-btn-secondary"
                disabled={syncing}
                onClick={handleSyncNow}
                style={{ fontSize: "0.78rem" }}
              >
                {syncing ? "Syncing..." : "🔄 Sync Now"}
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => setShowDisconnectConfirm(true)}
                style={{ fontSize: "0.78rem" }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleConnectGoogle}
              style={{ fontSize: "0.78rem" }}
            >
              🌐 Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: CALENDAR HEADER & NAVIGATION CONTROLS */}
      <div 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          justifyContent: "space-between", 
          alignItems: "center", 
          gap: "1rem", 
          marginBottom: "1.2rem" 
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, minWidth: "180px", color: "var(--admin-text-main)" }}>
            {formatHeaderMonthYear()}
          </h2>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            <button className="admin-btn admin-btn-secondary" onClick={handleToday} style={{ fontSize: "0.75rem" }}>
              Today
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={handlePrev} style={{ fontSize: "0.75rem" }}>
              ‹
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={handleNext} style={{ fontSize: "0.75rem" }}>
              ›
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--admin-surface-subtle)", padding: "4px", borderRadius: "8px" }}>
          {(["month", "week", "day", "agenda"] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => setCurrentView(v)}
              className="admin-btn"
              style={{
                fontSize: "0.75rem",
                padding: "0.35rem 0.75rem",
                textTransform: "capitalize",
                backgroundColor: currentView === v ? "var(--admin-surface-card)" : "transparent",
                color: currentView === v ? "var(--admin-text-main)" : "var(--admin-text-muted)",
                boxShadow: currentView === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: "6px",
                border: "none",
                fontWeight: currentView === v ? 600 : 400
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)} style={{ fontSize: "0.78rem" }}>
            + Schedule Meeting / Task
          </button>
        </div>
      </div>

      {error && <div className="admin-error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* SECTION 3: CALENDAR BODY (MONTH / WEEK / DAY / AGENDA) */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.8rem", padding: "3rem 0", textAlign: "center" }}>
          Loading calendar events...
        </div>
      ) : currentView === "month" ? (
        /* MONTH GRID */
        <div style={{ border: "1px solid var(--admin-border)", borderRadius: "12px", overflow: "hidden", backgroundColor: "var(--admin-surface-card)" }}>
          {/* Weekday Labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: "var(--admin-surface-subtle)", borderBottom: "1px solid var(--admin-border)", textAlign: "center" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} style={{ padding: "0.6rem 0", fontSize: "0.72rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(110px, auto)" }}>
            {getDaysInMonth().map(({ date, currentMonth }, idx) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={idx}
                  style={{
                    borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid var(--admin-border)",
                    borderBottom: "1px solid var(--admin-border)",
                    padding: "0.4rem",
                    backgroundColor: currentMonth ? "var(--admin-surface-card)" : "rgba(0,0,0,0.02)",
                    opacity: currentMonth ? 1 : 0.45,
                    minHeight: "110px",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: isToday ? 700 : 500,
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        backgroundColor: isToday ? "var(--admin-accent, #2563eb)" : "transparent",
                        color: isToday ? "#ffffff" : "var(--admin-text-main)"
                      }}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Day Events List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", overflowY: "auto", maxHeight: "80px" }}>
                    {dayEvents.map(evt => {
                      const badgeBg =
                        evt.type === "meeting"
                          ? "#eff6ff"
                          : evt.type === "task"
                          ? "#f0fdf4"
                          : "#faf5ff";
                      const badgeBorder =
                        evt.type === "meeting"
                          ? "#bfdbfe"
                          : evt.type === "task"
                          ? "#bbf7d0"
                          : "#e9d5ff";
                      const badgeText =
                        evt.type === "meeting"
                          ? "#1e40af"
                          : evt.type === "task"
                          ? "#166534"
                          : "#6b21a8";
                      const icon =
                        evt.type === "meeting" ? "🤝" : evt.type === "task" ? "📌" : "📅";

                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          title={`${evt.title} (${evt.type})`}
                          style={{
                            padding: "2px 5px",
                            borderRadius: "4px",
                            backgroundColor: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            color: badgeText,
                            fontSize: "0.68rem",
                            lineHeight: "1.2",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}
                        >
                          <span>{icon}</span>
                          <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {evt.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* AGENDA / LIST VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {mergedEvents.length === 0 ? (
            <div style={{ padding: "3rem", backgroundColor: "var(--admin-surface-card)", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem", borderRadius: "12px" }}>
              No scheduled events found.
            </div>
          ) : (
            mergedEvents.map(evt => (
              <div
                key={evt.id}
                className="admin-surface-card"
                onClick={() => setSelectedEvent(evt)}
                style={{ padding: "1.2rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", cursor: "pointer" }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1rem" }}>
                      {evt.type === "meeting" ? "🤝" : evt.type === "task" ? "📌" : "📅"}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--admin-text-main)" }}>
                      {evt.title}
                    </strong>
                    <span className="badge-demo" style={{ textTransform: "capitalize" }}>
                      {evt.type.replace("_", " ")}
                    </span>
                    {evt.source === "google" && (
                      <span className="badge-demo badge-published">
                        Google Synced
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.4rem", fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                    <span>📅 {new Date(evt.start || Date.now()).toLocaleString()}</span>
                    {evt.location && <span>📍 {evt.location}</span>}
                  </div>
                </div>

                <button className="admin-btn admin-btn-secondary" style={{ fontSize: "0.72rem" }}>
                  View Details →
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: EVENT DETAILS */}
      {selectedEvent && (
        <StudioModal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
          width="500px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="badge-demo" style={{ textTransform: "capitalize" }}>
                {selectedEvent.type.replace("_", " ")}
              </span>
              <span className="badge-demo badge-published">
                Source: {selectedEvent.source === "google" ? "Google Calendar" : "Studio Desire"}
              </span>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Date & Time</label>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", fontWeight: 600 }}>
                {new Date(selectedEvent.start || Date.now()).toLocaleString()}
              </p>
            </div>

            {selectedEvent.location && (
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Location</label>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem" }}>
                  📍 {selectedEvent.location}
                </p>
              </div>
            )}

            {selectedEvent.details?.notes && (
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", textTransform: "uppercase" }}>Notes</label>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>
                  {selectedEvent.details.notes}
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              {selectedEvent.type === "meeting" && typeof selectedEvent.raw_id === "number" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => {
                      const m = meetings.find(item => item.id === selectedEvent.raw_id);
                      if (m) handleUpdateStatus(m, m.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED");
                      setSelectedEvent(null);
                    }}
                  >
                    {selectedEvent.status === "COMPLETED" ? "Re-schedule" : "Mark Completed ✓"}
                  </button>
                  <button
                    className="admin-btn admin-btn-danger"
                    onClick={() => {
                      if (typeof selectedEvent.raw_id === "number") {
                        handleDeleteMeeting(selectedEvent.raw_id, selectedEvent.title);
                        setSelectedEvent(null);
                      }
                    }}
                  >
                    Delete Meeting
                  </button>
                </div>
              ) : <div />}
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </StudioModal>
      )}

      {/* MODAL: DISCONNECT CONFIRMATION */}
      {showDisconnectConfirm && (
        <StudioModal
          isOpen={true}
          onClose={() => setShowDisconnectConfirm(false)}
          title="Disconnect Google Calendar"
          width="440px"
        >
          <p style={{ fontSize: "0.85rem", color: "var(--admin-text-main)", margin: "0 0 1.2rem" }}>
            Are you sure you want to disconnect Google Calendar?
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", margin: "0 0 1.5rem" }}>
            Studio Desire meetings and tasks will remain intact in your internal database, but future two-way calendar sync will be paused.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowDisconnectConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleDisconnectGoogle}
            >
              Confirm Disconnect
            </button>
          </div>
        </StudioModal>
      )}

      {/* MODAL: SCHEDULE MEETING */}
      {showAddModal && (
        <StudioModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          title="Schedule Consultation / Meeting"
          width="540px"
        >
          <form onSubmit={handleCreateMeeting}>
            <div className="admin-form-group">
              <label>Meeting Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Spatial 3D Render Presentation & Material Sign-off"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="admin-form-group">
                <label>Linked Project (Optional)</label>
                <select
                  value={form.project_id || ""}
                  onChange={e => setForm({ ...form, project_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">-- None / General --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Linked Client (Optional)</label>
                <select
                  value={form.client_id || ""}
                  onChange={e => setForm({ ...form, client_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">-- None / General --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="admin-form-group">
                <label>Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Time</label>
                <input
                  type="text"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                  placeholder="e.g., 14:00"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Studio Desire HQ / Site Location / Zoom"
              />
            </div>

            <div className="admin-form-group">
              <label>Meeting Type</label>
              <select
                value={form.meeting_type}
                onChange={e => setForm({ ...form, meeting_type: e.target.value })}
              >
                <option value="Client Consultation">Client Consultation</option>
                <option value="Design Review">Design Review</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Material Selection">Material Selection</option>
                <option value="Budget Review">Budget Review</option>
              </select>
            </div>

            {googleStatus.connected && (
              <div style={{ padding: "0.8rem", backgroundColor: "var(--admin-surface-subtle)", borderRadius: "8px", margin: "1rem 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={syncToGoogle}
                    onChange={e => setSyncToGoogle(e.target.checked)}
                  />
                  Sync to Google Calendar ✓
                </label>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary">
                Save Meeting
              </button>
            </div>
          </form>
        </StudioModal>
      )}
    </div>
  );
};
