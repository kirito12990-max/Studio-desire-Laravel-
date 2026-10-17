import React, { useState, useEffect } from "react";
import { contentService } from "../services/contentService";
import { ProjectInquiryForm } from "../components/ProjectInquiryForm";
import "../styles/inquiry.css";

export const ContactPage: React.FC = () => {
  const [cmsContact, setCmsContact] = useState<any>(null);

  useEffect(() => {
    contentService
      .getSectionContent("contact", null)
      .then((data) => {
        if (data) setCmsContact(data);
      })
      .catch((err) => console.error("Failed to fetch contact CMS:", err));
  }, []);

  const handleScrollToInquiry = () => {
    const el = document.getElementById("inquiryFlowContainer");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = el.querySelector("input") as HTMLInputElement | null;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 500);
      }
    }
  };

  const email = cmsContact?.email || "studiodesire01@gmail.com";
  const phone1 = cmsContact?.phone || "+91 75 75 87 72 25";
  const phone2 = cmsContact?.secondary_phone || "+91 87 80 37 04 08";
  const address = cmsContact?.address || "Studio Desire, Bodakdev / S.G. Highway, Ahmedabad, Gujarat 380054";
  const hours = cmsContact?.hours || "Monday — Saturday: 10:00 — 19:00 IST (By Appointment)";

  return (
    <div className="sd-inquiry-page sd-fade-in">
      {/* 1. TOP HERO SECTION */}
      <section className="sd-inquiry-hero">
        <div className="sd-inquiry-hero-container">
          <div className="sd-inquiry-hero-left">
            <div className="sd-inquiry-eyebrow">
              STUDIO DESIRE — INQUIRY
            </div>
            <h1 className="sd-inquiry-hero-title">
              Begin a Project Conversation
            </h1>
            <p className="sd-inquiry-hero-desc">
              Tell us about your space, your aspirations, and where you are in the process. 
              Our studio will review your enquiry and get back to you with architectural guidance.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="sd-inquiry-hero-cta-btn"
              onClick={handleScrollToInquiry}
            >
              SUBMIT YOUR PROJECT →
            </button>
          </div>
        </div>
      </section>

      {/* 2. MAIN SPLIT GRID: INQUIRY WORKSPACE + STUDIO INFO PANEL */}
      <div className="sd-inquiry-main-grid">
        {/* LEFT COLUMN: 4-STEP EMBEDDED PROJECT INQUIRY */}
        <div className="sd-inquiry-form-col">
          <ProjectInquiryForm />
        </div>

        {/* RIGHT COLUMN: STUDIO DESIRE CONTACT & HEADQUARTERS DOSSIER */}
        <aside className="sd-inquiry-info-col">
          <div className="sd-info-card">
            <div className="sd-info-header">
              <div className="sd-info-brand">STUDIO DESIRE</div>
              <span className="sd-info-tag">PROJECT INQUIRIES & STUDIO</span>
            </div>

            {/* Email */}
            <div className="sd-info-item">
              <span className="sd-info-item-label">Direct Correspondence</span>
              <div className="sd-info-item-val">
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            </div>

            {/* Telephone */}
            <div className="sd-info-item">
              <span className="sd-info-item-label">Studio Telephone</span>
              <div className="sd-info-item-val">
                <a href={`tel:${phone1.replace(/\s+/g, "")}`}>{phone1}</a>
                <br />
                <a href={`tel:${phone2.replace(/\s+/g, "")}`}>{phone2}</a>
              </div>
            </div>

            {/* Location */}
            <div className="sd-info-item">
              <span className="sd-info-item-label">Studio Atelier Location</span>
              <div className="sd-info-item-val">
                {address}
              </div>
            </div>

            {/* Working Hours */}
            <div className="sd-info-item">
              <span className="sd-info-item-label">Consultation Hours</span>
              <div className="sd-info-item-val">
                {hours}
              </div>
            </div>

            {/* Confidentiality Commitment */}
            <div className="sd-confidential-notice">
              <span className="sd-confidential-icon">🔒</span>
              <span className="sd-confidential-text">
                Your project information is treated as strictly confidential and is used solely to review your design commission.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ContactPage;
