import React, { useState, useEffect } from "react";
import { enquiryService } from "../services/enquiryService";
import { adminService } from "../services/adminService";
import { ProjectEnquiry, EnquiryDetail } from "../types/enquiry";
import { authService } from "../services/authService";
import { StudioImage } from "../components/StudioImage";

interface EnquiriesManagerProps {
  onNavigateTab?: (tab: string, context?: any) => void;
}

export const EnquiriesManager: React.FC<EnquiriesManagerProps> = ({ onNavigateTab }) => {
  const [enquiries, setEnquiries] = useState<ProjectEnquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Drawer State
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [internalStatus, setInternalStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedUser, setAssignedUser] = useState("");

  // Conversion states
  const [retryingEmail, setRetryingEmail] = useState(false);
  const [convertingProject, setConvertingProject] = useState(false);
  const [convertingClient, setConvertingClient] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Manual Enquiry Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState("Residential Villa");
  const [newLocation, setNewLocation] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newTimeline, setNewTimeline] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const isMasterOrAdmin = authService.hasRole(["MASTER", "ADMIN", "OWNER"]);

  const STATUS_LIST = [
    "ALL",
    "NEW",
    "CONTACTED",
    "CONSULTATION",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST",
    "ARCHIVED",
  ];

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  const loadEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await enquiryService.getEnquiries({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setEnquiries(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEnquiries();
  };

  const openDetail = async (id: number) => {
    setLoadingDetail(true);
    setActionFeedback(null);
    try {
      const detail = await enquiryService.getEnquiryDetail(id);
      setSelectedEnquiry(detail);
      setInternalStatus(detail.status);
      setInternalNotes(detail.internal_notes || "");
      setAssignedUser(detail.assigned_user || "");
      loadEnquiries();
    } catch (err: any) {
      alert("Failed to load enquiry details: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveInternal = async () => {
    if (!selectedEnquiry) return;
    setSavingNotes(true);
    setActionFeedback(null);
    try {
      const updated = await enquiryService.updateEnquiry(selectedEnquiry.id, {
        status: internalStatus,
        internal_notes: internalNotes,
        assigned_user: assignedUser || null,
      });
      setSelectedEnquiry(updated);
      setActionFeedback({ type: 'success', message: 'Enquiry updated successfully.' });
      loadEnquiries();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err?.response?.data?.detail || 'Failed to update enquiry' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleConvertToClient = async () => {
    if (!selectedEnquiry) return;
    setConvertingClient(true);
    setActionFeedback(null);
    try {
      const res = await adminService.convertEnquiryToClient(selectedEnquiry.id, {
        company: selectedEnquiry.location,
        address: selectedEnquiry.location,
        notes: `Converted from Lead ${selectedEnquiry.reference_number}: ${selectedEnquiry.message}`
      });
      setActionFeedback({
        type: 'success',
        message: `${res.message} Client profile is now registered in your Client Directory.`
      });
      const updated = await enquiryService.getEnquiryDetail(selectedEnquiry.id);
      setSelectedEnquiry(updated);
      loadEnquiries();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to convert to client' });
    } finally {
      setConvertingClient(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!selectedEnquiry) return;
    if (!window.confirm(`Convert enquiry ${selectedEnquiry.reference_number} into an active Project in the studio archive?`)) {
      return;
    }
    setConvertingProject(true);
    setActionFeedback(null);
    try {
      const res = await adminService.convertEnquiryToProject(selectedEnquiry.id, {
        title: `${selectedEnquiry.name} — ${selectedEnquiry.project_type}`,
        client_id: selectedEnquiry.converted_client_id,
        category: "Residential",
        budget: 0,
        status: "CONSULTATION"
      });
      setActionFeedback({
        type: 'success',
        message: `${res.message} You can now manage photos, 3D renders, blueprints, and materials for this project.`,
      });
      const updated = await enquiryService.getEnquiryDetail(selectedEnquiry.id);
      setSelectedEnquiry(updated);
      loadEnquiries();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to convert enquiry to project' });
    } finally {
      setConvertingProject(false);
    }
  };

  const handleRetryEmail = async () => {
    if (!selectedEnquiry) return;
    setRetryingEmail(true);
    setActionFeedback(null);
    try {
      const res = await enquiryService.retryEmail(selectedEnquiry.id);
      setActionFeedback({ type: 'success', message: res.message });
      const updated = await enquiryService.getEnquiryDetail(selectedEnquiry.id);
      setSelectedEnquiry(updated);
      loadEnquiries();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err?.response?.data?.detail || 'Email delivery retry failed.' });
    } finally {
      setRetryingEmail(false);
    }
  };

  const handleDelete = async (id: number, refNum: string) => {
    if (!isMasterOrAdmin) {
      alert("Only MASTER or ADMIN accounts have authorization to delete enquiries.");
      return;
    }
    if (!window.confirm(`Permanently delete enquiry ${refNum}? This action cannot be undone.`)) {
      return;
    }
    try {
      await enquiryService.deleteEnquiry(id);
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(null);
      }
      loadEnquiries();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete enquiry");
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim() || !newMessage.trim()) {
      alert("Name, Email, Phone, and Project Brief are required.");
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", newName.trim());
      formData.append("email", newEmail.trim());
      formData.append("phone", newPhone.trim());
      formData.append("project_type", newType);
      formData.append("location", newLocation.trim());
      formData.append("budget", newBudget.trim());
      formData.append("timeline", newTimeline.trim());
      formData.append("message", newMessage.trim());
      formData.append("source", "owner_dashboard");

      await enquiryService.submitEnquiry(formData);
      setShowCreateModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewLocation("");
      setNewBudget("");
      setNewTimeline("");
      setNewMessage("");
      loadEnquiries();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create manual enquiry");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case "NEW":
        return "sd-badge-new";
      case "CONTACTED":
        return "sd-badge-contacted";
      case "CONSULTATION":
      case "PROPOSAL":
        return "sd-badge-review";
      case "WON":
        return "sd-badge-completed";
      case "LOST":
      case "ARCHIVED":
        return "sd-badge-archived";
      default:
        return "sd-badge-default";
    }
  };

  return (
    <div className="sd-admin-section sd-fade-in">
      {/* Top Action Bar */}
      <div className="sd-admin-header-row">
        <div>
          <span className="sd-admin-eyebrow">STUDIO DESIRE — CLIENT PIPELINE</span>
          <h1 className="sd-admin-title">Project Enquiries & Leads Pipeline</h1>
          <p className="sd-admin-subtitle">
            Manage inbound client inquiries ({total} total), convert leads to Client & Project records, and track review notes.
          </p>
        </div>

        <div className="sd-admin-header-actions">
          <button
            type="button"
            className="sd-admin-btn-secondary"
            onClick={loadEnquiries}
            title="Refresh list"
          >
            &#x21bb; Refresh
          </button>
          <button
            type="button"
            className="sd-admin-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Log Manual Lead
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="sd-enquiries-filter-bar">
        <div className="sd-enquiry-status-tabs">
          {STATUS_LIST.map((st) => (
            <button
              key={st}
              type="button"
              className={`sd-filter-tab-btn ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="sd-enquiry-search-form">
          <input
            type="text"
            className="sd-admin-input-small"
            placeholder="Search by client, email, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="sd-admin-btn-small">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              className="sd-admin-btn-text"
              onClick={() => {
                setSearchQuery("");
                loadEnquiries();
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="sd-admin-loading">Loading client project enquiries...</div>
      ) : error ? (
        <div className="sd-admin-error">{error}</div>
      ) : enquiries.length === 0 ? (
        <div className="sd-admin-empty">
          <p>No project enquiries found matching the selected filter.</p>
        </div>
      ) : (
        <div className="sd-table-wrapper">
          <table className="sd-admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Typology</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th>Material</th>
                <th>Conversion Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enq) => (
                <tr
                  key={enq.id}
                  className={`sd-clickable-row ${
                    selectedEnquiry?.id === enq.id ? "row-selected" : ""
                  }`}
                  onClick={() => openDetail(enq.id)}
                >
                  <td className="sd-font-mono font-bold">{enq.reference_number}</td>
                  <td>
                    <div className="sd-table-client">
                      <span className="sd-client-name">{enq.name}</span>
                      <span className="sd-client-contact">
                        {enq.email} &bull; {enq.phone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="sd-type-pill">{enq.project_type}</span>
                  </td>
                  <td className="sd-table-date">{formatDate(enq.created_at)}</td>
                  <td>
                    <span className={`sd-badge ${getStatusBadgeClass(enq.status)}`}>
                      {enq.status}
                    </span>
                  </td>
                  <td>
                    {(enq.attachments_count || enq.attachment_count || 0) > 0 ? (
                      <span className="sd-attachment-badge">
                        &#128206; {enq.attachments_count || enq.attachment_count} file{(enq.attachments_count || enq.attachment_count || 0) > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">Text only</span>
                    )}
                  </td>
                  <td>
                    {enq.converted_project_id ? (
                      <span className="sd-tag-converted">&#10003; Project Draft</span>
                    ) : enq.converted_client_id ? (
                      <span className="sd-tag-success">&#10003; Client Registered</span>
                    ) : (
                      <span className="text-muted text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="sd-action-link-btn"
                      onClick={() => openDetail(enq.id)}
                    >
                      Open Lead
                    </button>
                    {isMasterOrAdmin && (
                      <button
                        type="button"
                        className="sd-action-link-btn text-danger ml-2"
                        onClick={() => handleDelete(enq.id, enq.reference_number)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enquiry Detail Drawer / Modal View */}
      {selectedEnquiry && (
        <div className="sd-detail-drawer-backdrop" onClick={() => setSelectedEnquiry(null)}>
          <div className="sd-detail-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="sd-drawer-header">
              <div>
                <span className="sd-drawer-eyebrow">
                  LEAD MANAGEMENT DOSSIER &bull; {selectedEnquiry.source.toUpperCase()}
                </span>
                <h2 className="sd-drawer-title">
                  {selectedEnquiry.reference_number} — {selectedEnquiry.name}
                </h2>
              </div>
              <button
                type="button"
                className="sd-drawer-close"
                onClick={() => setSelectedEnquiry(null)}
              >
                &times;
              </button>
            </div>

            {/* Feedback Alert */}
            {actionFeedback && (
              <div className={`sd-alert-banner ${actionFeedback.type}`}>
                {actionFeedback.message}
              </div>
            )}

            {loadingDetail ? (
              <div className="sd-admin-loading" style={{ padding: "3rem" }}>
                Loading enquiry dossier details...
              </div>
            ) : (
              <div className="sd-drawer-body">
                {/* Top Quick Actions Bar */}
                <div className="sd-drawer-quick-actions" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                  {!selectedEnquiry.converted_client_id && (
                    <button
                      type="button"
                      className="sd-admin-btn-secondary"
                      onClick={handleConvertToClient}
                      disabled={convertingClient}
                    >
                      {convertingClient ? "Registering Client..." : "+ Convert to Client"}
                    </button>
                  )}

                  {!selectedEnquiry.converted_project_id ? (
                    <button
                      type="button"
                      className="sd-admin-btn-primary"
                      onClick={handleConvertToProject}
                      disabled={convertingProject}
                    >
                      {convertingProject
                        ? "Creating Draft Project..."
                        : "+ Convert to Project"}
                    </button>
                  ) : (
                    <div className="sd-converted-notice">
                      <span>&#10003; Project draft created (ID #{selectedEnquiry.converted_project_id})</span>
                      {onNavigateTab && (
                        <button
                          type="button"
                          className="sd-admin-btn-small ml-2"
                          onClick={() => {
                            setSelectedEnquiry(null);
                            onNavigateTab("projects");
                          }}
                        >
                          Go to Projects &rarr;
                        </button>
                      )}
                    </div>
                  )}

                  {!selectedEnquiry.email_sent && (
                    <button
                      type="button"
                      className="sd-admin-btn-secondary"
                      onClick={handleRetryEmail}
                      disabled={retryingEmail}
                    >
                      {retryingEmail ? "Sending..." : "Retry Email"}
                    </button>
                  )}
                </div>

                {/* Client & Project Information Grid */}
                <div className="sd-drawer-grid-2">
                  <div className="sd-drawer-card">
                    <h3 className="sd-card-section-title">CLIENT PROFILE</h3>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Full Name</span>
                      <span className="sd-kv-val">{selectedEnquiry.name}</span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Email</span>
                      <span className="sd-kv-val">
                        <a href={`mailto:${selectedEnquiry.email}`}>{selectedEnquiry.email}</a>
                      </span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Phone</span>
                      <span className="sd-kv-val">
                        <a href={`tel:${selectedEnquiry.phone}`}>{selectedEnquiry.phone}</a>
                      </span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Submitted On</span>
                      <span className="sd-kv-val">{formatDate(selectedEnquiry.created_at)}</span>
                    </div>
                  </div>

                  <div className="sd-drawer-card">
                    <h3 className="sd-card-section-title">PROJECT SPECIFICATIONS</h3>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Typology</span>
                      <span className="sd-kv-val font-semibold">{selectedEnquiry.project_type}</span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Location</span>
                      <span className="sd-kv-val">{selectedEnquiry.location || "Not specified"}</span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Budget Range</span>
                      <span className="sd-kv-val">{selectedEnquiry.budget || "Undisclosed"}</span>
                    </div>
                    <div className="sd-card-kv">
                      <span className="sd-kv-label">Timeline</span>
                      <span className="sd-kv-val">{selectedEnquiry.timeline || "Not specified"}</span>
                    </div>
                  </div>
                </div>

                {/* Project Brief / Message */}
                <div className="sd-drawer-card">
                  <h3 className="sd-card-section-title">PROJECT BRIEF & SPATIAL VISION</h3>
                  <div className="sd-brief-content">
                    {selectedEnquiry.message}
                  </div>
                </div>

                {/* Attachments / Rough Designs */}
                <div className="sd-drawer-card">
                  <div className="sd-flex-between">
                    <h3 className="sd-card-section-title">
                      SUBMITTED MATERIAL & ROUGH DESIGNS ({selectedEnquiry.attachments.length})
                    </h3>
                  </div>

                  {selectedEnquiry.attachments.length === 0 ? (
                    <p className="text-muted text-sm py-2">
                      No files or sketches uploaded with this enquiry (text submission only).
                    </p>
                  ) : (
                    <div className="sd-attachments-grid">
                      {selectedEnquiry.attachments.map((att) => {
                        const isImg = att.file_type === 'image';
                        return (
                          <div key={att.id} className="sd-attachment-item-card">
                            {isImg ? (
                              <div className="sd-att-preview-wrap">
                                <StudioImage
                                  src={att.url}
                                  alt={att.original_filename}
                                  className="sd-att-thumb"
                                  showMissingState={false}
                                />
                              </div>
                            ) : (
                              <div className="sd-att-file-icon">
                                <span className="sd-att-ext font-mono">
                                  {att.original_filename.split('.').pop()?.toUpperCase() || 'FILE'}
                                </span>
                              </div>
                            )}
                            <div className="sd-att-details">
                              <span className="sd-att-filename" title={att.original_filename}>
                                {att.original_filename}
                              </span>
                              <span className="sd-att-meta">
                                {formatFileSize(att.file_size)} &bull; {att.file_type}
                              </span>
                              <div className="sd-att-links">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sd-att-link"
                                >
                                  Preview / Open &rarr;
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Internal Studio Notes & Status Workflow */}
                <div className="sd-drawer-card sd-internal-card">
                  <h3 className="sd-card-section-title">INTERNAL STATUS & TEAM NOTES</h3>

                  <div className="sd-drawer-grid-2">
                    <div className="sd-form-group">
                      <label className="sd-form-label">Lifecycle Status</label>
                      <select
                        className="sd-admin-select"
                        value={internalStatus}
                        onChange={(e) => setInternalStatus(e.target.value)}
                      >
                        {STATUS_LIST.filter(s => s !== "ALL").map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sd-form-group">
                      <label className="sd-form-label">Assigned Principal / Designer</label>
                      <input
                        type="text"
                        className="sd-admin-input"
                        placeholder="e.g. Zenith Suthar, Chetna Bhati"
                        value={assignedUser}
                        onChange={(e) => setAssignedUser(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sd-form-group">
                    <label className="sd-form-label">Internal Architecture Notes</label>
                    <textarea
                      className="sd-admin-textarea"
                      rows={4}
                      placeholder="Private team notes, preliminary site observations, follow-up calls, design direction..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                  </div>

                  <div className="sd-flex-end">
                    <button
                      type="button"
                      className="sd-admin-btn-primary"
                      onClick={handleSaveInternal}
                      disabled={savingNotes}
                    >
                      {savingNotes ? "Saving Changes..." : "Save Internal Updates"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Log Manual Enquiry */}
      {showCreateModal && (
        <div className="sd-admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="sd-admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sd-admin-modal-header">
              <h2 className="sd-admin-modal-title">Log Manual Project Lead</h2>
              <button
                type="button"
                className="sd-drawer-close"
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateManual}>
              <div className="sd-admin-modal-body">
                <div className="sd-form-group">
                  <label className="sd-form-label">Client Full Name *</label>
                  <input
                    type="text"
                    className="sd-admin-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="sd-form-grid-2">
                  <div className="sd-form-group">
                    <label className="sd-form-label">Email Address *</label>
                    <input
                      type="email"
                      className="sd-admin-input"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="sd-admin-input"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="sd-form-grid-3">
                  <div className="sd-form-group">
                    <label className="sd-form-label">Typology *</label>
                    <select
                      className="sd-admin-select"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <option value="Residential Villa">Residential Villa</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Office">Office</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Retail">Retail</option>
                      <option value="Hospitality">Hospitality</option>
                      <option value="Furniture / Product">Furniture / Product</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-form-label">Location</label>
                    <input
                      type="text"
                      className="sd-admin-input"
                      placeholder="e.g. Surat, Gujarat"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                    />
                  </div>
                  <div className="sd-form-group">
                    <label className="sd-form-label">Budget</label>
                    <input
                      type="text"
                      className="sd-admin-input"
                      placeholder="e.g. ₹50 Lakhs"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                    />
                  </div>
                </div>

                <div className="sd-form-group">
                  <label className="sd-form-label">Timeline</label>
                  <input
                    type="text"
                    className="sd-admin-input"
                    placeholder="e.g. 6 to 9 months"
                    value={newTimeline}
                    onChange={(e) => setNewTimeline(e.target.value)}
                  />
                </div>

                <div className="sd-form-group">
                  <label className="sd-form-label">Project Brief & Details *</label>
                  <textarea
                    className="sd-admin-textarea"
                    rows={4}
                    placeholder="Brief description of requirements..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sd-admin-modal-footer">
                <button
                  type="button"
                  className="sd-admin-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sd-admin-btn-primary"
                  disabled={creating}
                >
                  {creating ? "Saving..." : "Log Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
