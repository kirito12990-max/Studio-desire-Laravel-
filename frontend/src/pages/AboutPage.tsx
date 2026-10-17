import React, { useState, useEffect } from "react";
import { contentService } from "../services/contentService";

interface AboutPageProps {
  onNavigateContact: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateContact }) => {
  const [cmsAbout, setCmsAbout] = useState<any>(null);

  useEffect(() => {
    contentService.getSectionContent("about", null).then((data) => {
      if (data) setCmsAbout(data);
    });
  }, []);

  // Studio Capabilities (What We Do) — clean, minimal editorial list
  const disciplines = [
    {
      code: "01",
      title: "INTERIOR DESIGN",
      detail: "Private residences, penthouses & selective hospitality commissions"
    },
    {
      code: "02",
      title: "SPATIAL DESIGN",
      detail: "Volumetric architecture, natural light orientation & circulation"
    },
    {
      code: "03",
      title: "FURNITURE & OBJECTS",
      detail: "Custom furniture editions, bespoke joinery & curated objects"
    },
    {
      code: "04",
      title: "3D VISUALISATION",
      detail: "Atmospheric CGI studies, lighting simulations & spatial rendering"
    },
    {
      code: "05",
      title: "TECHNICAL DEVELOPMENT",
      detail: "Joinery documentation, architectural millwork & material schedules"
    },
    {
      code: "06",
      title: "PROJECT PLANNING",
      detail: "Space programming, architectural zoning & turnkey coordination"
    }
  ];

  interface StudioRole {
    role: string;
    name: string;
    discipline: string;
    tag: string;
  }

  // Studio People & Roles (Who We Are) — powered by CMS & real studio principals
  const studioRoles: StudioRole[] = (cmsAbout?.principals && cmsAbout.principals.length > 0)
    ? cmsAbout.principals.map((p: any) => ({
        role: String(p.role || ""),
        name: String(p.name || ""),
        discipline: p.phone ? `${p.role} · ${p.phone}` : String(p.role || ""),
        tag: "Leadership"
      }))
    : [
        {
          role: "PRINCIPAL ARCHITECT",
          name: "Zenith Suthar",
          discipline: "Lead Direction & Spatial Architecture · +91 75 75 87 72 25",
          tag: "Leadership"
        },
        {
          role: "DESIGN DIRECTOR",
          name: "Chetna Bhati",
          discipline: "Design Direction & Spatial Strategy · +91 87 80 37 04 08",
          tag: "Design"
        }
      ];

  // Studio Facts Index
  const studioFacts = [
    { label: "STUDIO", value: "Studio Desire" },
    { label: "DISCIPLINE", value: "Interior Architecture & Spatial Design" },
    { label: "PROJECTS", value: "Residential · Commercial · Hospitality" },
    { label: "DESIGN", value: "Interiors · Custom Furniture · Visualisation" },
    { label: "LOCATION", value: cmsAbout?.location || "Ahmedabad, Gujarat, India" },
    { label: "INQUIRIES", value: cmsAbout?.email || "studiodesire01@gmail.com" }
  ];

  return (
    <div className="about-view sd-fade-in">
      <section className="about-hero-block" style={{ paddingTop: "1.5rem" }}>
        <div className="container">
          <div className="about-lead-wrapper" style={{ marginBottom: "2rem" }}>
            <p className="about-lead-statement" style={{ fontSize: "1.45rem", fontWeight: 400, color: "var(--color-fg-primary)", lineHeight: 1.45 }}>
              "Studio Desire creates considered interiors where architecture, material, furniture and everyday life come together."
            </p>
            <span className="about-sub-label" style={{ display: "block", marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-fg-muted)" }}>
              Interior Architecture & Design Practice · Ahmedabad, India
            </span>
          </div>

          {/* Primary Studio Architecture Image */}
          <div className="about-primary-media">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85"
              alt="Studio Desire Architectural Interior Archive"
              className="about-primary-img"
            />
            <div className="about-media-caption">
              <span className="caption-tag">STUDIO ARCHIVE</span>
              <span className="caption-text">
                Spatial volume, natural illumination, and raw travertine finishes.
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 2. THE STUDIO — CONCISE TWO-COLUMN INTRO */}
        <section className="about-section about-studio-section">
          <div className="about-two-col">
            <div className="col-label-area">
              <span className="section-num-label">01 / THE STUDIO</span>
              <h2 className="editorial-section-heading">THE STUDIO</h2>
            </div>

            <div className="col-content-area">
              <p className="studio-intro-lead">
                Studio Desire is an interior architecture practice dedicated to creating calm, 
                considered spaces shaped around human ritual and daily living.
              </p>
              <p className="studio-body-text">
                We focus on private residences, bespoke penthouses, and selective commercial environments, 
                developing spaces defined by proportions, natural light, and authentic materiality rather than 
                transient decorative trends.
              </p>
              <p className="studio-body-text">
                Every project is approached as an integrated whole—uniting spatial architecture, bespoke furniture, 
                and tactile details into an enduring environment.
              </p>
            </div>
          </div>
        </section>

        {/* 3. WHO WE ARE — PEOPLE & STUDIO IDENTITY */}
        <section className="about-section about-people-section">
          <div className="about-section-header">
            <span className="section-num-label">02 / PEOPLE</span>
            <div className="header-flex-row">
              <h2 className="editorial-section-heading">WHO WE ARE</h2>
              <span className="header-sub-tag">THE PEOPLE BEHIND THE STUDIO</span>
            </div>
          </div>

          <div className="people-editorial-layout">
            {/* Collaborative Studio Environment Photo */}
            <div className="people-imagery-col">
              <div className="people-image-frame">
                <img
                  src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=80"
                  alt="Studio Desire Architectural Practice & Collaboration"
                  className="people-photo"
                />
                <div className="people-image-badge">STUDIO PRACTICE</div>
              </div>
              <p className="people-image-caption">
                The studio operates as a collaborative design atelier, uniting spatial architects, interior designers, and specialist craftspeople.
              </p>
            </div>

            {/* Editorial Team & Role Roster (Intentional placeholders) */}
            <div className="people-roster-col">
              <div className="roster-grid">
                {studioRoles.map((item, idx) => (
                  <div key={idx} className="roster-item">
                    <div className="roster-top">
                      <span className="roster-role">{item.role}</span>
                      <span className="roster-tag">{item.tag}</span>
                    </div>
                    <div className="roster-name-placeholder">
                      [{item.name}]
                    </div>
                    <p className="roster-discipline">{item.discipline}</p>
                    <span className="roster-status-note">Client placeholder</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHAT WE DO — MINIMAL NUMBERED LIST */}
        <section className="about-section about-what-we-do-section">
          <div className="about-section-header">
            <span className="section-num-label">03 / CAPABILITIES</span>
            <div className="header-flex-row">
              <h2 className="editorial-section-heading">WHAT WE DO</h2>
              <span className="header-sub-tag">STUDIO DISCIPLINES</span>
            </div>
          </div>

          <div className="disciplines-list">
            {disciplines.map((d) => (
              <div key={d.code} className="discipline-row">
                <div className="discipline-num">{d.code}</div>
                <div className="discipline-main">
                  <h3 className="discipline-title">{d.title}</h3>
                  <p className="discipline-detail">{d.detail}</p>
                </div>
                <div className="discipline-arrow" aria-hidden="true">→</div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. OUR APPROACH — SINGLE STRONG EDITORIAL STATEMENT */}
        <section className="about-section about-approach-section">
          <div className="about-two-col approach-two-col">
            <div className="col-label-area">
              <span className="section-num-label">04 / APPROACH</span>
              <h2 className="editorial-section-heading">OUR APPROACH</h2>
            </div>

            <div className="col-content-area">
              <blockquote className="approach-quote">
                "Every project begins with understanding the space, the people who inhabit it, and the character it should develop over time."
              </blockquote>
              <p className="approach-supporting-text">
                We believe that true spatial luxury emerges through reduction—paring away the superfluous to celebrate light, volume, and raw tactile finishes that patinate gracefully with age.
              </p>
              <div className="approach-meta-note">
                <span>Our studio process is discussed directly during project consultation.</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STUDIO FACTS — ARCHITECTURE STUDIO ARCHIVE INDEX */}
        <section className="about-section about-facts-section">
          <div className="about-section-header">
            <span className="section-num-label">05 / INDEX</span>
            <div className="header-flex-row">
              <h2 className="editorial-section-heading">STUDIO FACTS</h2>
              <span className="header-sub-tag">PRACTICE OVERVIEW</span>
            </div>
          </div>

          <div className="facts-index-grid">
            {studioFacts.map((fact, i) => (
              <div key={i} className="fact-index-item">
                <span className="fact-index-label">{fact.label}</span>
                <span className="fact-index-val">{fact.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. STUDIO ATMOSPHERE IMAGE — FULL WIDTH MATERIAL CATION */}
        <section className="about-section about-atmosphere-section">
          <div className="atmosphere-media-wrapper">
            <img
              src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=2000&q=85"
              alt="Studio Desire Material Samples and Drawing Table"
              className="atmosphere-image"
            />
            <div className="atmosphere-caption">
              <span className="caption-tag">STUDIO ENVIRONMENT</span>
              <span className="caption-text">
                Material research, tactile curation, and physical prototyping in the studio atelier.
              </span>
            </div>
          </div>
        </section>

        {/* 8. RESTRAINED CONTACT CTA */}
        <section className="archive-bottom-cta about-closing-cta">
          <div className="bottom-cta-content">
            <span className="cta-eyebrow">COMMISSIONS & INQUIRIES</span>
            <h2 className="cta-headline">HAVE A PROJECT IN MIND?</h2>
            <p className="cta-sub">
              We welcome residential commissions, bespoke penthouses, and custom furniture inquiries.
            </p>
            <button
              className="editorial-btn cta-action-btn"
              onClick={onNavigateContact}
            >
              START A CONVERSATION →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
