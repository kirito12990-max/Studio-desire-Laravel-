import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProjectsPage } from "./pages/ProjectsPage";
import { GalleryPage } from "./pages/GalleryPage";
import { ProductsPage } from "./pages/ProductsPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { ThreeDPage } from "./pages/ThreeDPage";
import { ComingSoon } from "./components/ComingSoon";
import { ProjectDetail } from "./components/ProjectDetail";
import { ProductDetail } from "./components/ProductDetail";
import { ProjectSummary } from "./types/project";
import { ProductSummary } from "./types/product";
import { authService, AuthUser } from "./services/authService";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminLoadingFallback } from "./admin/AdminLoadingFallback";
import "./styles/editorial.css";
import "./styles/admin.css";

const LoginPage = React.lazy(() =>
  import("./admin/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const AdminLayout = React.lazy(() =>
  import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>("projects");
  const [galleryCategory, setGalleryCategory] = useState<string>("ALL");
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [cachedProjects, setCachedProjects] = useState<ProjectSummary[]>([]);
  const [cachedProducts, setCachedProducts] = useState<ProductSummary[]>([]);
  const [ownerUser, setOwnerUser] = useState<AuthUser | null>(authService.getUser());

  // Restore authenticated session from HttpOnly cookie on boot
  useEffect(() => {
    let isMounted = true;
    authService.getMe().then((user) => {
      if (isMounted && user) {
        setOwnerUser(user);
      }
    }).catch(() => {
      // Visitor is unauthenticated
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Parse hash route or pathname on load and hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.slice(1) || "projects";
      let cleanHash = rawHash.toLowerCase();

      // Redirect legacy #blueprint or #planning routes directly to #contact
      if (cleanHash === "planning" || cleanHash === "blueprint") {
        cleanHash = "contact";
        window.location.hash = "#contact";
      }

      // Split path from query parameters (e.g. owner/dashboard?tab=meetings&calendar_connected=true)
      const [pathPart] = cleanHash.split("?");

      // Check browser pathname as well
      const pathname = window.location.pathname.toLowerCase();
      let targetPath = pathPart;
      if (pathname.includes("owner/login")) {
        targetPath = "owner/login";
      } else if (pathname.includes("owner/dashboard")) {
        targetPath = "owner/dashboard";
      }

      if (targetPath.startsWith("project/")) {
        const slug = rawHash.replace(/^project\//i, "").split("?")[0];
        setCurrentRoute("projects");
        setSelectedProjectSlug(slug);
        setSelectedProductSlug(null);
        document.title = "Studio Desire | Project Dossier";
      } else if (targetPath.startsWith("product/")) {
        const slug = rawHash.replace(/^product\//i, "").split("?")[0];
        setCurrentRoute("products");
        setSelectedProductSlug(slug);
        setSelectedProjectSlug(null);
        document.title = "Studio Desire | Product Archive";
      } else if (targetPath.startsWith("gallery")) {
        let cat = "ALL";
        const catMatch = rawHash.match(/category=([^&]+)/i);
        if (catMatch) {
          cat = decodeURIComponent(catMatch[1]);
        }
        setGalleryCategory(cat);
        setCurrentRoute("gallery");
        setSelectedProjectSlug(null);
        setSelectedProductSlug(null);
        document.title = `Studio Desire | Portfolio Gallery - ${cat}`;
      } else {
        setSelectedProjectSlug(null);
        setSelectedProductSlug(null);

        // Normalize owner routes and enforce protection
        const isAuth = authService.isAuthenticated();
        if (targetPath === "admin") {
          targetPath = isAuth ? "owner/dashboard" : "owner/login";
        }

        if (targetPath === "owner/dashboard" && !isAuth) {
          targetPath = "owner/login";
          window.location.hash = "#owner/login";
        } else if (targetPath === "owner/login" && isAuth) {
          targetPath = "owner/dashboard";
          window.location.hash = "#owner/dashboard";
        }

        setCurrentRoute(targetPath);

        switch (targetPath) {
          case "products":
            document.title = "Studio Desire | Products";
            break;
          case "about":
            document.title = "Studio Desire | About";
            break;
          case "contact":
            document.title = "Studio Desire | Contact & Project Inquiry";
            break;
          case "projects":
            document.title = "Studio Desire | Architectural Projects";
            break;
          case "3d":
            document.title = "Studio Desire | 3D Visualization";
            break;
          case "owner/login":
            document.title = "Studio Desire | Owner Access";
            break;
          case "owner/dashboard":
          case "admin":
            document.title = "Studio Desire | Owner Dashboard";
            break;
          default:
            document.title = "Studio Desire | Interior Design Architecture";
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRouteChange = (route: string) => {
    setCurrentRoute(route);
    setSelectedProjectSlug(null);
    setSelectedProductSlug(null);
    window.location.hash = `#${route}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenCategoryGallery = (categoryName: string) => {
    setGalleryCategory(categoryName);
    setCurrentRoute("gallery");
    window.location.hash = `#gallery?category=${encodeURIComponent(categoryName)}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setOwnerUser(null);
      handleRouteChange("projects");
    }
  };

  const handleSelectProject = (slug: string) => {
    setSelectedProjectSlug(slug);
    setSelectedProductSlug(null);
    window.location.hash = `#project/${slug}`;
  };

  const handleCloseProject = () => {
    setSelectedProjectSlug(null);
    window.location.hash = `#projects`;
  };

  const handleNavigateProject = (slug: string) => {
    setSelectedProjectSlug(slug);
    window.location.hash = `#project/${slug}`;
  };

  const handleSelectProduct = (slug: string) => {
    setSelectedProductSlug(slug);
    setSelectedProjectSlug(null);
    window.location.hash = `#product/${slug}`;
  };

  const handleCloseProduct = () => {
    setSelectedProductSlug(null);
    window.location.hash = `#products`;
  };

  const handleNavigateProduct = (slug: string) => {
    setSelectedProductSlug(slug);
    window.location.hash = `#product/${slug}`;
  };

  // Dedicated Owner CMS / Admin Dashboard & Login Route
  if (currentRoute === "owner/login" || currentRoute === "owner/dashboard" || currentRoute === "admin") {
    return (
      <ErrorBoundary fallbackTitle="Studio Desire Management Console">
        <React.Suspense fallback={<AdminLoadingFallback />}>
          {!ownerUser ? (
            <LoginPage
              onLoginSuccess={(session) => {
                const user: AuthUser = {
                  id: session.user_id,
                  username: session.username,
                  role: session.role,
                  must_change_password: session.must_change_password
                };
                setOwnerUser(user);
                handleRouteChange("owner/dashboard");
              }}
              onCancel={() => handleRouteChange("projects")}
            />
          ) : (
            <AdminLayout
              user={ownerUser}
              onLogout={handleLogout}
              onExitToWebsite={() => handleRouteChange("projects")}
              onOpenProjectDetail={handleSelectProject}
            />
          )}
        </React.Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Studio Desire Portfolio Notice">
      <Header currentRoute={currentRoute} onRouteChange={handleRouteChange} />

      <main className="main-content">
        {currentRoute === "projects" && (
          <ProjectsPage
            onSelectProject={handleSelectProject}
            onOpenCategoryGallery={handleOpenCategoryGallery}
            onProjectsLoaded={(projs) => setCachedProjects(projs)}
          />
        )}

        {currentRoute === "gallery" && (
          <GalleryPage
            projects={cachedProjects}
            initialCategory={galleryCategory}
            onSelectProject={handleSelectProject}
            onBackToCurated={() => handleRouteChange("projects")}
          />
        )}

        {currentRoute === "products" && (
          <ProductsPage
            onSelectProduct={handleSelectProduct}
            onProductsLoaded={(prods) => setCachedProducts(prods)}
            onNavigateContact={() => handleRouteChange("contact")}
          />
        )}

        {currentRoute === "about" && (
          <AboutPage
            onNavigateContact={() => handleRouteChange("contact")}
          />
        )}

        {currentRoute === "contact" && (
          <ContactPage />
        )}

        {currentRoute === "3d" && (
          <ThreeDPage
            onNavigateContact={() => handleRouteChange("contact")}
          />
        )}

        {/* Fallback for any unknown hash route */}
        {![
          "projects", "gallery", "3d", "products", "about", "contact"
        ].includes(currentRoute) && (
          <ComingSoon
            sectionKey={currentRoute}
            onReturnToProjects={() => handleRouteChange("projects")}
          />
        )}
      </main>

      {/* Project Detail Modal Dossier */}
      <ProjectDetail
        slug={selectedProjectSlug}
        allProjects={cachedProjects}
        onClose={handleCloseProject}
        onNavigateProject={handleNavigateProject}
      />

      {/* Product Detail Modal Dossier & Image Lightbox */}
      <ProductDetail
        slug={selectedProductSlug}
        allProducts={cachedProducts}
        onClose={handleCloseProduct}
        onNavigateProduct={handleNavigateProduct}
        onContactClick={() => handleRouteChange("contact")}
      />

      <Footer
        currentRoute={currentRoute}
        onRouteChange={handleRouteChange}
        authUser={ownerUser}
        onLogout={handleLogout}
      />
    </ErrorBoundary>
  );
};

export default App;
