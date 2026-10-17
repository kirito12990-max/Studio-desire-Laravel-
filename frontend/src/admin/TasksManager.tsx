import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { ProjectTask, TaskPriority, TaskStatus, TaskVisibility, TaskUser, TaskStats } from "../types/task";
import { AdminProject } from "../types/admin";

interface TasksManagerProps {
  onOpenProjectWorkspace?: (projectId: number) => void;
}

export const TasksManager: React.FC<TasksManagerProps> = ({
  onOpenProjectWorkspace
}) => {
  // State
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [assigneesList, setAssigneesList] = useState<TaskUser[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<string>("ALL");

  // Layout & Drag and Drop State
  const [viewLayout, setViewLayout] = useState<"board" | "list">("board");
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<ProjectTask | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    visibility: TaskVisibility;
    priority: TaskPriority;
    status: TaskStatus;
    project_id: number | null;
    assignee_ids: number[];
    start_date: string;
    due_date: string;
  }>({
    title: "",
    description: "",
    visibility: "WORKSPACE",
    priority: "MEDIUM",
    status: "TODO",
    project_id: null,
    assignee_ids: [],
    start_date: "",
    due_date: ""
  });

  // Edit Detail Form State
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    visibility: TaskVisibility;
    priority: TaskPriority;
    status: TaskStatus;
    project_id: number | null;
    assignee_ids: number[];
    start_date: string;
    due_date: string;
  }>({
    title: "",
    description: "",
    visibility: "WORKSPACE",
    priority: "MEDIUM",
    status: "TODO",
    project_id: null,
    assignee_ids: [],
    start_date: "",
    due_date: ""
  });

  useEffect(() => {
    loadInitialMeta();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [
    activeTab,
    selectedProjectFilter,
    selectedAssigneeFilter,
    selectedPriorityFilter,
    selectedStatusFilter,
    selectedVisibilityFilter,
    searchQuery
  ]);

  const loadInitialMeta = async () => {
    try {
      const [projData, usersData, statsData] = await Promise.all([
        adminService.getProjects(),
        adminService.getTaskAssignees(),
        adminService.getTaskStats()
      ]);
      setProjects(projData);
      setAssigneesList(usersData);
      setStats(statsData);
    } catch (err: any) {
      console.error("Meta loading error:", err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {
        view: activeTab !== "all" ? activeTab : undefined,
        search: searchQuery.trim() ? searchQuery.trim() : undefined,
        status: selectedStatusFilter !== "ALL" ? selectedStatusFilter : undefined,
        priority: selectedPriorityFilter !== "ALL" ? selectedPriorityFilter : undefined,
        visibility: selectedVisibilityFilter !== "ALL" ? selectedVisibilityFilter : undefined
      };

      if (selectedProjectFilter === "NONE") {
        filters.projectId = 0; // 0 represents studio task without project
      } else if (selectedProjectFilter !== "ALL") {
        filters.projectId = Number(selectedProjectFilter);
      }

      if (selectedAssigneeFilter !== "ALL") {
        filters.assigneeId = Number(selectedAssigneeFilter);
      }

      const [taskList, statsData] = await Promise.all([
        adminService.getTasks(filters),
        adminService.getTaskStats()
      ]);

      setTasks(taskList);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load studio tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (taskId: number) => {
    try {
      const detail = await adminService.getTaskDetail(taskId);
      setSelectedTaskDetail(detail);
      setEditForm({
        title: detail.title,
        description: detail.description || "",
        visibility: detail.visibility,
        priority: detail.priority,
        status: detail.status,
        project_id: detail.project_id || null,
        assignee_ids: detail.assignees ? detail.assignees.map(a => a.id) : [],
        start_date: detail.start_date ? detail.start_date.split("T")[0] : "",
        due_date: detail.due_date ? detail.due_date.split("T")[0] : ""
      });
      setIsEditingDetail(false);
    } catch (err: any) {
      alert("Failed to open task: " + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert("Task title is required.");
      return;
    }
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        visibility: createForm.visibility,
        priority: createForm.priority,
        status: createForm.status,
        project_id: createForm.project_id,
        assignee_ids: createForm.assignee_ids,
        start_date: createForm.start_date ? new Date(createForm.start_date).toISOString() : undefined,
        due_date: createForm.due_date ? new Date(createForm.due_date).toISOString() : undefined
      };

      const created = await adminService.createTask(payload);
      setTasks([created, ...tasks]);
      setShowAddModal(false);

      // Reset Form
      setCreateForm({
        title: "",
        description: "",
        visibility: "WORKSPACE",
        priority: "MEDIUM",
        status: "TODO",
        project_id: null,
        assignee_ids: [],
        start_date: "",
        due_date: ""
      });

      // Refresh Stats
      adminService.getTaskStats().then(setStats);
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    }
  };

  const handleSaveEditDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetail) return;
    if (!editForm.title.trim()) {
      alert("Task title is required.");
      return;
    }

    try {
      const payload: any = {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        visibility: editForm.visibility,
        priority: editForm.priority,
        status: editForm.status,
        project_id: editForm.project_id,
        assignee_ids: editForm.assignee_ids,
        start_date: editForm.start_date ? new Date(editForm.start_date).toISOString() : undefined,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : undefined
      };

      const updated = await adminService.updateTask(selectedTaskDetail.id, payload);
      const fullDetail = await adminService.getTaskDetail(updated.id);
      setSelectedTaskDetail(fullDetail);
      setIsEditingDetail(false);

      setTasks(tasks.map(t => (t.id === updated.id ? updated : t)));
      adminService.getTaskStats().then(setStats);
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
    }
  };

  const handleSetStatus = async (task: ProjectTask, newStatus: TaskStatus) => {
    try {
      await adminService.setTaskStatus(task.id, newStatus);
      setTasks(tasks.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
      if (selectedTaskDetail && selectedTaskDetail.id === task.id) {
        setSelectedTaskDetail({ ...selectedTaskDetail, status: newStatus });
      }
      adminService.getTaskStats().then(setStats);
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteTask = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete task '${title}'?`)) return;
    try {
      await adminService.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      if (selectedTaskDetail && selectedTaskDetail.id === id) {
        setSelectedTaskDetail(null);
      }
      adminService.getTaskStats().then(setStats);
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetail || !newCommentText.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
      const added = await adminService.addTaskComment(selectedTaskDetail.id, newCommentText.trim());
      const updatedComments = [...(selectedTaskDetail.comments || []), added];
      setSelectedTaskDetail({
        ...selectedTaskDetail,
        comments: updatedComments,
        comments_count: updatedComments.length
      });
      setNewCommentText("");

      // Update in task list too
      setTasks(tasks.map(t => t.id === selectedTaskDetail.id ? { ...t, comments_count: updatedComments.length } : t));
    } catch (err: any) {
      alert("Failed to add comment: " + err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const toggleCreateAssignee = (userId: number) => {
    setCreateForm(prev => {
      const exists = prev.assignee_ids.includes(userId);
      return {
        ...prev,
        assignee_ids: exists
          ? prev.assignee_ids.filter(id => id !== userId)
          : [...prev.assignee_ids, userId]
      };
    });
  };

  const toggleEditAssignee = (userId: number) => {
    setEditForm(prev => {
      const exists = prev.assignee_ids.includes(userId);
      return {
        ...prev,
        assignee_ids: exists
          ? prev.assignee_ids.filter(id => id !== userId)
          : [...prev.assignee_ids, userId]
      };
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedProjectFilter("ALL");
    setSelectedAssigneeFilter("ALL");
    setSelectedPriorityFilter("ALL");
    setSelectedStatusFilter("ALL");
    setSelectedVisibilityFilter("ALL");
  };

  const isOverdue = (task: ProjectTask) => {
    if (!task.due_date || task.status === "COMPLETED" || task.status === "CANCELLED") return false;
    return new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
  };

  return (
    <div className="sd-fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0, color: "var(--admin-text-main)" }}>
            Task Management
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", margin: "0.35rem 0 0" }}>
            Manage studio assignments, project deliverables and team responsibilities.
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span>+</span> Create Task
        </button>
      </div>

      {/* Top Section: Overview Statistics Cards */}
      {stats && (
        <div className="tasks-stats-grid">
          <div
            className={`task-stat-card ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">Total Tasks</span>
            <span className="task-stat-num">{stats.total}</span>
          </div>

          <div
            className={`task-stat-card ${activeTab === "my_tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("my_tasks")}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">My Tasks</span>
            <span className="task-stat-num" style={{ color: "var(--admin-accent-gold, #d4af37)" }}>{stats.my_tasks}</span>
          </div>

          <div
            className={`task-stat-card ${activeTab === "assigned_to_me" ? "active" : ""}`}
            onClick={() => setActiveTab("assigned_to_me")}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">Assigned to Me</span>
            <span className="task-stat-num">{stats.assigned_to_me}</span>
          </div>

          <div
            className={`task-stat-card ${activeTab === "in_progress" ? "active" : ""}`}
            onClick={() => { setActiveTab("all"); setSelectedStatusFilter("IN_PROGRESS"); }}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">In Progress</span>
            <span className="task-stat-num" style={{ color: "#38bdf8" }}>{stats.in_progress}</span>
          </div>

          <div
            className={`task-stat-card ${activeTab === "overdue" ? "active" : ""}`}
            onClick={() => setActiveTab("overdue")}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">Overdue</span>
            <span className="task-stat-num" style={{ color: stats.overdue > 0 ? "#ef4444" : "var(--admin-text-main)" }}>
              {stats.overdue}
            </span>
          </div>

          <div
            className={`task-stat-card ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
            role="button"
            tabIndex={0}
          >
            <span className="task-stat-label">Completed</span>
            <span className="task-stat-num" style={{ color: "#10b981" }}>{stats.completed}</span>
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div className="tasks-view-tabs">
        <button
          className={`tasks-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Tasks
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "my_tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("my_tasks")}
        >
          My Tasks
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "assigned_to_me" ? "active" : ""}`}
          onClick={() => setActiveTab("assigned_to_me")}
        >
          Assigned to Me
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "workspace" ? "active" : ""}`}
          onClick={() => setActiveTab("workspace")}
        >
          🌐 Workspace Tasks
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "private" ? "active" : ""}`}
          onClick={() => setActiveTab("private")}
        >
          🔒 Private Tasks
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "overdue" ? "active" : ""}`}
          onClick={() => setActiveTab("overdue")}
        >
          ⚠️ Overdue
        </button>
        <button
          className={`tasks-tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          ✓ Completed
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="tasks-filter-bar">
        <input
          type="text"
          className="tasks-search-input"
          placeholder="Search task title or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {/* Project Filter */}
        <select
          className="tasks-filter-select"
          value={selectedProjectFilter}
          onChange={e => setSelectedProjectFilter(e.target.value)}
        >
          <option value="ALL">All Projects ({projects.length})</option>
          <option value="NONE">🏛 General Studio Tasks (No Project)</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          className="tasks-filter-select"
          value={selectedAssigneeFilter}
          onChange={e => setSelectedAssigneeFilter(e.target.value)}
        >
          <option value="ALL">All Assignees</option>
          {assigneesList.map(u => (
            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="tasks-filter-select"
          value={selectedPriorityFilter}
          onChange={e => setSelectedPriorityFilter(e.target.value)}
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">URGENT</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        {/* Status Filter */}
        <select
          className="tasks-filter-select"
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="TODO">TO DO</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="WAITING">WAITING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        {/* Visibility Filter */}
        <select
          className="tasks-filter-select"
          value={selectedVisibilityFilter}
          onChange={e => setSelectedVisibilityFilter(e.target.value)}
        >
          <option value="ALL">All Visibility</option>
          <option value="WORKSPACE">🌐 Workspace Tasks</option>
          <option value="PRIVATE">🔒 Private Tasks</option>
        </select>

        {(searchQuery || selectedProjectFilter !== "ALL" || selectedAssigneeFilter !== "ALL" || selectedPriorityFilter !== "ALL" || selectedStatusFilter !== "ALL" || selectedVisibilityFilter !== "ALL") && (
          <button
            className="admin-btn admin-btn-secondary"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.72rem" }}
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", background: "rgba(0,0,0,0.3)", padding: "0.2rem", borderRadius: "4px", border: "1px solid var(--admin-border)" }}>
          <button
            className={`admin-btn ${viewLayout === "board" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", borderRadius: "3px" }}
            onClick={() => setViewLayout("board")}
          >
            📊 Board
          </button>
          <button
            className={`admin-btn ${viewLayout === "list" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem", borderRadius: "3px" }}
            onClick={() => setViewLayout("list")}
          >
            ☰ List
          </button>
        </div>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* Task Content */}
      {loading ? (
        <div style={{ color: "var(--admin-text-muted)", fontSize: "0.82rem", padding: "3rem 0", textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
          Loading studio tasks and team assignments...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: "3.5rem", backgroundColor: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>📋</div>
          <h4 style={{ fontSize: "0.95rem", color: "var(--admin-text-main)", margin: "0 0 0.35rem" }}>No Tasks Found</h4>
          <p style={{ color: "var(--admin-text-muted)", fontSize: "0.78rem", margin: 0 }}>
            No tasks match the active view and filter criteria.
          </p>
        </div>
      ) : viewLayout === "board" ? (
        /* KANBAN VISUAL BOARD */
        <div className="kanban-board">
          {[
            { id: "TODO" as TaskStatus, label: "TO DO", icon: "📌" },
            { id: "IN_PROGRESS" as TaskStatus, label: "IN PROGRESS", icon: "⚡" },
            { id: "WAITING" as TaskStatus, label: "WAITING", icon: "⏳" },
            { id: "COMPLETED" as TaskStatus, label: "COMPLETED", icon: "✓" }
          ].map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const idStr = e.dataTransfer.getData("task_id");
                  const taskId = idStr ? Number(idStr) : draggedTaskId;
                  if (taskId) {
                    const targetTask = tasks.find(t => t.id === taskId);
                    if (targetTask && targetTask.status !== col.id) {
                      await handleSetStatus(targetTask, col.id);
                    }
                  }
                  setDraggedTaskId(null);
                }}
              >
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span>{col.icon}</span>
                    <span>{col.label}</span>
                  </div>
                  <span className="kanban-column-count">{colTasks.length}</span>
                </div>

                <div className="kanban-cards-container">
                  {colTasks.length === 0 ? (
                    <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--admin-text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
                      No tasks in {col.label.toLowerCase()}
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const overdue = isOverdue(task);
                      const prioClass = task.priority === "URGENT" ? "task-prio-urgent" : task.priority === "HIGH" ? "task-prio-high" : task.priority === "LOW" ? "task-prio-low" : "task-prio-medium";
                      const visClass = task.visibility === "PRIVATE" ? "task-vis-private" : "task-vis-workspace";

                      return (
                        <div
                          key={task.id}
                          className="kanban-card"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("task_id", task.id.toString());
                            setDraggedTaskId(task.id);
                          }}
                          onClick={() => handleOpenDetail(task.id)}
                        >
                          <div className="kanban-card-top">
                            <span className={`task-vis-badge ${visClass}`}>
                              {task.visibility === "PRIVATE" ? "🔒 Private" : "🌐 Workspace"}
                            </span>
                            <span className={`task-priority-badge ${prioClass}`}>
                              {task.priority}
                            </span>
                          </div>

                          <div className="kanban-card-title" style={{ textDecoration: task.status === "COMPLETED" ? "line-through" : "none" }}>
                            {task.title}
                          </div>

                          {task.project_title && (
                            <div className="kanban-card-project">
                              <span>📁</span>
                              <span>{task.project_title}</span>
                            </div>
                          )}

                          <div className="kanban-card-meta">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              {task.assignees && task.assignees.length > 0 ? (
                                task.assignees.map(a => (
                                  <span key={a.id} className="task-assignee-avatar" title={`${a.username} (${a.role})`}>
                                    {a.username.slice(0, 2)}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontStyle: "italic", fontSize: "0.68rem" }}>{task.assigned_to || "Unassigned"}</span>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {overdue && <span className="task-overdue-tag">⚠️ Overdue</span>}
                              {task.due_date && !overdue && (
                                <span>📅 {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              )}
                              {task.comments_count !== undefined && task.comments_count > 0 && (
                                <span style={{ color: "var(--admin-accent-gold, #d4af37)" }}>💬 {task.comments_count}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="tasks-card-list">
          {tasks.map(task => {
            const overdue = isOverdue(task);
            const prioClass = task.priority === "URGENT" ? "task-prio-urgent" : task.priority === "HIGH" ? "task-prio-high" : task.priority === "LOW" ? "task-prio-low" : "task-prio-medium";
            const visClass = task.visibility === "PRIVATE" ? "task-vis-private" : "task-vis-workspace";

            return (
              <div
                key={task.id}
                className={`task-item-card ${task.status === "COMPLETED" ? "task-completed" : ""}`}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span className={`task-vis-badge ${visClass}`}>
                      {task.visibility === "PRIVATE" ? "🔒 Private" : "🌐 Workspace"}
                    </span>
                    <span className={`task-priority-badge ${prioClass}`}>
                      {task.priority}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "3px",
                        background: task.status === "COMPLETED" ? "rgba(16, 185, 129, 0.15)" : task.status === "IN_PROGRESS" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        color: task.status === "COMPLETED" ? "#10b981" : task.status === "IN_PROGRESS" ? "#38bdf8" : "var(--admin-text-muted)",
                        border: `1px solid ${task.status === "COMPLETED" ? "rgba(16, 185, 129, 0.3)" : task.status === "IN_PROGRESS" ? "rgba(56, 189, 248, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
                      }}
                    >
                      {task.status.replace("_", " ")}
                    </span>

                    {task.project_title && (
                      <span style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", marginLeft: "0.25rem" }}>
                        📁 <strong style={{ color: "var(--admin-text-main)" }}>{task.project_title}</strong>
                      </span>
                    )}

                    {overdue && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "0.15rem 0.5rem", borderRadius: "3px", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
                        ⚠️ Overdue
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 600,
                      color: "var(--admin-text-main)",
                      margin: "0 0 0.35rem",
                      textDecoration: task.status === "COMPLETED" ? "line-through" : "none",
                      cursor: "pointer"
                    }}
                    onClick={() => handleOpenDetail(task.id)}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", margin: "0 0 0.65rem", lineHeight: 1.45, maxHeight: "2.8em", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.72rem", color: "var(--admin-text-muted)", marginTop: "0.5rem" }}>
                    {task.created_by_name && (
                      <span>Created by: <strong style={{ color: "var(--admin-text-main)" }}>{task.created_by_name}</strong></span>
                    )}

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <span>Assignees:</span>
                      {task.assignees && task.assignees.length > 0 ? (
                        task.assignees.map(a => (
                          <span
                            key={a.id}
                            className="task-assignee-avatar"
                            title={`${a.username} (${a.role})`}
                          >
                            {a.username.slice(0, 2)}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--admin-text-dim)", fontStyle: "italic" }}>
                          {task.assigned_to || "Unassigned"}
                        </span>
                      )}
                    </div>

                    {task.due_date && (
                      <span style={{ color: overdue ? "#ef4444" : "var(--admin-text-muted)" }}>
                        📅 Due: <strong style={{ color: overdue ? "#ef4444" : "var(--admin-text-main)" }}>{new Date(task.due_date).toLocaleDateString()}</strong>
                      </span>
                    )}

                    {task.comments_count !== undefined && task.comments_count > 0 && (
                      <span style={{ color: "var(--admin-accent-gold, #d4af37)", cursor: "pointer" }} onClick={() => handleOpenDetail(task.id)}>
                        💬 {task.comments_count} {task.comments_count === 1 ? "comment" : "comments"}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
                  {task.status !== "COMPLETED" ? (
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
                      onClick={() => handleSetStatus(task, "COMPLETED")}
                    >
                      Done ✓
                    </button>
                  ) : (
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
                      onClick={() => handleSetStatus(task, "IN_PROGRESS")}
                    >
                      Reopen
                    </button>
                  )}

                  <button
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
                    onClick={() => handleOpenDetail(task.id)}
                  >
                    Details ↗
                  </button>

                  {task.project_id && onOpenProjectWorkspace && (
                    <button
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
                      onClick={() => onOpenProjectWorkspace(task.project_id!)}
                    >
                      Workspace ↗
                    </button>
                  )}

                  <button
                    className="admin-btn admin-btn-danger"
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.7rem" }}
                    onClick={() => handleDeleteTask(task.id, task.title)}
                    title="Delete task"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE NEW TASK */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Create Studio Task
              </h3>
              <button className="admin-btn admin-btn-secondary" style={{ padding: "0.25rem 0.5rem" }} onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              {/* Task Title */}
              <div className="admin-form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g., Finalize false ceiling drawing details or Review material samples"
                />
              </div>

              {/* Visibility Selection Card */}
              <div className="admin-form-group">
                <label>Task Visibility *</label>
                <div className="task-visibility-grid">
                  <div
                    className={`task-visibility-option ${createForm.visibility === "WORKSPACE" ? "selected" : ""}`}
                    onClick={() => setCreateForm({ ...createForm, visibility: "WORKSPACE" })}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>🌐</span>
                      <strong style={{ fontSize: "0.85rem", color: "var(--admin-text-main)" }}>Workspace Task</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>
                      Visible to all authorized studio members.
                    </p>
                  </div>

                  <div
                    className={`task-visibility-option ${createForm.visibility === "PRIVATE" ? "selected" : ""}`}
                    onClick={() => setCreateForm({ ...createForm, visibility: "PRIVATE" })}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>🔒</span>
                      <strong style={{ fontSize: "0.85rem", color: "var(--admin-text-main)" }}>Private Task</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>
                      Visible only to creator, selected assignees, and executive administrators.
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignee Multi-Picker */}
              <div className="admin-form-group">
                <label>Assign To Team Members ({createForm.assignee_ids.length} selected)</label>
                <div className="task-assignees-grid">
                  {assigneesList.map(u => {
                    const isSelected = createForm.assignee_ids.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className={`task-assignee-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleCreateAssignee(u.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ pointerEvents: "none" }}
                        />
                        <span className="task-assignee-avatar">{u.username.slice(0, 2)}</span>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {u.username}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>
                            {u.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project & Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Related Project (Optional)</label>
                  <select
                    value={createForm.project_id || 0}
                    onChange={e => setCreateForm({ ...createForm, project_id: Number(e.target.value) === 0 ? null : Number(e.target.value) })}
                  >
                    <option value={0}>None — General Studio Task</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value as TaskPriority })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Dates & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select
                    value={createForm.status}
                    onChange={e => setCreateForm({ ...createForm, status: e.target.value as TaskStatus })}
                  >
                    <option value="TODO">TO DO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="WAITING">WAITING</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="admin-form-group">
                <label>Description &amp; Action Items</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Specific requirements, drawings to reference, contractor contacts..."
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.85rem", marginTop: "1.5rem", borderTop: "1px solid var(--admin-border)", paddingTop: "1rem" }}>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: TASK DETAIL, EDIT, AND DISCUSSION COMMENTS */}
      {/* ===================================================================== */}
      {selectedTaskDetail && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: "750px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--admin-border)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`task-vis-badge ${selectedTaskDetail.visibility === "PRIVATE" ? "task-vis-private" : "task-vis-workspace"}`}>
                  {selectedTaskDetail.visibility === "PRIVATE" ? "🔒 Private Task" : "🌐 Workspace Task"}
                </span>
                <span className={`task-priority-badge ${selectedTaskDetail.priority === "URGENT" ? "task-prio-urgent" : selectedTaskDetail.priority === "HIGH" ? "task-prio-high" : "task-prio-medium"}`}>
                  {selectedTaskDetail.priority}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!isEditingDetail && (
                  <button
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.72rem" }}
                    onClick={() => setIsEditingDetail(true)}
                  >
                    ✎ Edit Task
                  </button>
                )}
                <button
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "0.3rem 0.5rem" }}
                  onClick={() => setSelectedTaskDetail(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {isEditingDetail ? (
              /* EDIT MODE */
              <form onSubmit={handleSaveEditDetail}>
                <div className="admin-form-group">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Visibility</label>
                  <div className="task-visibility-grid">
                    <div
                      className={`task-visibility-option ${editForm.visibility === "WORKSPACE" ? "selected" : ""}`}
                      onClick={() => setEditForm({ ...editForm, visibility: "WORKSPACE" })}
                      role="button"
                      tabIndex={0}
                    >
                      <strong>🌐 Workspace Task</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>Visible to all authorized studio members.</span>
                    </div>
                    <div
                      className={`task-visibility-option ${editForm.visibility === "PRIVATE" ? "selected" : ""}`}
                      onClick={() => setEditForm({ ...editForm, visibility: "PRIVATE" })}
                      role="button"
                      tabIndex={0}
                    >
                      <strong>🔒 Private Task</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>Visible only to creator, assignees &amp; admins.</span>
                    </div>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Assignees</label>
                  <div className="task-assignees-grid">
                    {assigneesList.map(u => {
                      const isSelected = editForm.assignee_ids.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          className={`task-assignee-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleEditAssignee(u.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ pointerEvents: "none" }}
                          />
                          <span className="task-assignee-avatar">{u.username.slice(0, 2)}</span>
                          <span style={{ fontSize: "0.75rem" }}>{u.username}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label>Project</label>
                    <select
                      value={editForm.project_id || 0}
                      onChange={e => setEditForm({ ...editForm, project_id: Number(e.target.value) === 0 ? null : Number(e.target.value) })}
                    >
                      <option value={0}>None (Studio-wide)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={e => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Status</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}
                    >
                      <option value="TODO">TO DO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="WAITING">WAITING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.85rem", marginTop: "1rem" }}>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setIsEditingDetail(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-btn admin-btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW MODE */
              <div>
                <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem", color: "var(--admin-text-main)" }}>
                  {selectedTaskDetail.title}
                </h3>

                {selectedTaskDetail.description ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)", lineHeight: 1.5, margin: "0 0 1.25rem", whiteSpace: "pre-wrap" }}>
                    {selectedTaskDetail.description}
                  </p>
                ) : (
                  <p style={{ fontSize: "0.8rem", color: "var(--admin-text-dim)", fontStyle: "italic", margin: "0 0 1.25rem" }}>
                    No additional description provided.
                  </p>
                )}

                {/* Info Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", padding: "1rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--admin-border)", borderRadius: "6px", marginBottom: "1.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--admin-text-muted)", letterSpacing: "0.08em" }}>Project</span>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--admin-text-main)", marginTop: "0.2rem" }}>
                      {selectedTaskDetail.project_title || "Studio Task"}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--admin-text-muted)", letterSpacing: "0.08em" }}>Status</span>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--admin-accent-gold, #d4af37)", marginTop: "0.2rem" }}>
                      {selectedTaskDetail.status.replace("_", " ")}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--admin-text-muted)", letterSpacing: "0.08em" }}>Created By</span>
                    <div style={{ fontSize: "0.82rem", color: "var(--admin-text-main)", marginTop: "0.2rem" }}>
                      {selectedTaskDetail.created_by_name || "System"}
                      {selectedTaskDetail.created_at && ` · ${new Date(selectedTaskDetail.created_at).toLocaleDateString()}`}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--admin-text-muted)", letterSpacing: "0.08em" }}>Due Date</span>
                    <div style={{ fontSize: "0.82rem", color: isOverdue(selectedTaskDetail) ? "#ef4444" : "var(--admin-text-main)", marginTop: "0.2rem" }}>
                      {selectedTaskDetail.due_date ? new Date(selectedTaskDetail.due_date).toLocaleDateString() : "No deadline"}
                      {isOverdue(selectedTaskDetail) && " (OVERDUE)"}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--admin-text-muted)", letterSpacing: "0.08em" }}>Assigned Members</span>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                      {selectedTaskDetail.assignees && selectedTaskDetail.assignees.length > 0 ? (
                        selectedTaskDetail.assignees.map(a => (
                          <span
                            key={a.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.25rem 0.6rem",
                              background: "rgba(212, 175, 55, 0.12)",
                              border: "1px solid rgba(212, 175, 55, 0.3)",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              color: "var(--admin-text-main)"
                            }}
                          >
                            <span className="task-assignee-avatar" style={{ width: "18px", height: "18px", fontSize: "0.55rem" }}>
                              {a.username.slice(0, 2)}
                            </span>
                            <strong>{a.username}</strong>
                            <span style={{ fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>({a.role})</span>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--admin-text-dim)" }}>
                          {selectedTaskDetail.assigned_to || "No specific assignees"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity & Comments Discussion */}
                <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: "1.25rem" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1rem", color: "var(--admin-text-main)" }}>
                    Discussion &amp; Task Activity ({selectedTaskDetail.comments?.length || 0})
                  </h4>

                  {/* Comment Thread */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "200px", overflowY: "auto", marginBottom: "1rem" }}>
                    {selectedTaskDetail.comments && selectedTaskDetail.comments.length > 0 ? (
                      selectedTaskDetail.comments.map(c => (
                        <div
                          key={c.id}
                          style={{
                            padding: "0.75rem",
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "4px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                            <strong style={{ fontSize: "0.78rem", color: "var(--admin-accent-gold, #d4af37)" }}>
                              {c.author_name}
                            </strong>
                            <span style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>
                              {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--admin-text-main)", lineHeight: 1.4 }}>
                            {c.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.78rem", color: "var(--admin-text-dim)", fontStyle: "italic", margin: "0.5rem 0" }}>
                        No comments yet. Start the discussion below.
                      </p>
                    )}
                  </div>

                  {/* Add Comment Box */}
                  <form onSubmit={handleAddComment} style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Add a comment or progress note..."
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      style={{ flex: 1, padding: "0.5rem 0.85rem", fontSize: "0.8rem", background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-main)" }}
                    />
                    <button
                      type="submit"
                      className="admin-btn admin-btn-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.78rem" }}
                      disabled={!newCommentText.trim() || commentSubmitting}
                    >
                      {commentSubmitting ? "Posting..." : "Comment"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
