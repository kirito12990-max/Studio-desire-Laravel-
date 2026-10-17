import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ProjectWorkspaceData } from "../types/admin";
import { ProjectTask } from "../types/task";
import { ProjectMilestone } from "../types/milestone";
import { ProjectMaterial, MaterialStatus } from "../types/material";
import { ProjectMeeting } from "../types/meeting";
import { ProjectFileItem } from "../types/file";
import { ProjectFinanceSummary } from "../types/finance";
import { UnifiedMediaItem } from "../types/admin";
import { WorkspaceMediaTab } from "./workspace/WorkspaceMediaTab";

interface ProjectWorkspaceProps {
  projectId: number;
  onBack: () => void;
  onOpenPublicSite?: (slug: string) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projectId,
  onBack,
  onOpenPublicSite
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [workspace, setWorkspace] = useState<ProjectWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Data States
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [meetings, setMeetings] = useState<ProjectMeeting[]>([]);
  const [files, setFiles] = useState<ProjectFileItem[]>([]);
  const [finance, setFinance] = useState<ProjectFinanceSummary | null>(null);
  const [mediaItems, setMediaItems] = useState<UnifiedMediaItem[]>([]);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [confirmPublishAction, setConfirmPublishAction] = useState<boolean | null>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  // Media workspace states
  const [editingMedia, setEditingMedia] = useState<UnifiedMediaItem | null>(null);
  const [mediaPreviewQr, setMediaPreviewQr] = useState<{ url: string; title: string } | null>(null);
  const [uploadingMediaVR, setUploadingMediaVR] = useState<number | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  // Forms
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "MEDIUM", assigned_to: "", due_date: "" });
  const [materialForm, setMaterialForm] = useState<{
    name: string;
    category: string;
    supplier: string;
    reference: string;
    price: number;
    quantity: string;
    notes: string;
    status: MaterialStatus;
  }>({ name: "", category: "Marble", supplier: "", reference: "", price: 0, quantity: "", notes: "", status: "PROPOSED" });
  const [meetingForm, setMeetingForm] = useState({ title: "", date: "", time: "", location: "Studio Desire HQ", meeting_type: "Client Consultation", notes: "", participants: "" });
  const [paymentForm, setPaymentForm] = useState({ title: "", amount: 0, payment_date: "", payment_method: "Bank Transfer", reference_number: "", status: "RECEIVED", notes: "" });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", order: 1 });
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    loadWorkspace();
  }, [projectId]);

  const loadWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, catList] = await Promise.all([
        adminService.getProjectWorkspace(projectId),
        adminService.getAdminCategories().catch(() => [])
      ]);
      setWorkspace(data);
      setEditForm(data.project);
      setAvailableCategories(catList);

      // Fetch related collections
      const [tList, mList, matList, meetList, fList, finData, medList] = await Promise.all([
        adminService.getTasks({ projectId }),
        adminService.getProjectMilestones(projectId),
        adminService.getMaterials({ projectId }),
        adminService.getMeetings({ projectId }),
        adminService.getFiles({ projectId }),
        adminService.getProjectFinance(projectId),
        adminService.getUnifiedMedia({ projectId })
      ]);

      setTasks(tList);
      setMilestones(mList);
      setMaterials(matList);
      setMeetings(meetList);
      setFiles(fList);
      setFinance(finData);
      setMediaItems(medList);
    } catch (err: any) {
      setError(err.message || "Failed to load project workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!workspace) return;
    try {
      const res = await adminService.togglePublishProject(projectId);
      setWorkspace({
        ...workspace,
        project: { ...workspace.project, is_published: res.is_published }
      });
      setConfirmPublishAction(null);
    } catch (err: any) {
      alert("Failed to toggle publish status: " + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createTask({
        project_id: projectId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assigned_to: taskForm.assigned_to,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : undefined
      });
      setTasks([created, ...tasks]);
      setShowTaskModal(false);
      setTaskForm({ title: "", description: "", priority: "MEDIUM", assigned_to: "", due_date: "" });
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    }
  };

  const handleToggleTaskStatus = async (task: ProjectTask, newStatus: string) => {
    try {
      await adminService.setTaskStatus(task.id, newStatus);
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createMaterial({
        project_id: projectId,
        ...materialForm
      });
      setMaterials([created, ...materials]);
      setShowMaterialModal(false);
      setMaterialForm({ name: "", category: "Marble", supplier: "", reference: "", price: 0, quantity: "", notes: "", status: "PROPOSED" });
    } catch (err: any) {
      alert("Failed to add material: " + err.message);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createMeeting({
        project_id: projectId,
        client_id: workspace?.client?.id,
        ...meetingForm
      });
      setMeetings([created, ...meetings]);
      setShowMeetingModal(false);
      setMeetingForm({ title: "", date: "", time: "", location: "Studio Desire HQ", meeting_type: "Client Consultation", notes: "", participants: "" });
    } catch (err: any) {
      alert("Failed to schedule meeting: " + err.message);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.logPayment({
        project_id: projectId,
        title: paymentForm.title,
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        status: paymentForm.status,
        notes: paymentForm.notes
      });
      setShowPaymentModal(false);
      // Reload finance ledger
      const finData = await adminService.getProjectFinance(projectId);
      setFinance(finData);
      setPaymentForm({ title: "", amount: 0, payment_date: "", payment_method: "Bank Transfer", reference_number: "", status: "RECEIVED", notes: "" });
    } catch (err: any) {
      alert("Failed to log payment: " + err.message);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminService.createProjectMilestone(projectId, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        order: Number(milestoneForm.order),
        status: "PENDING"
      });
      setMilestones([...milestones, created]);
      setShowMilestoneModal(false);
      setMilestoneForm({ title: "", description: "", order: milestones.length + 1 });
    } catch (err: any) {
      alert("Failed to add milestone: " + err.message);
    }
  };

  const handleToggleMilestoneStatus = async (m: ProjectMilestone, newStatus: string) => {
    try {
      const updated = await adminService.updateProjectMilestone(m.id, { status: newStatus as any });
      setMilestones(milestones.map(item => item.id === m.id ? updated : item));
    } catch (err: any) {
      alert("Failed to update milestone: " + err.message);
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await adminService.deleteProjectMilestone(id);
      setMilestones(milestones.filter(item => item.id !== id));
      const reloaded = await adminService.getProjectWorkspace(projectId);
      setWorkspace(reloaded);
    } catch (err: any) {
      alert("Failed to delete milestone: " + err.message);
    }
  };

  const handleSaveProjectEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await adminService.updateProject(projectId, editForm);
      if (workspace) {
        setWorkspace({ ...workspace, project: { ...workspace.project, ...updated } });
      }
      setShowEditProjectModal(false);
    } catch (err: any) {
      alert("Failed to update project: " + err.message);
    }
  };

  const handleSetCoverPhoto = async (item: UnifiedMediaItem) => {
    if (!workspace) return;
    try {
      await adminService.updateProject(projectId, { cover_image: item.url });
      setWorkspace({
        ...workspace,
        project: { ...workspace.project, cover_image: item.url }
      });
    } catch (err: any) {
      alert("Failed to set cover photo: " + err.message);
    }
  };

  const handleReorderMedia = async (item: UnifiedMediaItem, direction: number) => {
    const index = mediaItems.findIndex((m) => m.id === item.id);
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mediaItems.length) return;

    const targetItem = mediaItems[targetIndex];
    const currentSort = item.sort_order || index;
    const targetSort = targetItem.sort_order || targetIndex;

    const newSortCurrent = targetSort;
    const newSortTarget = currentSort === targetSort ? (direction > 0 ? targetSort - 1 : targetSort + 1) : currentSort;

    try {
      await Promise.all([
        adminService.updateMediaItem(item.id, { sort_order: newSortCurrent }),
        adminService.updateMediaItem(targetItem.id, { sort_order: newSortTarget })
      ]);
      const reloaded = await adminService.getUnifiedMedia({ projectId });
      setMediaItems(reloaded);
    } catch (err: any) {
      alert("Failed to reorder media: " + err.message);
    }
  };

  const handleSaveMediaEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;
    try {
      const cleanVr = editingMedia.vr_url?.trim() || null;
      const updated = await adminService.updateMediaItem(editingMedia.id, {
        caption: editingMedia.caption,
        alt_text: editingMedia.alt_text,
        room_name: editingMedia.room_name,
        vr_url: cleanVr,
        show_qr: editingMedia.show_qr,
        sort_order: editingMedia.sort_order
      });
      setMediaItems(mediaItems.map(m => m.id === updated.id ? updated : m));
      setEditingMedia(null);
    } catch (err: any) {
      alert("Failed to update media: " + err.message);
    }
  };

  const handleToggleMediaQr = async (item: UnifiedMediaItem, showQr: boolean) => {
    try {
      const updated = await adminService.updateMediaItem(item.id, { show_qr: showQr });
      setMediaItems(mediaItems.map(m => m.id === updated.id ? updated : m));
    } catch (err: any) {
      alert("Failed to update QR visibility: " + err.message);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    try {
      await adminService.uploadBulk(Array.from(files), projectId);
      const reloaded = await adminService.getUnifiedMedia({ projectId });
      setMediaItems(reloaded);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleUploadItemVRBuild = async (file: File, mediaId: number) => {
    setUploadingMediaVR(mediaId);
    try {
      await adminService.uploadVRBuild(file, "render", mediaId);
      const reloaded = await adminService.getUnifiedMedia({ projectId });
      setMediaItems(reloaded);
    } catch (err: any) {
      alert("Failed to upload VR package: " + err.message);
    } finally {
      setUploadingMediaVR(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem 0", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.85rem" }}>
        Loading project workspace & records...
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div style={{ padding: "2rem 0" }}>
        <div className="admin-error-banner">{error || "Project not found"}</div>
        <button className="admin-btn admin-btn-secondary" onClick={onBack} style={{ marginTop: "1rem" }}>
          ← Back to Projects
        </button>
      </div>
    );
  }

  const { project, client, counts, progress_percentage } = workspace;

  return (
    <div className="project-workspace">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="admin-btn admin-btn-secondary" onClick={onBack} style={{ padding: "0.4rem 0.8rem", fontSize: "0.72rem" }}>
            ← Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 600, margin: 0, letterSpacing: "0.05em", color: "var(--admin-text-main)" }}>
                {project.title}
              </h1>
              <span className={`project-card-badge ${project.is_published ? "badge-published" : "badge-draft"}`}>
                {project.is_published ? "Published" : "Draft"}
              </span>
              <span className="badge-demo" style={{ backgroundColor: "rgba(212, 175, 55, 0.15)", color: "var(--admin-accent)" }}>
                {project.status}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.3rem" }}>
              {project.category} · {project.location} · {project.year} {client ? `· Client: ${client.name}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => setShowEditProjectModal(true)}
            style={{ fontSize: "0.72rem" }}
          >
            Edit Details
          </button>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => setConfirmPublishAction(project.is_published ? false : true)}
            style={{ fontSize: "0.72rem" }}
          >
            {project.is_published ? "Unpublish Site" : "Publish to Site"}
          </button>
          {onOpenPublicSite && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => onOpenPublicSite(project.slug)}
              style={{ fontSize: "0.72rem" }}
            >
              Public Dossier ↗
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Destructive Publish/Unpublish */}
      {confirmPublishAction !== null && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>
              {confirmPublishAction ? "Publish Project to Public Website?" : "Unpublish Project from Public Website?"}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              {confirmPublishAction
                ? "This project dossier and its published photos/renders will immediately become visible to public visitors on the Studio Desire website."
                : "This project will immediately be removed from the public website archive and will only be accessible within the Owner System."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => setConfirmPublishAction(null)}>
                Cancel
              </button>
              <button
                className={`admin-btn ${confirmPublishAction ? "admin-btn-primary" : "admin-btn-danger"}`}
                onClick={handleTogglePublish}
              >
                {confirmPublishAction ? "Confirm Publish" : "Confirm Unpublish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="workspace-tabs-bar">
        {[
          { id: "overview", label: "Overview" },
          { id: "timeline", label: `Timeline & Milestones (${milestones.length})` },
          { id: "tasks", label: `Tasks (${tasks.length})` },
          { id: "materials", label: `Materials (${materials.length})` },
          { id: "media", label: `Photos & Media (${mediaItems.length})` },
          { id: "files", label: `Files & Contracts (${files.length})` },
          { id: "meetings", label: `Meetings (${meetings.length})` },
          { id: "finance", label: "Finance & Payments" }
        ].map(tab => (
          <button
            key={tab.id}
            className={`workspace-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="workspace-overview-grid">
          {/* Left Column: Key Stats & Progress */}
          <div className="workspace-col-main">
            {/* Progress Card */}
            <div className="admin-stat-card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span className="admin-stat-label">Milestone Execution Progress</span>
                <strong style={{ color: "var(--admin-accent)", fontFamily: "var(--admin-font-mono)", fontSize: "0.9rem" }}>
                  {progress_percentage}%
                </strong>
              </div>
              <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progress_percentage}%`,
                    height: "100%",
                    backgroundColor: "var(--admin-accent)",
                    transition: "width 0.4s ease"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--admin-text-dim)", marginTop: "0.5rem", fontFamily: "var(--admin-font-mono)" }}>
                <span>{milestones.filter(m => m.status === "COMPLETED").length} Completed</span>
                <span>{milestones.length} Total Milestones</span>
              </div>
            </div>

            {/* Project Overview Details */}
            <div className="admin-surface-card" style={{ padding: "1.4rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.88rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
                Design Charter & Description
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--admin-text-main)", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                {project.description || "No project brief provided."}
              </p>
            </div>

            {/* Quick Content Matrix */}
            <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", marginBottom: "1.5rem" }}>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Photos</div>
                <div className="admin-stat-value">{counts.photos}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Videos</div>
                <div className="admin-stat-value">{counts.videos}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">3D Renders</div>
                <div className="admin-stat-value">{counts.renders_3d}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Blueprints</div>
                <div className="admin-stat-value">{counts.blueprints}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Open Tasks</div>
                <div className="admin-stat-value">{tasks.filter(t => t.status !== "COMPLETED").length}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Client Dossier & Financial Summary */}
          <div className="workspace-col-sidebar">
            {/* Client Card */}
            <div className="admin-surface-card" style={{ padding: "1.4rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
                Client Details
              </h3>
              {client ? (
                <div style={{ fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--admin-text-main)", marginBottom: "0.4rem" }}>
                    {client.name}
                  </div>
                  {client.company && <div style={{ color: "var(--admin-text-muted)" }}>{client.company}</div>}
                  <div style={{ marginTop: "0.8rem", color: "var(--admin-text-dim)" }}>
                    <div>📞 {client.phone || "No phone recorded"}</div>
                    <div>✉️ {client.email || "No email recorded"}</div>
                    <div>📍 {client.address || "Address not provided"}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                  No client linked yet.
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="admin-surface-card" style={{ padding: "1.4rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
                Financial Snapshot
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--admin-text-muted)" }}>Project Budget:</span>
                  <strong style={{ color: "var(--admin-text-main)" }}>₹{(project.budget || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--admin-text-muted)" }}>Total Value:</span>
                  <strong style={{ color: "var(--admin-text-main)" }}>₹{(project.project_value || project.budget || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--admin-text-muted)" }}>Received:</span>
                  <strong style={{ color: "#22c55e" }}>₹{(project.amount_received || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--admin-text-muted)" }}>Pending Balance:</span>
                  <strong style={{ color: "#ef4444" }}>₹{(project.amount_pending || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TIMELINE & MILESTONES */}
      {activeTab === "timeline" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Design & Execution Milestones
            </h2>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowMilestoneModal(true)}>
              + Add Milestone
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {milestones.map((m, idx) => (
              <div
                key={m.id}
                className="admin-surface-card"
                style={{
                  padding: "1.2rem 1.4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: m.status === "COMPLETED" ? "4px solid #22c55e" : m.status === "IN_PROGRESS" ? "4px solid var(--admin-accent)" : "4px solid var(--admin-border)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                    <span style={{ fontFamily: "var(--admin-font-mono)", fontSize: "0.75rem", color: "var(--admin-text-dim)" }}>
                      Step {idx + 1}
                    </span>
                    <strong style={{ fontSize: "0.9rem", color: "var(--admin-text-main)" }}>{m.title}</strong>
                    <span className={`badge-demo ${m.status === "COMPLETED" ? "badge-published" : ""}`}>
                      {m.status}
                    </span>
                  </div>
                  {m.description && (
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
                      {m.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {m.status !== "COMPLETED" ? (
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem" }}
                      onClick={() => handleToggleMilestoneStatus(m, "COMPLETED")}
                    >
                      Mark Complete ✓
                    </button>
                  ) : (
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem" }}
                      onClick={() => handleToggleMilestoneStatus(m, "IN_PROGRESS")}
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    className="admin-btn admin-btn-danger"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem" }}
                    onClick={() => handleDeleteMilestone(m.id)}
                    title="Delete Milestone"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TASKS */}
      {activeTab === "tasks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Project Tasks & Action Items
            </h2>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowTaskModal(true)}>
              + Add Task
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {tasks.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                No tasks created for this project yet.
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className="admin-surface-card"
                  style={{ padding: "1rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <strong style={{ fontSize: "0.88rem", color: task.status === "COMPLETED" ? "var(--admin-text-dim)" : "var(--admin-text-main)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none" }}>
                        {task.title}
                      </strong>
                      <span className={`badge-demo ${task.priority === "URGENT" ? "badge-danger" : ""}`}>
                        {task.priority}
                      </span>
                      <span className={`badge-demo ${task.status === "COMPLETED" ? "badge-published" : ""}`}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ marginTop: "0.4rem", fontSize: "0.68rem", color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)" }}>
                      Assignee: {task.assigned_to || "Unassigned"} {task.due_date ? `· Due: ${new Date(task.due_date).toLocaleDateString()}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {task.status !== "COMPLETED" ? (
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem" }}
                        onClick={() => handleToggleTaskStatus(task, "COMPLETED")}
                      >
                        Complete ✓
                      </button>
                    ) : (
                      <button
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem" }}
                        onClick={() => handleToggleTaskStatus(task, "TODO")}
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MATERIALS */}
      {activeTab === "materials" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Material Board & Specifications
            </h2>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowMaterialModal(true)}>
              + Add Material
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.2rem" }}>
            {materials.length === 0 ? (
              <div style={{ padding: "2rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                No materials specified yet.
              </div>
            ) : (
              materials.map(mat => (
                <div key={mat.id} className="admin-surface-card" style={{ padding: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "var(--admin-text-main)" }}>{mat.name}</strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                        {mat.category} {mat.supplier ? `· ${mat.supplier}` : ""}
                      </div>
                    </div>
                    <span className="badge-demo">{mat.status}</span>
                  </div>
                  {mat.reference && (
                    <div style={{ fontSize: "0.72rem", color: "var(--admin-accent)", fontFamily: "var(--admin-font-mono)", marginBottom: "0.4rem" }}>
                      Ref: {mat.reference}
                    </div>
                  )}
                  {mat.notes && (
                    <p style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", margin: "0.4rem 0" }}>
                      {mat.notes}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--admin-font-mono)", marginTop: "0.8rem", color: "var(--admin-text-dim)" }}>
                    <span>Qty: {mat.quantity || "N/A"}</span>
                    <strong>₹{mat.price?.toLocaleString()}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MEDIA */}
      {activeTab === "media" && (
        <WorkspaceMediaTab
          workspace={workspace}
          mediaItems={mediaItems}
          isUploadingMedia={isUploadingMedia}
          uploadingMediaVR={uploadingMediaVR}
          editingMedia={editingMedia}
          setEditingMedia={setEditingMedia}
          mediaPreviewQr={mediaPreviewQr}
          setMediaPreviewQr={setMediaPreviewQr}
          onOpenPublicSite={onOpenPublicSite}
          handleMediaUpload={handleMediaUpload}
          handleSetCoverPhoto={handleSetCoverPhoto}
          handleReorderMedia={handleReorderMedia}
          handleToggleMediaQr={handleToggleMediaQr}
          handleSaveMediaEdits={handleSaveMediaEdits}
          handleUploadItemVRBuild={handleUploadItemVRBuild}
        />
      )}

      {/* TAB CONTENT: FILES */}
      {activeTab === "files" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Contracts, Quotations & Documents
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {files.length === 0 ? (
              <div style={{ padding: "2rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                No documents uploaded for this project yet.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="admin-surface-card" style={{ padding: "1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.88rem", color: "var(--admin-text-main)" }}>{file.name}</strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.2rem" }}>
                      {file.category} · {file.file_type?.toUpperCase()} {file.uploaded_by ? `· Uploaded by ${file.uploaded_by}` : ""}
                    </div>
                  </div>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.68rem", textDecoration: "none" }}
                  >
                    View Document ↗
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MEETINGS */}
      {activeTab === "meetings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Consultations & Site Visits
            </h2>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowMeetingModal(true)}>
              + Schedule Meeting
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {meetings.length === 0 ? (
              <div style={{ padding: "2rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.78rem" }}>
                No meetings scheduled.
              </div>
            ) : (
              meetings.map(meet => (
                <div key={meet.id} className="admin-surface-card" style={{ padding: "1rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: "var(--admin-text-main)" }}>{meet.title}</strong>
                      <span className="badge-demo">{meet.status}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", marginTop: "0.3rem" }}>
                      📅 {meet.date} {meet.time ? `at ${meet.time}` : ""} · 📍 {meet.location} · {meet.meeting_type}
                    </div>
                    {meet.notes && (
                      <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                        {meet.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: FINANCE */}
      {activeTab === "finance" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Payment Ledger & Budget Tracking
            </h2>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowPaymentModal(true)}>
              + Log Payment
            </button>
          </div>

          {finance && (
            <div className="admin-stats-grid" style={{ marginBottom: "1.8rem" }}>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Project Value</div>
                <div className="admin-stat-value">₹{finance.project_value?.toLocaleString()}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Amount Received</div>
                <div className="admin-stat-value" style={{ color: "#22c55e" }}>₹{finance.amount_received?.toLocaleString()}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Amount Pending</div>
                <div className="admin-stat-value" style={{ color: "#ef4444" }}>₹{finance.amount_pending?.toLocaleString()}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Collection Progress</div>
                <div className="admin-stat-value">{finance.payment_progress_percentage}%</div>
              </div>
            </div>
          )}

          <div className="admin-surface-card" style={{ padding: "1.4rem" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 1rem" }}>
              Payment Transactions
            </h3>

            {finance?.payments && finance.payments.length > 0 ? (
              <table className="admin-table" style={{ width: "100%", textAlign: "left", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ color: "var(--admin-text-dim)", fontFamily: "var(--admin-font-mono)", borderBottom: "1px solid var(--admin-border)" }}>
                    <th style={{ padding: "0.6rem 0" }}>Title / Milestone</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Ref #</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {finance.payments.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--admin-border)", fontFamily: "var(--admin-font-mono)" }}>
                      <td style={{ padding: "0.8rem 0", color: "var(--admin-text-main)", fontWeight: 500 }}>{p.title}</td>
                      <td>{p.payment_date || "—"}</td>
                      <td>{p.payment_method}</td>
                      <td>{p.reference_number || "—"}</td>
                      <td><span className="badge-published">{p.status}</span></td>
                      <td style={{ textAlign: "right", color: "#22c55e", fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)", fontSize: "0.75rem" }}>
                No payment records logged yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD TASK */}
      {showTaskModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Create Project Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="admin-form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g., Finalize Living Room marble selection"
                />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Details and deliverables..."
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Assigned To</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    placeholder="Username / Designer"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MATERIAL */}
      {showMaterialModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Add Material Specification</h3>
            <form onSubmit={handleCreateMaterial}>
              <div className="admin-form-group">
                <label>Material Name *</label>
                <input
                  type="text"
                  required
                  value={materialForm.name}
                  onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                  placeholder="e.g., Italian Statuario Marble"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={materialForm.category}
                    onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  >
                    <option value="Marble">Marble</option>
                    <option value="Wood">Wood / Timber</option>
                    <option value="Fabric">Fabric & Upholstery</option>
                    <option value="Hardware">Hardware & Fittings</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Flooring">Flooring</option>
                    <option value="Paint">Paint & Finishes</option>
                    <option value="Sanitary">Sanitary Ware</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={materialForm.supplier}
                    onChange={e => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                    placeholder="Vendor / Supplier name"
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Unit Price (₹)</label>
                  <input
                    type="number"
                    value={materialForm.price}
                    onChange={e => setMaterialForm({ ...materialForm, price: Number(e.target.value) })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Quantity</label>
                  <input
                    type="text"
                    value={materialForm.quantity}
                    onChange={e => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                    placeholder="e.g., 250 sq.ft"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Reference Code / SKU</label>
                <input
                  type="text"
                  value={materialForm.reference}
                  onChange={e => setMaterialForm({ ...materialForm, reference: e.target.value })}
                  placeholder="e.g., STAT-04"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowMaterialModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Add Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG PAYMENT */}
      {showPaymentModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Log Project Payment</h3>
            <form onSubmit={handleLogPayment}>
              <div className="admin-form-group">
                <label>Payment Title / Stage *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.title}
                  onChange={e => setPaymentForm({ ...paymentForm, title: e.target.value })}
                  placeholder="e.g., Stage 1 Design Advance"
                />
              </div>
              <div className="admin-form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Reference Number / Transaction ID</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="e.g., UTR-987654321"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MILESTONE */}
      {showMilestoneModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Add Project Milestone</h3>
            <form onSubmit={handleCreateMilestone}>
              <div className="admin-form-group">
                <label>Milestone Title *</label>
                <input
                  type="text"
                  required
                  value={milestoneForm.title}
                  onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g., Modular Kitchen Installation"
                />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={milestoneForm.description}
                  onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Deliverables and criteria for sign-off..."
                />
              </div>
              <div className="admin-form-group">
                <label>Order / Sequence Number</label>
                <input
                  type="number"
                  value={milestoneForm.order}
                  onChange={e => setMilestoneForm({ ...milestoneForm, order: Number(e.target.value) })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowMilestoneModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE MEETING */}
      {showMeetingModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog">
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Schedule Consultation / Meeting</h3>
            <form onSubmit={handleCreateMeeting}>
              <div className="admin-form-group">
                <label>Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={meetingForm.title}
                  onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="e.g., 3D Render Presentation & Material Review"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    required
                    value={meetingForm.date}
                    onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Time</label>
                  <input
                    type="text"
                    value={meetingForm.time}
                    onChange={e => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    placeholder="e.g., 3:00 PM"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={meetingForm.location}
                  onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Meeting Type</label>
                <select
                  value={meetingForm.meeting_type}
                  onChange={e => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}
                >
                  <option value="Client Consultation">Client Consultation</option>
                  <option value="Design Review">Design Review</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Material Selection">Material Selection</option>
                  <option value="Budget Review">Budget Review</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Participants</label>
                <input
                  type="text"
                  value={meetingForm.participants}
                  onChange={e => setMeetingForm({ ...meetingForm, participants: e.target.value })}
                  placeholder="e.g., Hardikbhai, Principal Architect, Project Manager"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowMeetingModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROJECT DETAILS */}
      {showEditProjectModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: "600px" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Edit Project Charter</h3>
            <form onSubmit={handleSaveProjectEdits}>
              <div className="admin-form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title || ""}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status || "PLANNING"}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ENQUIRY">ENQUIRY</option>
                    <option value="CONSULTATION">CONSULTATION</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="DESIGN">DESIGN</option>
                    <option value="CLIENT_REVIEW">CLIENT_REVIEW</option>
                    <option value="APPROVAL">APPROVAL</option>
                    <option value="EXECUTION">EXECUTION</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Portfolio Category *</label>
                  <select
                    value={editForm.category_id || (availableCategories.find(c => c.name.toLowerCase() === (editForm.category || "").toLowerCase())?.id) || ""}
                    onChange={e => {
                      const catId = Number(e.target.value);
                      const matched = availableCategories.find(c => c.id === catId);
                      setEditForm({
                        ...editForm,
                        category_id: catId,
                        category: matched ? matched.name : editForm.category,
                        subcategory_id: undefined
                      });
                    }}
                    required
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Subcategory / Typology (Optional)</label>
                {(() => {
                  const currentCat = availableCategories.find(
                    c => c.id === editForm.category_id || c.name.toLowerCase() === (editForm.category || "").toLowerCase()
                  );
                  const subcats = currentCat?.subcategories || [];
                  return subcats.length > 0 ? (
                    <select
                      value={editForm.subcategory_id || (subcats.find((s: any) => s.name.toLowerCase() === (editForm.project_type || "").toLowerCase())?.id) || ""}
                      onChange={e => {
                        const subId = e.target.value ? Number(e.target.value) : undefined;
                        const matchedSub = subcats.find((s: any) => s.id === subId);
                        setEditForm({
                          ...editForm,
                          subcategory_id: subId,
                          project_type: matchedSub ? matchedSub.name : editForm.project_type
                        });
                      }}
                    >
                      <option value="">-- Select Typology (Optional) --</option>
                      {subcats.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editForm.project_type || ""}
                      onChange={e => setEditForm({ ...editForm, project_type: e.target.value })}
                      placeholder="e.g. Private Residence, Penthouse"
                    />
                  );
                })()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={editForm.location || ""}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={editForm.year || 2026}
                    onChange={e => setEditForm({ ...editForm, year: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Budget (₹)</label>
                  <input
                    type="number"
                    value={editForm.budget || 0}
                    onChange={e => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Project Value (₹)</label>
                  <input
                    type="number"
                    value={editForm.project_value || 0}
                    onChange={e => setEditForm({ ...editForm, project_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={editForm.description || ""}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.5rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowEditProjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
