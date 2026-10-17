import React, { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import {
  PortfolioCategoryAdmin,
  PortfolioCategoryCreate,
  EligibleProjectItem
} from "../types/category";
import { StudioImage } from "../components/StudioImage";

export const CategoryManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"categories" | "puzzle">("categories");
  const [categories, setCategories] = useState<PortfolioCategoryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Representative Project Assignment State
  const [eligibleProjectsMap, setEligibleProjectsMap] = useState<Record<number, EligibleProjectItem[]>>({});
  const [selectedFeaturedMap, setSelectedFeaturedMap] = useState<Record<number, number | null>>({});
  const [savingFeatured, setSavingFeatured] = useState<Record<number, boolean>>({});

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PortfolioCategoryAdmin | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSize, setFormSize] = useState<"large" | "tall" | "wide" | "small">("small");
  const [formCoverImage, setFormCoverImage] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubcategories, setFormSubcategories] = useState<string[]>([]);
  const [formFeaturedProjectId, setFormFeaturedProjectId] = useState<number | null>(null);
  const [modalEligibleProjects, setModalEligibleProjects] = useState<EligibleProjectItem[]>([]);
  const [newSubcatInput, setNewSubcatInput] = useState("");

  // Reassignment / Delete Modal State
  const [deleteModalCat, setDeleteModalCat] = useState<PortfolioCategoryAdmin | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadAllEligible = async (catsList: PortfolioCategoryAdmin[]) => {
    try {
      const promises = catsList.map(async (c) => {
        try {
          const list = await adminService.getCategoryEligibleProjects(c.id);
          return { id: c.id, list };
        } catch {
          return { id: c.id, list: [] };
        }
      });
      const results = await Promise.all(promises);
      const map: Record<number, EligibleProjectItem[]> = {};
      results.forEach(r => { map[r.id] = r.list; });
      setEligibleProjectsMap(map);
    } catch {
      // ignore
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminCategories();
      setCategories(data);
      const initialFeatured: Record<number, number | null> = {};
      data.forEach(c => {
        initialFeatured[c.id] = c.featured_project_id ?? (c.featured_project ? c.featured_project.id : null);
      });
      setSelectedFeaturedMap(initialFeatured);
      loadAllEligible(data);
    } catch (err: any) {
      setError(err.message || "Failed to load portfolio categories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormSize("small");
    setFormCoverImage("");
    setFormIsActive(true);
    setFormSubcategories([]);
    setFormFeaturedProjectId(null);
    setModalEligibleProjects([]);
    setNewSubcatInput("");
    setShowModal(true);
  };

  const handleOpenEdit = async (cat: PortfolioCategoryAdmin) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormSize(cat.puzzle_size || "small");
    setFormCoverImage(cat.cover_image || "");
    setFormIsActive(cat.is_active);
    setFormSubcategories(cat.subcategories?.map(s => s.name) || []);
    setFormFeaturedProjectId(cat.featured_project_id ?? (cat.featured_project?.id ?? null));
    setNewSubcatInput("");
    setShowModal(true);

    try {
      const list = await adminService.getCategoryEligibleProjects(cat.id);
      setModalEligibleProjects(list);
    } catch {
      setModalEligibleProjects([]);
    }
  };

  const handleSaveFeatured = async (catId: number) => {
    const selectedProjId = selectedFeaturedMap[catId] ?? null;
    setSavingFeatured(prev => ({ ...prev, [catId]: true }));
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await adminService.setCategoryFeaturedProject(catId, selectedProjId);
      setCategories(prev => prev.map(c => c.id === catId ? {
        ...c,
        featured_project_id: updated.featured_project_id,
        featured_project: updated.featured_project
      } : c));
      setSelectedFeaturedMap(prev => ({ ...prev, [catId]: updated.featured_project_id ?? null }));
      setSuccessMsg(`Representative project for '${updated.name}' saved successfully.`);
      const refreshed = await adminService.getCategoryEligibleProjects(catId);
      setEligibleProjectsMap(prev => ({ ...prev, [catId]: refreshed }));
    } catch (err: any) {
      setError(err.message || "Failed to update representative project");
    } finally {
      setSavingFeatured(prev => ({ ...prev, [catId]: false }));
    }
  };

  const handleClearFeatured = async (catId: number) => {
    setSavingFeatured(prev => ({ ...prev, [catId]: true }));
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await adminService.setCategoryFeaturedProject(catId, null);
      setCategories(prev => prev.map(c => c.id === catId ? {
        ...c,
        featured_project_id: null,
        featured_project: null
      } : c));
      setSelectedFeaturedMap(prev => ({ ...prev, [catId]: null }));
      setSuccessMsg(`Representative project for '${updated.name}' cleared. Category now uses fallback cover.`);
      const refreshed = await adminService.getCategoryEligibleProjects(catId);
      setEligibleProjectsMap(prev => ({ ...prev, [catId]: refreshed }));
    } catch (err: any) {
      setError(err.message || "Failed to clear representative project");
    } finally {
      setSavingFeatured(prev => ({ ...prev, [catId]: false }));
    }
  };

  const handleAddSubcatTag = () => {
    const trimmed = newSubcatInput.trim();
    if (trimmed && !formSubcategories.includes(trimmed)) {
      setFormSubcategories([...formSubcategories, trimmed]);
      setNewSubcatInput("");
    }
  };

  const handleRemoveSubcatTag = (name: string) => {
    setFormSubcategories(formSubcategories.filter(s => s !== name));
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Category name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingCategory) {
        // Update category properties
        const updated = await adminService.updateCategory(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          puzzle_size: formSize,
          cover_image: formCoverImage.trim(),
          is_active: formIsActive,
          featured_project_id: formFeaturedProjectId
        });

        // Sync subcategories: add any newly added ones
        const existingSubcatNames = (editingCategory.subcategories || []).map(s => s.name);
        for (const subName of formSubcategories) {
          if (!existingSubcatNames.includes(subName)) {
            await adminService.addSubcategory(editingCategory.id, subName);
          }
        }
        // Remove deleted subcategories
        for (const existingSub of editingCategory.subcategories || []) {
          if (!formSubcategories.includes(existingSub.name)) {
            await adminService.deleteSubcategory(existingSub.id);
          }
        }

        setSuccessMsg(`Category '${updated.name}' updated successfully.`);
      } else {
        // Create new category
        const payload: PortfolioCategoryCreate = {
          name: formName.trim(),
          description: formDescription.trim(),
          puzzle_size: formSize,
          cover_image: formCoverImage.trim(),
          is_active: formIsActive,
          display_order: categories.length + 1,
          subcategories: formSubcategories
        };
        const created = await adminService.createCategory(payload);
        setSuccessMsg(`New portfolio category '${created.name}' created and ready for project assignments.`);
      }
      setShowModal(false);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);

    const reorderedPayload = copy.map((c, i) => ({
      id: c.id,
      display_order: i + 1
    }));

    setCategories(copy.map((c, i) => ({ ...c, display_order: i + 1 })));

    try {
      await adminService.reorderCategories(reorderedPayload);
      setSuccessMsg("Category display order updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to persist new category order");
      await loadCategories();
    }
  };

  const handleToggleActive = async (cat: PortfolioCategoryAdmin) => {
    try {
      const updated = await adminService.updateCategory(cat.id, {
        is_active: !cat.is_active
      });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, is_active: updated.is_active } : c));
      setSuccessMsg(`Category '${cat.name}' is now ${updated.is_active ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      alert("Failed to toggle category active status: " + err.message);
    }
  };

  const handleDeleteClick = (cat: PortfolioCategoryAdmin) => {
    if (cat.is_default) {
      alert("Default core categories cannot be deleted.");
      return;
    }

    setDeleteModalCat(cat);
    // Find default target candidate for reassignment
    const fallbackTarget = categories.find(c => c.id !== cat.id && c.is_active);
    setReassignTargetId(fallbackTarget ? fallbackTarget.id : null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalCat) return;

    setSaving(true);
    try {
      await adminService.deleteCategory(
        deleteModalCat.id,
        deleteModalCat.total_projects_count > 0 ? (reassignTargetId || undefined) : undefined
      );
      setSuccessMsg(`Category '${deleteModalCat.name}' deleted successfully.`);
      setDeleteModalCat(null);
      await loadCategories();
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSavePuzzle = async (cat: PortfolioCategoryAdmin, newSize: "large" | "tall" | "wide" | "small") => {
    try {
      await adminService.updateCategory(cat.id, { puzzle_size: newSize });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, puzzle_size: newSize } : c));
      setSuccessMsg(`Updated tile size for '${cat.name}' to ${newSize.toUpperCase()}.`);
    } catch (err: any) {
      alert("Failed to update tile size: " + err.message);
    }
  };

  return (
    <div className="sd-admin-section sd-fade-in">
      {/* Top Header Row with Actions */}
      <div className="sd-admin-header-row">
        <div>
          <span className="sd-admin-eyebrow">PORTFOLIO ARCHITECTURE & TAXONOMY</span>
          <h1 className="sd-admin-title">Authoritative Category & Puzzle Manager</h1>
          <p className="sd-admin-subtitle">
            Centralized single source of truth for portfolio categories, subcategories, project creation dropdowns, and public homepage puzzle collage display.
          </p>
        </div>

        <div className="sd-admin-header-actions">
          <button
            type="button"
            className="sd-admin-btn-secondary"
            onClick={loadCategories}
            disabled={loading}
          >
            &#x21bb; Refresh
          </button>
          <button
            type="button"
            className="sd-admin-btn-primary"
            onClick={handleOpenAdd}
          >
            + Add New Category
          </button>
        </div>
      </div>

      {/* Tabs Switcher: A. Category Management vs B. Visual Puzzle Layout */}
      <div className="sd-admin-tabs" style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--admin-border)", display: "flex", gap: "1rem" }}>
        <button
          type="button"
          className={`sd-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          style={{
            padding: "0.6rem 1.2rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            background: "none",
            border: "none",
            borderBottom: activeTab === "categories" ? "2px solid var(--admin-accent)" : "2px solid transparent",
            color: activeTab === "categories" ? "var(--admin-text-main)" : "var(--admin-text-muted)",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("categories")}
        >
          📂 Portfolio Categories & Subcategories ({categories.length})
        </button>
        <button
          type="button"
          className={`sd-tab-btn ${activeTab === "puzzle" ? "active" : ""}`}
          style={{
            padding: "0.6rem 1.2rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            background: "none",
            border: "none",
            borderBottom: activeTab === "puzzle" ? "2px solid var(--admin-accent)" : "2px solid transparent",
            color: activeTab === "puzzle" ? "var(--admin-text-main)" : "var(--admin-text-muted)",
            cursor: "pointer"
          }}
          onClick={() => setActiveTab("puzzle")}
        >
          🧩 Homepage Puzzle & Visual Collage Layout
        </button>
      </div>

      {error && <div className="admin-error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
      {successMsg && <div className="admin-success-banner" style={{ marginBottom: "1rem" }}>{successMsg}</div>}

      {loading ? (
        <div className="sd-admin-loading">Loading authoritative category architecture...</div>
      ) : activeTab === "categories" ? (
        /* ========================================================================= */
        /* TAB A: CATEGORY & SUBCATEGORY MANAGEMENT                                   */
        /* ========================================================================= */
        <div className="sd-table-wrap">
          <table className="sd-admin-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Order</th>
                <th>Category Name</th>
                <th>Subcategories</th>
                <th>Assigned Projects</th>
                <th>Homepage Representative</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id}>
                  {/* Order & Reorder Controls */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", cursor: idx === categories.length - 1 ? "default" : "pointer", opacity: idx === categories.length - 1 ? 0.3 : 1 }}
                        onClick={() => handleMove(idx, "down")}
                        disabled={idx === categories.length - 1}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <span style={{ fontWeight: 700, fontSize: "0.8rem", marginLeft: "0.2rem" }}>
                        #{cat.display_order || idx + 1}
                      </span>
                    </div>
                  </td>

                  {/* Category Name & Slug */}
                  <td>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "var(--admin-text-main)" }}>
                        {cat.name}
                      </strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                        slug: /{cat.slug}
                      </div>
                      {cat.description && (
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--admin-text-muted)", lineHeight: 1.4, maxWidth: "320px" }}>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Subcategories */}
                  <td>
                    {cat.subcategories && cat.subcategories.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "260px" }}>
                        {cat.subcategories.map(s => (
                          <span
                            key={s.id}
                            className="sd-type-pill"
                            style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--admin-text-dim)", fontStyle: "italic" }}>
                        None defined
                      </span>
                    )}
                  </td>

                  {/* Live Assigned Project Metrics */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: "var(--admin-text-main)" }}>
                        {cat.total_projects_count} {cat.total_projects_count === 1 ? "Project" : "Projects"}
                      </strong>
                      <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>
                        <span style={{ color: "#22c55e" }}>● {cat.published_projects_count} published</span>
                        {cat.unpublished_projects_count > 0 && (
                          <span style={{ color: "var(--admin-text-dim)", marginLeft: "0.4rem" }}>· {cat.unpublished_projects_count} draft</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Homepage Representative */}
                  <td>
                    {cat.featured_project ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            backgroundColor: "var(--admin-surface-subtle)",
                            flexShrink: 0
                          }}
                        >
                          <StudioImage
                            src={cat.featured_project.cover_image}
                            alt={cat.featured_project.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            fallbackSrc="/uploads/projects/placeholder.webp"
                            showMissingState={false}
                          />
                        </div>
                        <div>
                          <strong style={{ fontSize: "0.82rem", color: "var(--admin-text-main)", display: "block" }}>
                            {cat.featured_project.title}
                          </strong>
                          <span style={{ fontSize: "0.68rem", color: "#22c55e", fontWeight: 600 }}>
                            ● Assigned (ID: #{cat.featured_project.id})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--admin-text-dim)", fontStyle: "italic" }}>
                        Fallback Cover Image
                      </span>
                    )}
                  </td>

                  {/* Type */}
                  <td>
                    {cat.is_default ? (
                      <span className="sd-badge-review">Default Core</span>
                    ) : (
                      <span className="sd-badge-new">Custom Category</span>
                    )}
                  </td>

                  {/* Active / Inactive Status */}
                  <td>
                    <button
                      type="button"
                      className={cat.is_active ? "sd-badge-completed" : "sd-badge-archived"}
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => handleToggleActive(cat)}
                      title={cat.is_active ? "Click to deactivate" : "Click to activate"}
                    >
                      {cat.is_active ? "● Active" : "○ Inactive"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: "right" }}>
                    <div className="sd-action-cell" style={{ justifyContent: "flex-end", gap: "0.4rem" }}>
                      <button
                        type="button"
                        className="sd-view-btn"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        Edit
                      </button>
                      {!cat.is_default && (
                        <button
                          type="button"
                          className="sd-delete-btn"
                          onClick={() => handleDeleteClick(cat)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB B: HOMEPAGE PUZZLE & VISUAL COLLAGE LAYOUT                             */
        /* ========================================================================= */
        <div>
          <div className="sd-admin-banner" style={{ background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.25)", padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.3rem", fontSize: "0.9rem", color: "var(--admin-accent)" }}>
              ✦ Authoritative Category Homepage Representation & Mosaic Composition
            </h4>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--admin-text-main)", lineHeight: 1.5 }}>
              Each homepage card displays ONLY active, authoritative categories with its owner-selected representative architectural project. Cards remain visually stable without auto-rotation. If no project is designated or eligible, the category's fallback cover image is displayed.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
            {categories.map((cat) => {
              const eligible = eligibleProjectsMap[cat.id] || [];
              const selectedProjId = selectedFeaturedMap[cat.id] ?? null;
              const isSavingThis = savingFeatured[cat.id] || false;
              const hasEligibleProjects = eligible.some(p => p.is_eligible);
              const selectedProjectObj = eligible.find(p => p.id === selectedProjId) || null;

              // Cover to preview: either selected project's cover, or category's fallback cover
              const previewCover = selectedProjectObj?.cover_image ||
                (selectedProjId === cat.featured_project?.id ? cat.featured_project?.cover_image : null) ||
                cat.cover_image ||
                "/uploads/projects/placeholder.webp";

              const hasUnsavedChange = selectedProjId !== (cat.featured_project_id ?? (cat.featured_project?.id ?? null));

              return (
                <div
                  key={cat.id}
                  className="admin-surface-card"
                  style={{
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--admin-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem"
                  }}
                >
                  {/* Category Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "var(--admin-text-main)" }}>
                        {cat.name}
                      </strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "var(--admin-font-mono)" }}>
                        /{cat.slug} · #{cat.display_order} in layout
                      </div>
                    </div>
                    <span className={`sd-type-pill ${cat.is_active ? "badge-published" : "badge-draft"}`}>
                      {cat.is_active ? "Visible" : "Hidden"}
                    </span>
                  </div>

                  {/* Tile Span and Preview */}
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div
                      style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "var(--admin-surface-subtle)",
                        flexShrink: 0,
                        border: "1px solid var(--admin-border)"
                      }}
                    >
                      <StudioImage
                        src={previewCover}
                        alt={cat.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        fallbackSrc="/uploads/projects/placeholder.webp"
                        showMissingState={false}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--admin-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                        Homepage Tile Span:
                      </label>
                      <select
                        className="admin-select"
                        style={{ fontSize: "0.78rem", padding: "0.35rem 0.6rem" }}
                        value={cat.puzzle_size}
                        onChange={(e) => handleQuickSavePuzzle(cat, e.target.value as any)}
                      >
                        <option value="large">Large (2x2 Featured Tile)</option>
                        <option value="tall">Tall (1x2 Portrait Tile)</option>
                        <option value="wide">Wide (2x1 Landscape Tile)</option>
                        <option value="small">Small (1x1 Square Tile)</option>
                      </select>
                    </div>
                  </div>

                  {/* Current Assigned Representative Status */}
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: cat.featured_project ? "rgba(34, 197, 94, 0.06)" : "var(--admin-surface-subtle)",
                      border: cat.featured_project ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid var(--admin-border)",
                      fontSize: "0.75rem"
                    }}
                  >
                    <div style={{ fontWeight: 700, color: cat.featured_project ? "#22c55e" : "var(--admin-text-muted)", marginBottom: "0.2rem" }}>
                      {cat.featured_project ? "● Assigned Homepage Representative" : "○ Using Fallback Cover"}
                    </div>
                    {cat.featured_project ? (
                      <div style={{ color: "var(--admin-text-main)" }}>
                        <strong>{cat.featured_project.title}</strong>
                        {cat.featured_project.location && ` · ${cat.featured_project.location}`}
                        {cat.featured_project.year && ` · ${cat.featured_project.year}`}
                      </div>
                    ) : (
                      <div style={{ color: "var(--admin-text-muted)" }}>
                        No project designated. Public card displays category fallback cover image.
                      </div>
                    )}
                  </div>

                  {/* Representative Project Dropdown */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--admin-text-muted)", display: "block", marginBottom: "0.3rem" }}>
                      Choose Category Representative Project:
                    </label>

                    {eligible.length === 0 ? (
                      <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "0.72rem", color: "#ef4444" }}>
                        ⚠️ No projects assigned to this category yet. Assign projects in Projects Manager first.
                      </div>
                    ) : !hasEligibleProjects ? (
                      <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: "0.72rem", color: "#f59e0b" }}>
                        ⚠️ All projects in this category are unpublished drafts. Publish a project to make it eligible.
                      </div>
                    ) : (
                      <select
                        className="admin-select"
                        style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem", width: "100%" }}
                        value={selectedProjId || ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setSelectedFeaturedMap(prev => ({ ...prev, [cat.id]: val }));
                        }}
                      >
                        <option value="">-- None (Use Fallback Cover) --</option>
                        {eligible.map((p) => (
                          <option key={p.id} value={p.id} disabled={!p.is_eligible}>
                            {p.title} {p.year ? `(${p.year})` : ""} - {p.location || "Studio Desire"} {!p.is_eligible ? `[Ineligible: ${p.ineligibility_reason || "Draft"}]` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--admin-border)", paddingTop: "0.6rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--admin-text-dim)" }}>
                      {cat.published_projects_count} published / {cat.total_projects_count} total
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {cat.featured_project_id && (
                        <button
                          type="button"
                          className="sd-admin-btn-secondary"
                          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}
                          disabled={isSavingThis}
                          onClick={() => handleClearFeatured(cat.id)}
                          title="Remove representative assignment and revert to fallback cover"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        className="sd-admin-btn-primary"
                        style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem" }}
                        disabled={isSavingThis || !hasUnsavedChange}
                        onClick={() => handleSaveFeatured(cat.id)}
                      >
                        {isSavingThis ? "Saving..." : hasUnsavedChange ? "Save Representative" : "Saved ✓"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT CATEGORY MODAL                                                 */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "580px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Portfolio Category"}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Category Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Residential, Hospitality, Corporate"
                    required
                    autoFocus
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Description (Optional)</label>
                  <textarea
                    rows={2}
                    className="admin-textarea"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe spatial scope and architectural typology..."
                  />
                </div>

                {/* Subcategories Tag Input */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Subcategories / Typologies</label>
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      className="admin-input"
                      value={newSubcatInput}
                      onChange={(e) => setNewSubcatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubcatTag();
                        }
                      }}
                      placeholder="e.g. Apartment, Villa, Penthouse, Duplex"
                    />
                    <button
                      type="button"
                      className="sd-admin-btn-secondary"
                      onClick={handleAddSubcatTag}
                    >
                      + Add
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {formSubcategories.map((subName) => (
                      <span
                        key={subName}
                        className="sd-type-pill"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.5rem" }}
                      >
                        {subName}
                        <button
                          type="button"
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700, padding: 0 }}
                          onClick={() => handleRemoveSubcatTag(subName)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Homepage Puzzle Tile Size</label>
                    <select
                      className="admin-select"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value as any)}
                    >
                      <option value="large">Large (2x2 Featured Tile)</option>
                      <option value="tall">Tall (1x2 Portrait Tile)</option>
                      <option value="wide">Wide (2x1 Landscape Tile)</option>
                      <option value="small">Small (1x1 Square Tile)</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Fallback Cover Image URL</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={formCoverImage}
                      onChange={(e) => setFormCoverImage(e.target.value)}
                      placeholder="/uploads/projects/... or https://..."
                    />
                  </div>
                </div>

                {editingCategory && (
                  <div className="admin-form-group" style={{ marginTop: "0.8rem", padding: "0.8rem", background: "var(--admin-surface-subtle)", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
                    <label className="admin-form-label" style={{ marginBottom: "0.3rem" }}>Homepage Representative Project</label>
                    <select
                      className="admin-select"
                      value={formFeaturedProjectId || ""}
                      onChange={(e) => setFormFeaturedProjectId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- None (Use Fallback Cover Image) --</option>
                      {modalEligibleProjects.map((p) => (
                        <option key={p.id} value={p.id} disabled={!p.is_eligible}>
                          {p.title} {p.year ? `(${p.year})` : ""} {!p.is_eligible ? `[Ineligible: ${p.ineligibility_reason || "Draft"}]` : "[Published]"}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", marginTop: "0.3rem", display: "block" }}>
                      Only published projects registered under this category can represent it on the public homepage.
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.8rem" }}>
                  <input
                    type="checkbox"
                    id="catIsActiveModal"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="catIsActiveModal" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    Active & Selectable in Project Registration
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="sd-admin-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sd-admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE & REASSIGNMENT PROTECTION MODAL                                    */}
      {/* ========================================================================= */}
      {deleteModalCat && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title" style={{ color: "#ef4444" }}>
                Delete Category: {deleteModalCat.name}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setDeleteModalCat(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {deleteModalCat.total_projects_count > 0 ? (
                <div>
                  <div style={{ padding: "0.8rem 1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", marginBottom: "1rem" }}>
                    <strong style={{ color: "#ef4444", fontSize: "0.85rem", display: "block" }}>
                      ⚠️ Category Contains {deleteModalCat.total_projects_count} Active Project(s)
                    </strong>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--admin-text-main)", lineHeight: 1.4 }}>
                      To protect architectural archive integrity, you must reassign these projects to another category before deletion.
                    </p>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Reassign Projects To *</label>
                    <select
                      className="admin-select"
                      value={reassignTargetId || ""}
                      onChange={(e) => setReassignTargetId(Number(e.target.value))}
                      required
                    >
                      <option value="">-- Select Target Category --</option>
                      {categories
                        .filter(c => c.id !== deleteModalCat.id && c.is_active)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.total_projects_count} current projects)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "var(--admin-text-main)", lineHeight: 1.5 }}>
                  Are you sure you want to delete category <strong>{deleteModalCat.name}</strong>? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="sd-admin-btn-secondary"
                onClick={() => setDeleteModalCat(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sd-delete-btn"
                style={{ padding: "0.5rem 1rem" }}
                disabled={saving || (deleteModalCat.total_projects_count > 0 && !reassignTargetId)}
                onClick={handleConfirmDelete}
              >
                {saving ? "Deleting..." : deleteModalCat.total_projects_count > 0 ? "Reassign & Delete" : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

