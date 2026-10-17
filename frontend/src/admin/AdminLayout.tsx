import React, { useState, useEffect, useRef } from "react";
import { AuthUser } from "../services/authService";
import { adminService } from "../services/adminService";
import { DashboardStats, GlobalSearchResult, SearchResultItem } from "../types/admin";

// Admin Views
import { DashboardOverview } from "./DashboardOverview";
import { ProjectsManager } from "./ProjectsManager";
import { ClientsManager } from "./ClientsManager";
import { EnquiriesManager } from "./EnquiriesManager";
import { TasksManager } from "./TasksManager";
import { MaterialsManager } from "./MaterialsManager";
import { MeetingsManager } from "./MeetingsManager";
import { FilesManager } from "./FilesManager";
import { FinanceManager } from "./FinanceManager";
import { ThreeDManager } from "./ThreeDManager";
import { VRManager } from "./VRManager";
import { MediaLibrary } from "./MediaLibrary";
import { WebsiteContentManager } from "./WebsiteContentManager";
import { UserManager } from "./UserManager";
import { CategoryManager } from "./CategoryManager";
import { SlideshowManager } from "./SlideshowManager";
import { ActivityLogView } from "./ActivityLogView";
import { SettingsView } from "./SettingsView";
import { MustChangePasswordModal } from "./MustChangePasswordModal";

interface AdminLayoutProps {
  user: AuthUser;
  onLogout: () => void;
  onExitToWebsite: () => void;
  onOpenProjectDetail: (slug: string) => void;
}

// Architectural SVG Line Icons
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Projects: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Clients: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Enquiries: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  Tasks: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Meetings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Slideshow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Categories: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Content: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Media: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  ThreeD: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  VR: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4l3 3 2-3h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <circle cx="7.5" cy="12" r="1.5" />
      <circle cx="16.5" cy="12" r="1.5" />
    </svg>
  ),
  Materials: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Files: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Finance: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.FC;
  badge?: (stats: DashboardStats | null) => React.ReactNode;
  requiredRoles?: string[];
}

interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

