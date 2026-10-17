import React from "react";

interface FooterProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  authUser?: any;
  onLogout?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentRoute,
  onRouteChange,
}) => {
  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    onRouteChange(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="site-footer" id="siteFooter">
      <div className="container">
        <div className="footer-top-row">
          <div className="footer-brand">
            <div className="footer-brand-title">STUDIO DESIRE</div>
            <p className="footer-tagline">
              Architecture and interior design studio dedicated to material integrity, light, and timeless spatial atmospheres.
            </p>
          </div>

          <nav className="footer-nav" aria-label="Footer Navigation">
            <div className="footer-nav-col">
              <span className="footer-nav-title">Archive</span>
              <a
                href="#projects"
                className={`footer-link ${currentRoute === "projects" ? "active" : ""}`}
                onClick={(e) => handleNavClick("projects", e)}
              >
                Projects
              </a>
              <a
                href="#3d"
                className={`footer-link ${currentRoute === "3d" ? "active" : ""}`}
                onClick={(e) => handleNavClick("3d", e)}
              >
                3D Visualization
              </a>
              <a
                href="#products"
                className={`footer-link ${currentRoute === "products" ? "active" : ""}`}
                onClick={(e) => handleNavClick("products", e)}
              >
                Products
              </a>
            </div>

            <div className="footer-nav-col">
              <span className="footer-nav-title">Studio</span>
              <a
                href="#about"
                className={`footer-link ${currentRoute === "about" ? "active" : ""}`}
                onClick={(e) => handleNavClick("about", e)}
              >
                About
              </a>
              <a
                href="#contact"
                className={`footer-link ${currentRoute === "contact" ? "active" : ""}`}
                onClick={(e) => handleNavClick("contact", e)}
              >
                Contact
              </a>
              <a
                href="#owner/login"
                className={`footer-link ${currentRoute.startsWith("owner/") ? "active" : ""}`}
                onClick={(e) => handleNavClick("owner/login", e)}
              >
                Owner Portal
              </a>
            </div>
          </nav>
        </div>

        <div className="footer-bottom-row">
          <div className="footer-copyright">
            <span>© 2026 Studio Desire. All architectural rights reserved.</span>
          </div>

          <div className="footer-utility-row">
            <div className="footer-auth-cluster">
              <span className="footer-prototype-tag">Studio Archive v1.0</span>
              <span className="footer-auth-divider">/</span>
              <a
                href="#owner/login"
                className="footer-owner-link"
                onClick={(e) => handleNavClick("owner/login", e)}
                title="Studio Desire Private Owner & Team Access"
              >
                Owner Access
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

