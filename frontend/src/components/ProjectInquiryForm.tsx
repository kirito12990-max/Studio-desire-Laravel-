import React, { useState, useEffect, useRef } from "react";
import { enquiryService } from "../services/enquiryService";
import { EnquiryConfig, EnquirySubmissionResponse } from "../types/enquiry";

interface ProjectInquiryFormProps {
  initialProjectType?: string;
  onSubmitted?: (refNumber: string) => void;
}

export const ProjectInquiryForm: React.FC<ProjectInquiryFormProps> = ({
  initialProjectType = "",
  onSubmitted
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [config, setConfig] = useState<EnquiryConfig | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectType, setProjectType] = useState(initialProjectType);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Validation & UI State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<EnquirySubmissionResponse | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    enquiryService
      .getConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (!projectType && cfg.project_types.length > 0) {
          setProjectType(cfg.project_types[0]);
        }
      })
      .catch((err) => console.error("Failed to load enquiry config:", err));
  }, []);

  const scrollToFormTop = () => {
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const validateStep1 = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    if (!phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (phone.trim().length < 7) {
      errs.phone = "Please enter a valid phone number.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!projectType || !projectType.trim()) {
      errs.projectType = "Please select a project type.";
    }
    if (!message.trim()) {
      errs.message = "Please share a project brief or requirements.";
    } else if (message.trim().length < 10) {
      errs.message = "Project brief must be at least 10 characters.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFrom1 = () => {
    if (validateStep1()) {
      setStep(2);
      scrollToFormTop();
    }
  };

  const handleNextFrom2 = () => {
    if (validateStep2()) {
      setStep(3);
      scrollToFormTop();
    }
  };

  const handleNextFrom3 = () => {
    setStep(4);
    scrollToFormTop();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
  };

  const processFiles = (newFiles: File[]) => {
    const MAX_SIZE_MB = 50;
    const invalid = newFiles.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (invalid) {
      setFileError(`"${invalid.name}" exceeds the 50MB file size limit.`);
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("project_type", projectType);
      formData.append("location", location.trim());
      formData.append("budget", budget.trim());
      formData.append("timeline", timeline.trim());
      formData.append("message", message.trim());
      formData.append("source", "contact");

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await enquiryService.submitEnquiry(formData);
      setSubmitResult(response);
      setStep(5);
      scrollToFormTop();
      if (onSubmitted && response.reference_number) {
        onSubmitted(response.reference_number);
      }
    } catch (err: any) {
      setErrors({
        submit: err.message || "An error occurred while submitting your enquiry. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setProjectType(config?.project_types?.[0] || "Residential");
    setLocation("");
    setBudget("");
    setTimeline("");
    setMessage("");
    setFiles([]);
    setErrors({});
    setSubmitResult(null);
    setStep(1);
    scrollToFormTop();
  };

  const defaultProjectTypes = [
    "Residential",
    "Villa",
    "Apartment",
    "Office",
    "Restaurant",
    "Retail",
    "Hospitality",
    "Furniture / Product",
    "Other"
  ];

  const defaultBudgets = [
    "₹ 25 Lakhs – 50 Lakhs",
    "₹ 50 Lakhs – 1 Crore",
    "₹ 1 Crore – 2.5 Crores",
    "₹ 2.5 Crores – 5 Crores",
    "Above ₹ 5 Crores",
    "Custom Commission"
  ];

  const defaultTimelines = [
    "Immediate (1 — 3 Months)",
    "3 — 6 Months",
    "6 — 12 Months",
    "Concept Exploration Only"
  ];

  return (
    <div ref={formTopRef} id="inquiryFlowContainer">
      {/* Stepper Progress Bar (Steps 1 to 4) */}
      {step < 5 && (
        <div className="sd-stepper-card">
          <div className="sd-stepper-track">
            {/* 01 Contact */}
            <button
              type="button"
              className={`sd-step-item ${step === 1 ? "is-active" : ""}`}
              onClick={() => step > 1 && setStep(1)}
              disabled={step < 1}
            >
              <div className={`sd-step-badge ${step === 1 ? "active" : step > 1 ? "completed" : "pending"}`}>
                {step > 1 ? "✓" : "01"}
              </div>
              <div className="sd-step-info">
                <span className="sd-step-number">Step 01</span>
                <span className="sd-step-title">Contact</span>
              </div>
            </button>

            <div className={`sd-step-divider ${step > 1 ? "completed" : ""}`} />

            {/* 02 Project */}
            <button
              type="button"
              className={`sd-step-item ${step === 2 ? "is-active" : ""}`}
              onClick={() => step > 2 && setStep(2)}
              disabled={step < 2}
            >
              <div className={`sd-step-badge ${step === 2 ? "active" : step > 2 ? "completed" : "pending"}`}>
                {step > 2 ? "✓" : "02"}
              </div>
              <div className="sd-step-info">
                <span className="sd-step-number">Step 02</span>
                <span className="sd-step-title">Project</span>
              </div>
            </button>

            <div className={`sd-step-divider ${step > 2 ? "completed" : ""}`} />

            {/* 03 Rough Design */}
            <button
              type="button"
              className={`sd-step-item ${step === 3 ? "is-active" : ""}`}
              onClick={() => step > 3 && setStep(3)}
              disabled={step < 3}
            >
              <div className={`sd-step-badge ${step === 3 ? "active" : step > 3 ? "completed" : "pending"}`}>
                {step > 3 ? "✓" : "03"}
              </div>
              <div className="sd-step-info">
                <span className="sd-step-number">Step 03</span>
                <span className="sd-step-title">Rough Design</span>
              </div>
            </button>

            <div className={`sd-step-divider ${step > 3 ? "completed" : ""}`} />

            {/* 04 Review */}
            <button
              type="button"
              className={`sd-step-item ${step === 4 ? "is-active" : ""}`}
              onClick={() => step === 4 && setStep(4)}
              disabled={step < 4}
            >
              <div className={`sd-step-badge ${step === 4 ? "active" : "pending"}`}>
                04
              </div>
              <div className="sd-step-info">
                <span className="sd-step-number">Step 04</span>
                <span className="sd-step-title">Review</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Form Card */}
      <div className="sd-form-card">
        {/* ================= STEP 01: CONTACT ================= */}
        {step === 1 && (
          <div>
            <div className="sd-form-header">
              <h3 className="sd-form-step-heading">01 — Client Contact Information</h3>
              <span className="sd-form-step-tag">Step 1 of 4</span>
            </div>

            <div className="sd-field-group">
              <label className="sd-field-label" htmlFor="clientName">
                Full Name <span className="sd-field-req">*</span>
              </label>
              <input
                id="clientName"
                type="text"
                className={`sd-input ${errors.name ? "has-error" : ""}`}
                placeholder="e.g. Eleanor Vance"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                autoFocus
              />
              {errors.name && <span className="sd-field-error">{errors.name}</span>}
            </div>

            <div className="sd-form-row-2">
              <div className="sd-field-group">
                <label className="sd-field-label" htmlFor="clientEmail">
                  Email Address <span className="sd-field-req">*</span>
                </label>
                <input
                  id="clientEmail"
                  type="email"
                  className={`sd-input ${errors.email ? "has-error" : ""}`}
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                />
                {errors.email && <span className="sd-field-error">{errors.email}</span>}
              </div>

              <div className="sd-field-group">
                <label className="sd-field-label" htmlFor="clientPhone">
                  Phone Number <span className="sd-field-req">*</span>
                </label>
                <input
                  id="clientPhone"
                  type="tel"
                  className={`sd-input ${errors.phone ? "has-error" : ""}`}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                />
                {errors.phone && <span className="sd-field-error">{errors.phone}</span>}
              </div>
            </div>

            <div className="sd-form-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="sd-btn-next" onClick={handleNextFrom1}>
                NEXT: PROJECT →
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 02: PROJECT ================= */}
        {step === 2 && (
          <div>
            <div className="sd-form-header">
              <h3 className="sd-form-step-heading">02 — Architectural Project Scope</h3>
              <span className="sd-form-step-tag">Step 2 of 4</span>
            </div>

            {/* Project Type Selectable Grid */}
            <div className="sd-field-group">
              <label className="sd-field-label">
                Project Type <span className="sd-field-req">*</span>
              </label>
              <div className="sd-project-type-grid">
                {(config?.project_types || defaultProjectTypes).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`sd-type-pill ${projectType === type ? "is-selected" : ""}`}
                    onClick={() => {
                      setProjectType(type);
                      if (errors.projectType) setErrors((prev) => ({ ...prev, projectType: "" }));
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {errors.projectType && <span className="sd-field-error">{errors.projectType}</span>}
            </div>

            {/* Location & Budget Row */}
            <div className="sd-form-row-2">
              <div className="sd-field-group">
                <label className="sd-field-label" htmlFor="projectLocation">
                  Site / Project Location <span className="sd-field-optional">(Optional)</span>
                </label>
                <input
                  id="projectLocation"
                  type="text"
                  className="sd-input"
                  placeholder="e.g. Bodakdev, Ahmedabad or Mumbai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="sd-field-group">
                <label className="sd-field-label" htmlFor="projectBudget">
                  Estimated Budget <span className="sd-field-optional">(Optional)</span>
                </label>
                <select
                  id="projectBudget"
                  className="sd-select"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="">Select Estimated Range</option>
                  {(config?.budget_ranges || defaultBudgets).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline */}
            <div className="sd-field-group">
              <label className="sd-field-label" htmlFor="projectTimeline">
                Expected Timeline <span className="sd-field-optional">(Optional)</span>
              </label>
              <select
                id="projectTimeline"
                className="sd-select"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              >
                <option value="">Select Target Timeline</option>
                {(config?.timelines || defaultTimelines).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Brief */}
            <div className="sd-field-group">
              <label className="sd-field-label" htmlFor="projectMessage">
                Project Brief / Requirements <span className="sd-field-req">*</span>
              </label>
              <textarea
                id="projectMessage"
                className={`sd-textarea ${errors.message ? "has-error" : ""}`}
                rows={5}
                placeholder="Describe the space, your volumetric vision, aesthetic aspirations, family size, or special requirements..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors((prev) => ({ ...prev, message: "" }));
                }}
              />
              {errors.message && <span className="sd-field-error">{errors.message}</span>}
            </div>

            <div className="sd-form-actions">
              <button type="button" className="sd-btn-back" onClick={() => setStep(1)}>
                ← BACK
              </button>
              <button type="button" className="sd-btn-next" onClick={handleNextFrom2}>
                NEXT: ROUGH DESIGN →
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 03: ROUGH DESIGN ================= */}
        {step === 3 && (
          <div>
            <div className="sd-form-header">
              <div>
                <h3 className="sd-form-step-heading">03 — Rough Design & Reference Materials</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--inq-text-muted)", margin: "0.3rem 0 0" }}>
                  This step is completely optional. Share sketches, floor plans, AutoCAD files, or inspiration moodboards.
                </p>
              </div>
              <span className="sd-form-step-tag">Step 3 of 4</span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              className={`sd-upload-zone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.dwg,.dxf,.svg,.mp4,.mov,.zip,.doc,.docx"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <div className="sd-upload-icon">📁</div>
              <div className="sd-upload-title">Drag & drop your files here or browse from device</div>
              <p className="sd-upload-sub">
                Upload layout sketches, architectural CAD files, PDF blueprints, reference images, or video walkthroughs.
              </p>
              <div className="sd-upload-formats">
                JPG · PNG · WEBP · PDF · DWG · DXF · SVG · MP4 · MOV (Max 50MB per file)
              </div>
            </div>

            {fileError && (
              <div style={{ marginTop: "0.75rem" }} className="sd-field-error">
                {fileError}
              </div>
            )}

            {/* Uploaded Files Preview List */}
            {files.length > 0 && (
              <div className="sd-uploaded-files-list">
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--inq-teal-main)" }}>
                  Attached Documents ({files.length})
                </span>
                {files.map((file, idx) => (
                  <div key={idx} className="sd-file-preview-card">
                    <div className="sd-file-info">
                      <span className="sd-file-badge">
                        {file.name.split(".").pop() || "FILE"}
                      </span>
                      <div>
                        <div className="sd-file-name" title={file.name}>
                          {file.name}
                        </div>
                        <span className="sd-file-size">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sd-file-remove-btn"
                      onClick={() => removeFile(idx)}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="sd-form-actions">
              <button type="button" className="sd-btn-back" onClick={() => setStep(2)}>
                ← BACK
              </button>
              <button type="button" className="sd-btn-next" onClick={handleNextFrom3}>
                {files.length > 0 ? "REVIEW SUBMISSION →" : "SKIP / REVIEW SUBMISSION →"}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 04: REVIEW ================= */}
        {step === 4 && (
          <div>
            <div className="sd-form-header">
              <div>
                <h3 className="sd-form-step-heading">04 — Review & Confirm Enquiry</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--inq-text-muted)", margin: "0.3rem 0 0" }}>
                  Please review your project brief before final submission to Studio Desire.
                </p>
              </div>
              <span className="sd-form-step-tag">Step 4 of 4</span>
            </div>

            {errors.submit && (
              <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "0.85rem" }}>
                {errors.submit}
              </div>
            )}

            <div className="sd-review-card">
              {/* Client Info */}
              <div className="sd-review-section-title">CLIENT INFORMATION</div>
              <div className="sd-review-row">
                <span className="sd-review-label">Full Name</span>
                <span className="sd-review-val">{name}</span>
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Email Address</span>
                <span className="sd-review-val">{email}</span>
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Phone Number</span>
                <span className="sd-review-val">{phone}</span>
              </div>

              {/* Project Info */}
              <div className="sd-review-section-title" style={{ marginTop: "1.25rem" }}>
                PROJECT INFORMATION
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Project Type</span>
                <span className="sd-review-val">{projectType}</span>
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Location</span>
                <span className="sd-review-val">{location || "Not specified"}</span>
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Estimated Budget</span>
                <span className="sd-review-val">{budget || "To be discussed"}</span>
              </div>
              <div className="sd-review-row">
                <span className="sd-review-label">Expected Timeline</span>
                <span className="sd-review-val">{timeline || "Flexible"}</span>
              </div>

              {/* Project Brief */}
              <div className="sd-review-section-title" style={{ marginTop: "1.25rem" }}>
                PROJECT BRIEF / REQUIREMENTS
              </div>
              <div className="sd-review-brief-box">{message}</div>

              {/* Rough Design / Attachments */}
              <div className="sd-review-section-title" style={{ marginTop: "1.25rem" }}>
                ROUGH DESIGN / ATTACHMENTS ({files.length})
              </div>
              {files.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {files.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.3rem 0.6rem",
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--inq-border-light)",
                        borderRadius: "6px",
                        color: "var(--inq-text-main)"
                      }}
                    >
                      📎 {f.name} ({formatFileSize(f.size)})
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: "0.78rem", color: "var(--inq-text-dim)", fontStyle: "italic" }}>
                  No rough designs or files attached.
                </span>
              )}
            </div>

            <div className="sd-confidential-notice" style={{ marginBottom: "1rem" }}>
              <span className="sd-confidential-icon">🔒</span>
              <span className="sd-confidential-text">
                Your project data and drawings are confidential. Our principal architects will review your brief within 24–48 hours.
              </span>
            </div>

            <div className="sd-form-actions">
              <button type="button" className="sd-btn-back" onClick={() => setStep(3)} disabled={isSubmitting}>
                ← MAKE CHANGES
              </button>
              <button
                type="button"
                className="sd-btn-submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "TRANSMITTING ENQUIRY..." : "SUBMIT PROJECT ENQUIRY →"}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 05: SUCCESS STATE ================= */}
        {step === 5 && (
          <div className="sd-success-card">
            <div className="sd-success-icon-badge">✓</div>
            <h3 className="sd-success-title">PROJECT ENQUIRY RECEIVED</h3>
            
            <div className="sd-ref-badge-wrapper">
              <span className="sd-ref-badge">
                REFERENCE: {submitResult?.reference_number || "#0028"}
              </span>
            </div>

            <p className="sd-success-desc">
              Thank you, <strong>{name}</strong>. Your project brief has been securely transmitted to our studio.
              {submitResult?.email_sent && " A confirmation email has been dispatched to your address."}
              <br />
              Our principal team will review your requirements and connect with you shortly.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="sd-btn-back"
                onClick={handleReset}
              >
                SUBMIT ANOTHER ENQUIRY
              </button>
              <a
                href="#projects"
                className="sd-btn-next"
                style={{ textDecoration: "none" }}
              >
                EXPLORE PROJECTS ARCHIVE →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInquiryForm;
