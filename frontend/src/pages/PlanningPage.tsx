import React, { useState, useEffect } from "react";
import { contentService } from "../services/contentService";
import { ProjectEnquiryModal } from "../components/ProjectEnquiryModal";
import { StudioImage } from "../components/StudioImage";

interface PlanningStage {
  id?: number | string;
  step_number: string;
  title: string;
  subtitle?: string;
  description: string;
  deliverables?: string[];
  image_url?: string;
  is_published?: boolean;
}

interface PlanningContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  philosophy?: string;
  stages: PlanningStage[];
  cta_label?: string;
  cta_description?: string;
  cta_button_text?: string;
}

const DEFAULT_PLANNING: PlanningContent = {
  eyebrow: "04 — PLANNING & METHODOLOGY",
  title: "The Architectural Process",
  subtitle:
    "An editorial, phased methodology guiding every Studio Desire commission from initial hand-drawn sketch to precision architectural execution.",
  philosophy:
    "Every interior begins with a dialogue. We dismantle conventional spatial assumptions, examining natural light vectors, acoustic volumes, and client ritual before committing to formal drawing.",
  stages: [
    {
      id: 1,
      step_number: "01",
      title: "UNDERSTAND",
      subtitle: "Dialogue, Site Orientation & Spatial Briefing",
      description:
        "The project begins with open conversation. We investigate the client’s lifestyle, spatial rituals, aspirations, and architectural parameters. We analyze raw site context, sun orientations, circulation patterns, and structural possibilities.",
      deliverables: [
        "Spatial Requirements Brief",
        "Site & Volume Survey",
        "Aspiration & Material Dialogue",
        "Budget & Timeline Framework",
      ],
      image_url: "/uploads/projects/hardik-bhai/cover.webp",
      is_published: true,
    },
    {
      id: 2,
      step_number: "02",
      title: "EXPLORE",
      subtitle: "Volumetric Studies & Rough Conceptual Sketches",
      description:
        "Initial ideas take physical form through hand drawings, spatial zoning diagrams, and tactile moodboards. We test volumetric proportion, line balance, and partition strategies before locking the floor layout.",
      deliverables: [
        "Rough Spatial Sketches",
        "Volumetric Partition Concepts",
        "Tactile Mood & Material Palette",
        "Initial Furniture Zoning",
      ],
      image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      is_published: true,
    },
    {
      id: 3,
      step_number: "03",
      title: "DESIGN",
      subtitle: "3D Atmospheric Visualizations & Lighting Studies",
      description:
        "We develop photo-realistic 3D CGI visualisations and multi-room virtual reality walkthroughs. Every shadow, texture nuance, timber grain, and concealed light cove is previewed and fine-tuned to absolute perfection.",
      deliverables: [
        "High-Resolution 3D CGI Perspectives",
        "Interactive Room-by-Room VR Portals",
        "Layered Ambient Lighting Studies",
        "Custom Joinery & Millwork Models",
      ],
      image_url: "/uploads/projects/hardik-bhai/living-room-01.webp",
      is_published: true,
    },
    {
      id: 4,
      step_number: "04",
      title: "REFINE",
      subtitle: "Architectural Blueprints & Working Documentation",
      description:
        "We translate the approved design into millimetre-precise architectural working drawings: dimensioned floor plans, electrical coves, reflected ceiling plans, plumbing elevations, and joinery detailing.",
      deliverables: [
        "Architectural Working Blueprints",
        "Electrical & Lighting Circuit Schematics",
        "Plumbing & HVAC Coordination Plans",
        "Bespoke Millwork Technical Details",
      ],
      image_url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
      is_published: true,
    },
    {
      id: 5,
      step_number: "05",
      title: "DELIVER",
      subtitle: "Turnkey Site Execution, Material Curation & Handover",
      description:
        "From raw masonry to final bespoke art curation, we oversee on-site artisans, stone masons, carpenters, and finish contractors to guarantee that the built reality surpasses the visual blueprint.",
      deliverables: [
        "On-Site Architectural Supervision",
        "Contractor & Joinery Quality Control",
        "Material Sourcing & Hardware Commissioning",
        "Final Spatial Styling & Client Handover",
      ],
      image_url: "/uploads/projects/hardik-bhai/master-bed-01.webp",
      is_published: true,
    },
  ],
  cta_label: "COMMISSION A PROJECT",
  cta_description:
    "Whether you have a completed architectural site, an upcoming residence, or hand-drawn sketches, share your spatial vision with our studio.",
  cta_button_text: "SHARE YOUR ROUGH DESIGN / SUBMIT PROJECT",
};

interface PlanningPageProps {
  onNavigateContact?: () => void;
}