const NAVIGATION_GROUPS: NavGroupConfig[] = [
  {
    title: "STUDIO OPERATIONS",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
      {
        id: "projects",
        label: "Projects",
        icon: Icons.Projects,
        badge: (stats) => stats?.active_projects ? (
          <span className="admin-nav-count-chip">{stats.active_projects}</span>
        ) : null
      },
      {
        id: "clients",
        label: "Clients",
        icon: Icons.Clients,
        badge: (stats) => stats?.total_clients ? (
          <span className="admin-nav-count-chip">{stats.total_clients}</span>
        ) : null
      },
      {
        id: "enquiries",
        label: "Enquiries & Leads",
        icon: Icons.Enquiries,
        badge: (stats) => stats && stats.new_enquiries > 0 ? (
          <span className="highlight-badge highlight-badge-green">{stats.new_enquiries} NEW</span>
        ) : null
      },
      {
        id: "tasks",
        label: "Tasks",
        icon: Icons.Tasks,
        badge: (stats) => stats && stats.overdue_tasks > 0 ? (
          <span className="highlight-badge highlight-badge-red">{stats.overdue_tasks}</span>
        ) : null
      },
      {
        id: "meetings",
        label: "Calendar & Meetings",
        icon: Icons.Meetings,
        badge: (stats) => stats && stats.upcoming_meetings_count > 0 ? (
          <span className="admin-nav-count-chip">{stats.upcoming_meetings_count}</span>
        ) : null
      }
    ]
  },
  {
    title: "PORTFOLIO & WEBSITE",
    items: [
      { id: "slideshow", label: "Featured Slideshow", icon: Icons.Slideshow },
      { id: "categories", label: "Portfolio Categories", icon: Icons.Categories },
      { id: "content", label: "Website Content", icon: Icons.Content },
      {
        id: "media",
        label: "Media Library",
        icon: Icons.Media,
        badge: (stats) => stats && stats.unassigned_media_count > 0 ? (
          <span className="highlight-badge highlight-badge-amber">{stats.unassigned_media_count}</span>
        ) : null
      }
    ]
  },
  {
    title: "PROJECT RESOURCES",
    items: [
      { id: "3d", label: "3D Visualizations", icon: Icons.ThreeD },
      { id: "vr", label: "VR Experience Matrix", icon: Icons.VR },
      { id: "materials", label: "Materials Board", icon: Icons.Materials },
      { id: "files", label: "Files & Contracts", icon: Icons.Files }
    ]
  },
  {
    title: "BUSINESS",
    items: [
      {
        id: "finance",
        label: "Finance & Payments",
        icon: Icons.Finance,
        requiredRoles: ["MASTER", "ADMIN", "OWNER", "PROJECT_MANAGER"]
      }
    ]
  },
  {
    title: "PEOPLE & SECURITY",
    items: [
      {
        id: "users",
        label: "Team & Roles",
        icon: Icons.Users,
        requiredRoles: ["MASTER", "ADMIN", "OWNER"]
      },
      { id: "activity", label: "Activity Log", icon: Icons.Activity },
      { id: "settings", label: "Settings", icon: Icons.Settings }
    ]
  }
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  user,
  onLogout,
  onExitToWebsite,
  onOpenProjectDetail
}) => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [tabContext, setTabContext] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser>(user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rawHash = window.location.hash;
    if (rawHash.includes("tab=meetings") || rawHash.includes("calendar_connected") || rawHash.includes("calendar_error")) {
      setActiveTab("meetings");
    }
  }, []);

  useEffect(() => {
    adminService.getDashboardStats().then(setStats).catch(() => {});
  }, [activeTab]);

  // Global search effect with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await adminService.globalSearch(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSearchResults(false);
        setMobileSidebarOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const handleNavigateTab = (tab: string, context?: any) => {
    setActiveTab(tab);
    setTabContext(context);
    setShowSearchResults(false);
    setSearchQuery("");
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setShowSearchResults(false);
    setSearchQuery("");
    if (item.category === "project" && item.context_data?.id) {
      handleNavigateTab("projects", { projectId: item.context_data.id });
    } else if (item.category === "client" && item.context_data?.id) {
      handleNavigateTab("clients", { clientId: item.context_data.id });
    } else if (item.category === "enquiry" && item.context_data?.id) {
      handleNavigateTab("enquiries", { enquiryId: item.context_data.id });
    } else if (item.category === "product") {
      handleNavigateTab("content", { productId: item.context_data?.id });
    } else if (item.category === "file") {
      handleNavigateTab("files", { fileId: item.context_data?.id });
    } else {
      handleNavigateTab(item.url_tab || "dashboard", item.context_data);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userRole = (currentUser.role || "").toUpperCase();

  return (
    <div className="admin-layout">
      {/* Forced Password Reset on First Login */}
      {currentUser.must_change_password && (
        <MustChangePasswordModal
          onSuccess={() => {
            setCurrentUser({ ...currentUser, must_change_password: false });
          }}
        />
      )}

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Studio Desire Architectural Obsidian Sidebar */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`} aria-label="Studio Navigation">
        <div className="admin-sidebar-header">
          <div className="admin-brand-cluster">
            <div className="admin-brand-icon">SD</div>
            <div>
              <div className="admin-sidebar-brand">Studio Desire</div>
              <div className="admin-sidebar-tag">Studio Management</div>
            </div>
          </div>
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close Navigation"
          >
            <Icons.Close />
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin Sections">
          <ul className="admin-nav-list">
            {NAVIGATION_GROUPS.map((group) => {
              // Filter items by role permissions
              const visibleItems = group.items.filter((item) => {
                if (!item.requiredRoles) return true;
                if (userRole === "MASTER" || userRole === "OWNER") return true;
                return item.requiredRoles.includes(userRole);
              });

              if (visibleItems.length === 0) return null;

              return (
                <React.Fragment key={group.title}>
                  <li className="admin-nav-group-header">{group.title}</li>
                  {visibleItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <li key={item.id} className="admin-nav-item">
                        <button
                          type="button"
                          className={`admin-nav-btn ${isActive ? "active" : ""}`}
                          onClick={() => handleNavigateTab(item.id)}
                        >
                          <div className="admin-nav-btn-inner">
                            <span className="admin-nav-icon"><IconComponent /></span>
                            <span className="admin-nav-label">{item.label}</span>
                          </div>
                          {item.badge ? item.badge(stats) : null}
                        </button>
                      </li>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer (User info & Quick logout) */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-summary">
            <div className="admin-user-avatar">
              {getInitials(currentUser.username)}
            </div>
            <div className="admin-user-meta">
              <span className="admin-user-name">{currentUser.username}</span>
              <span className="admin-user-role-tag">{currentUser.role}</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-footer-logout-btn"
            onClick={onLogout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <Icons.Logout />
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="admin-main">
        {/* Global Top Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-mobile-toggle-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Open Navigation Menu"
              aria-expanded={mobileSidebarOpen}
            >
              <Icons.Menu />
            </button>

            {/* Global Search across 5 entity types */}
            <div className="admin-global-search-container" ref={searchContainerRef}>
              <span className="admin-search-icon"><Icons.Search /></span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search projects, clients, enquiries, products, files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults) setShowSearchResults(true);
                }}
                aria-label="Global studio search"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="admin-search-clear-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                    setShowSearchResults(false);
                  }}
                  aria-label="Clear Search"
                >
                  ✕
                </button>
              )}

              {/* Live Search Dropdown */}
              {showSearchResults && searchResults && (
                <div className="admin-search-dropdown" role="region" aria-label="Search Results">
                  <div className="admin-search-dropdown-header">
                    <span>{isSearching ? "Searching studio archive..." : `${searchResults.total_results} Matches found`}</span>
                    <button
                      type="button"
                      className="admin-search-close-link"
                      onClick={() => setShowSearchResults(false)}
                    >
                      Close (Esc)
                    </button>
                  </div>

                  {searchResults.total_results === 0 ? (
                    <div className="admin-search-empty">
                      No matching records found for "{searchQuery}".
                    </div>
                  ) : (
                    <div className="admin-search-results-stream">
                      {/* 1. PROJECTS */}
                      {searchResults.projects && searchResults.projects.length > 0 && (
                        <div className="admin-search-group">
                          <div className="admin-search-group-title">PROJECTS ({searchResults.projects.length})</div>
                          {searchResults.projects.map((p) => (
                            <div
                              key={`p-${p.id}`}
                              className="admin-search-result-row"
                              onClick={() => handleSelectSearchResult(p)}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(evt) => {
                                if (evt.key === "Enter") handleSelectSearchResult(p);
                              }}
                            >
                              <div className="admin-search-row-title">{p.title}</div>
                              <div className="admin-search-row-sub">{p.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. CLIENTS */}
                      {searchResults.clients && searchResults.clients.length > 0 && (
                        <div className="admin-search-group">
                          <div className="admin-search-group-title">CLIENTS ({searchResults.clients.length})</div>
                          {searchResults.clients.map((c) => (
                            <div
                              key={`c-${c.id}`}
                              className="admin-search-result-row"
                              onClick={() => handleSelectSearchResult(c)}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(evt) => {
                                if (evt.key === "Enter") handleSelectSearchResult(c);
                              }}
                            >
                              <div className="admin-search-row-title">{c.title}</div>
                              <div className="admin-search-row-sub">{c.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. ENQUIRIES & LEADS */}
                      {searchResults.enquiries && searchResults.enquiries.length > 0 && (
                        <div className="admin-search-group">
                          <div className="admin-search-group-title">ENQUIRIES & LEADS ({searchResults.enquiries.length})</div>
                          {searchResults.enquiries.map((e) => (
                            <div
                              key={`e-${e.id}`}
                              className="admin-search-result-row"
                              onClick={() => handleSelectSearchResult(e)}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(evt) => {
                                if (evt.key === "Enter") handleSelectSearchResult(e);
                              }}
                            >
                              <div className="admin-search-row-title">{e.title}</div>
                              <div className="admin-search-row-sub">{e.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 4. PRODUCTS */}
                      {searchResults.products && searchResults.products.length > 0 && (
                        <div className="admin-search-group">
                          <div className="admin-search-group-title">PRODUCTS & CATALOG ({searchResults.products.length})</div>
                          {searchResults.products.map((pr) => (
                            <div
                              key={`pr-${pr.id}`}
                              className="admin-search-result-row"
                              onClick={() => handleSelectSearchResult(pr)}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(evt) => {
                                if (evt.key === "Enter") handleSelectSearchResult(pr);
                              }}
                            >
                              <div className="admin-search-row-title">{pr.title}</div>
                              <div className="admin-search-row-sub">{pr.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 5. FILES & CONTRACTS */}
                      {searchResults.files && searchResults.files.length > 0 && (
                        <div className="admin-search-group">
                          <div className="admin-search-group-title">FILES & CONTRACTS ({searchResults.files.length})</div>
                          {searchResults.files.map((f) => (
                            <div
                              key={`f-${f.id}`}
                              className="admin-search-result-row"
                              onClick={() => handleSelectSearchResult(f)}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(evt) => {
                                if (evt.key === "Enter") handleSelectSearchResult(f);
                              }}
                            >
                              <div className="admin-search-row-title">{f.title}</div>
                              <div className="admin-search-row-sub">{f.subtitle}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="admin-header-right">
            <button
              type="button"
              className="admin-header-badge-btn"
              onClick={() => handleNavigateTab("dashboard")}
              title="Notifications"
              aria-label="View notifications"
            >
              🔔
              {stats && (stats.new_enquiries > 0 || stats.overdue_tasks > 0) && (
                <span className="admin-header-notification-dot" />
              )}
            </button>

            <button
              type="button"
              className="admin-header-btn"
              onClick={onExitToWebsite}
            >
              Public Site ↗
            </button>

            <div className="admin-header-user-badge">
              <div className="admin-user-avatar admin-user-avatar-sm">
                {getInitials(currentUser.username)}
              </div>
              <div className="admin-header-user-info">
                <span className="admin-header-username">
                  {currentUser.username}
                </span>
                <span className="admin-header-role">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <section className="admin-view-content">
          {activeTab === "dashboard" && (
            <DashboardOverview
              onNavigateTab={handleNavigateTab}
              onOpenProjectDetail={onOpenProjectDetail}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsManager
              onOpenProjectDetail={onOpenProjectDetail}
              onNavigateTab={handleNavigateTab}
              initialProjectId={tabContext?.projectId}
            />
          )}

          {activeTab === "clients" && (
            <ClientsManager
              onOpenProjectDetail={onOpenProjectDetail}
            />
          )}

          {activeTab === "enquiries" && (
            <EnquiriesManager
              onNavigateTab={handleNavigateTab}
            />
          )}

          {activeTab === "tasks" && (
            <TasksManager
              onOpenProjectWorkspace={(pId) => handleNavigateTab("projects", { projectId: pId })}
            />
          )}

          {activeTab === "3d" && (
            <ThreeDManager />
          )}

          {activeTab === "vr" && (
            <VRManager />
          )}

          {activeTab === "materials" && (
            <MaterialsManager />
          )}

          {activeTab === "media" && (
            <MediaLibrary initialFilter={tabContext?.filter || "all"} />
          )}

          {activeTab === "meetings" && (
            <MeetingsManager />
          )}

          {activeTab === "files" && (
            <FilesManager />
          )}

          {activeTab === "finance" && (
            <FinanceManager
              onOpenProjectWorkspace={(pId) => handleNavigateTab("projects", { projectId: pId })}
            />
          )}

          {activeTab === "slideshow" && (
            <SlideshowManager />
          )}

          {activeTab === "categories" && (
            <CategoryManager />
          )}

          {activeTab === "content" && (
            <WebsiteContentManager />
          )}

          {activeTab === "users" && (userRole === "MASTER" || userRole === "ADMIN" || userRole === "OWNER") && (
            <UserManager />
          )}

          {activeTab === "activity" && (
            <ActivityLogView />
          )}

          {activeTab === "settings" && (
            <SettingsView
              user={currentUser}
              onUserUpdated={(updated) => setCurrentUser(updated)}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminLayout;
