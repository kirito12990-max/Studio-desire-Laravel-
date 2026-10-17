import React from "react";
import { PlaceholderSection } from "../types/project";

const PLACEHOLDER_DATA: Record<string, PlaceholderSection> = {
  "3d": {
    code: "02",
    title: "3D VISUALIZATION",
    navLabel: "3D",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Spatial renderings, photorealistic atmospheric lighting studies, and CGI architecture archives will be showcased here.",
    expectedFeatures: [
      "Interactive 3D Walkthroughs",
      "Atmospheric Lighting Studies",
      "CGI Material Archives"
    ]
  },
  "blueprint": {
    code: "03",
    title: "BLUEPRINTS & DRAWINGS",
    navLabel: "Blueprint",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Architectural floor plans, spatial sections, structural joinery details, and technical documentation will be presented here.",
    expectedFeatures: [
      "Vector Floor Plans",
      "Joinery & Millwork Details",
      "Spatial Sections"
    ]
  },
  "planning": {
    code: "04",
    title: "SPATIAL PLANNING",
    navLabel: "Planning",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Interior zoning frameworks, circulation studies, ergonomic programming, and space allocation archives will be documented here.",
    expectedFeatures: [
      "Circulation Layouts",
      "Zoning Matrices",
      "Feasibility Analyses"
    ]
  },
  "products": {
    code: "05",
    title: "BESPOKE PRODUCTS",
    navLabel: "Products",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Custom furniture collections, handcrafted architectural hardware, tactile textiles, and limited edition luminaires will be curated here.",
    expectedFeatures: [
      "Custom Furniture Editions",
      "Architectural Hardware",
      "Limited Luminaires"
    ]
  },
  "about": {
    code: "06",
    title: "ABOUT STUDIO DESIRE",
    navLabel: "About",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Our design ethos, studio philosophy, material research practice, and lead architectural profile will be articulated here.",
    expectedFeatures: [
      "Design Ethos & Philosophy",
      "Material Research Practice",
      "Leadership & Team"
    ]
  },
  "contact": {
    code: "07",
    title: "CONTACT & INQUIRIES",
    navLabel: "Contact",
    description: "This section of Studio Desire is currently being prepared.",
    note: "Client project commissioning, architectural consultation bookings, and studio appointment information will be available here.",
    expectedFeatures: [
      "Project Commissioning",
      "Consultation Bookings",
      "Studio Coordinates"
    ]
  }
};

interface ComingSoonProps {
  sectionKey: string;
  onReturnToProjects: () => void;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ sectionKey, onReturnToProjects }) => {
  const section = PLACEHOLDER_DATA[sectionKey] || {
    code: "00",
    title: sectionKey.toUpperCase(),
    navLabel: sectionKey,
    description: "This section of Studio Desire is currently being prepared.",
    note: "Architectural documentation and project archives are being curated.",
    expectedFeatures: ["Archival Materials", "Studio Practice Modules"]
  };

  return (
    <section className="placeholder-view" role="region" aria-label="Section Placeholder">
      <div className="container">
        <div className="placeholder-container">
          <div className="placeholder-meta-code">{section.code}</div>
          <h1 className="placeholder-section-title">{section.title}</h1>
          <div className="placeholder-status-badge">COMING SOON</div>

          <p className="placeholder-desc">{section.description}</p>
          <p className="placeholder-subtext">{section.note}</p>

          <div className="placeholder-features-box">
            <div className="placeholder-features-title">Archival Modules in Development</div>
            <ul className="placeholder-features-list">
              {section.expectedFeatures.map((feat, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)"
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "4px",
                      height: "4px",
                      background: "var(--accent-warm)",
                      borderRadius: "50%"
                    }}
                  ></span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="placeholder-action-row">
            <button className="btn-primary-editorial" onClick={onReturnToProjects}>
              <span>← Return to Projects</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