export const PlanningPage: React.FC<PlanningPageProps> = ({ onNavigateContact }) => {
  const [content, setContent] = useState<PlanningContent>(DEFAULT_PLANNING);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  useEffect(() => {
    contentService
      .getSectionContent<PlanningContent>("planning", DEFAULT_PLANNING)
      .then((data) => {
        if (data && data.stages && data.stages.length > 0) {
          setContent(data);
        }
      })
      .catch((err) => console.error("Failed to fetch planning CMS:", err));
  }, []);

  const publishedStages = (content.stages || []).filter(
    (s) => s.is_published !== false
  );

  return (
    <div className="sd-planning-page sd-fade-in">
      {/* Page Header */}
      <section className="sd-planning-header-section">
        <div className="sd-planning-header-container">
          <span className="sd-planning-eyebrow">
            {content.eyebrow || "04 — PLANNING & METHODOLOGY"}
          </span>
          <h1 className="sd-planning-title">
            {content.title || "The Architectural Process"}
          </h1>
          <p className="sd-planning-subtitle">
            {content.subtitle || DEFAULT_PLANNING.subtitle}
          </p>

          <div className="sd-planning-header-action">
            <button
              type="button"
              className="sd-planning-primary-cta"
              onClick={() => setIsModalOpen(true)}
            >
              <span>{content.cta_button_text || "SUBMIT YOUR PROJECT"}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <span className="sd-planning-header-hint">
              No account required. Upload floor plans, sketches, or brief.
            </span>
          </div>
        </div>
      </section>

      {/* Philosophy Callout */}
      {content.philosophy && (
        <section className="sd-planning-philosophy-section">
          <div className="sd-planning-philosophy-box">
            <span className="sd-planning-phil-tag">DESIGN PHILOSOPHY</span>
            <blockquote className="sd-planning-quote">
              "{content.philosophy}"
            </blockquote>
          </div>
        </section>
      )}

      {/* Process Stages Grid / Editorial Walkthrough */}
      <section className="sd-planning-stages-section">
        <div className="sd-planning-stages-container">
          <div className="sd-planning-stages-nav">
            <span className="sd-stages-nav-title">METHODOLOGY PHASES</span>
            <div className="sd-stages-nav-list">
              {publishedStages.map((stage, idx) => (
                <button
                  key={idx}
                  className={`sd-stages-nav-item ${
                    activeStageIndex === idx ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveStageIndex(idx);
                    const el = document.getElementById(`stage-${idx}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="sd-nav-num">{stage.step_number}</span>
                  <span className="sd-nav-name">{stage.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sd-planning-stages-content">
            {publishedStages.map((stage, idx) => (
              <article
                key={idx}
                id={`stage-${idx}`}
                className="sd-stage-card"
              >
                <div className="sd-stage-header">
                  <span className="sd-stage-num">{stage.step_number}</span>
                  <div className="sd-stage-meta">
                    <h2 className="sd-stage-title">{stage.title}</h2>
                    {stage.subtitle && (
                      <span className="sd-stage-subtitle">{stage.subtitle}</span>
                    )}
                  </div>
                </div>

                <div className="sd-stage-body">
                  <p className="sd-stage-description">{stage.description}</p>

                  {stage.deliverables && stage.deliverables.length > 0 && (
                    <div className="sd-stage-deliverables">
                      <span className="sd-deliverables-label">PHASE DELIVERABLES</span>
                      <ul className="sd-deliverables-list">
                        {stage.deliverables.map((item, dIdx) => (
                          <li key={dIdx} className="sd-deliverable-item">
                            <span className="sd-deliverable-bullet">&mdash;</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage.image_url && (
                    <div className="sd-stage-media-wrap">
                      <StudioImage
                        src={stage.image_url}
                        alt={`Phase ${stage.step_number} — ${stage.title}`}
                        className="sd-stage-image"
                        loading="lazy"
                        fallbackSrc="/uploads/projects/placeholder.webp"
                        showMissingState={false}
                      />
                      <span className="sd-stage-media-caption">
                        Phase {stage.step_number} — {stage.title} Documentation & Execution Study
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Final CTA Section */}
      <section className="sd-planning-cta-banner">
        <div className="sd-planning-cta-card">
          <span className="sd-cta-eyebrow">BEGIN YOUR COMMISSION</span>
          <h2 className="sd-cta-title">
            {content.cta_label || "START YOUR PROJECT"}
          </h2>
          <p className="sd-cta-description">
            {content.cta_description || DEFAULT_PLANNING.cta_description}
          </p>

          <div className="sd-cta-actions">
            <button
              type="button"
              className="sd-btn-editorial-primary sd-cta-main-btn"
              onClick={() => setIsModalOpen(true)}
            >
              {content.cta_button_text || "SUBMIT YOUR PROJECT / SHARE ROUGH DESIGN"}
            </button>
            {onNavigateContact && (
              <button
                type="button"
                className="sd-btn-editorial-secondary sd-cta-contact-btn"
                onClick={onNavigateContact}
              >
                Direct Studio Contact &rarr;
              </button>
            )}
          </div>
          <span className="sd-cta-footnote">
            Confidential review. Supported formats: PDF, CAD drawings, Sketches, Renders & Video.
          </span>
        </div>
      </section>

      {/* Project Submission Modal */}
      <ProjectEnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSource="planning"
      />
    </div>
  );
};
