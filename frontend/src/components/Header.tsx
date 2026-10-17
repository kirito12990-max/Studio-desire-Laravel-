import React, { useState } from "react";

interface HeaderProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, onRouteChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "projects", label: "Projects" },
    { id: "3d", label: "3D" },
    { id: "products", label: "Products" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" }
  ];

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    onRouteChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="site-header" id="siteHeader">
        <div className="container header-inner">
          <a
            href="#projects"
            className="brand-logo"
            onClick={(e) => handleNavClick("projects", e)}
            aria-label="Studio Desire Home"
          >
            <span className="brand-name">STUDIO DESIRE</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="nav-desktop" aria-label="Main Navigation">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`nav-link ${currentRoute === item.id ? "active" : ""}`}
                    onClick={(e) => handleNavClick(item.id, e)}
                    aria-current={currentRoute === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            className={`mobile-nav-toggle ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${mobileMenuOpen ? "open" : ""}`} aria-hidden={!mobileMenuOpen}>
        <nav aria-label="Mobile Navigation">
          <ul className="mobile-nav-list">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`mobile-nav-link ${currentRoute === item.id ? "active" : ""}`}
                  onClick={(e) => handleNavClick(item.id, e)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-drawer-footer">
          <p>STUDIO DESIRE · Interior Design Archive</p>
          <p style={{ fontSize: "0.6875rem", marginTop: "0.5rem" }}>Client Prototype Version</p>
        </div>
      </div>
    </>
  );
};
