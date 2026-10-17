import React, { useState, useEffect, useRef } from 'react';
import { enquiryService } from '../services/enquiryService';
import { EnquiryConfig, EnquirySubmissionResponse } from '../types/enquiry';

interface ProjectEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSource?: string;
  initialProjectType?: string;
}

export const ProjectEnquiryModal: React.FC<ProjectEnquiryModalProps> = ({
  isOpen,
  onClose,
  initialSource = 'planning',
  initialProjectType = '',
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [config, setConfig] = useState<EnquiryConfig | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectType, setProjectType] = useState(initialProjectType);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  // UI state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<EnquirySubmissionResponse | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load config
      enquiryService.getConfig().then((cfg) => {
        setConfig(cfg);
        if (!projectType && cfg.project_types.length > 0) {
          setProjectType(cfg.project_types[0]);
        }
      }).catch(err => console.error('Failed to load enquiry config:', err));
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Full name is required.';
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (phone.trim().length < 7) {
      errs.phone = 'Please enter a valid phone number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: { [key: string]: string } = {};
    if (!projectType) errs.projectType = 'Please select a project type.';
    if (!message.trim()) errs.message = 'Please provide a project brief or description.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFrom1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleNextFrom2 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleNextFrom3 = () => {
    setStep(4); // Review step
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    // Limit check
    const MAX_SINGLE_MB = 50;
    const invalidFile = selectedFiles.find(f => f.size > MAX_SINGLE_MB * 1024 * 1024);
    if (invalidFile) {
      setFileError(`File "${invalidFile.name}" exceeds maximum allowed size of 50MB.`);
      return;
    }

    setFiles((prev) => [...prev, ...selectedFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      formData.append('project_type', projectType);
      formData.append('location', location.trim());
      formData.append('budget', budget.trim());
      formData.append('timeline', timeline.trim());
      formData.append('message', message.trim());
      formData.append('source', initialSource);

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await enquiryService.submitEnquiry(formData);
      setSubmitResult(response);
      setStep(5); // Success step
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrors({ submit: err?.response?.data?.detail || 'An error occurred while submitting your enquiry. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setName('');
    setEmail('');
    setPhone('');
    setLocation('');
    setBudget('');
    setTimeline('');
    setMessage('');
    setFiles([]);
    setErrors({});
    setStep(1);
    setSubmitResult(null);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="sd-enquiry-modal-backdrop" onClick={resetAndClose}>
      <div
        className="sd-enquiry-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sd-enquiry-modal-header">
          <div className="sd-enquiry-modal-brand">
            <span className="sd-enquiry-modal-eyebrow">STUDIO DESIRE — INQUIRY</span>
            <h2 className="sd-enquiry-modal-title">
              {step === 5 ? 'Project Submission' : 'Begin a Project Conversation'}
            </h2>
          </div>
          <button
            className="sd-enquiry-close-btn"
            onClick={resetAndClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Multi-step progress indicator */}
        {step < 5 && (
          <div className="sd-enquiry-stepper">
            <div className={`sd-step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <span className="sd-step-num">01</span>
              <span className="sd-step-label">Contact</span>
            </div>
            <div className="sd-step-divider" />
            <div className={`sd-step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <span className="sd-step-num">02</span>
              <span className="sd-step-label">Project</span>
            </div>
            <div className="sd-step-divider" />
            <div className={`sd-step-node ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
              <span className="sd-step-num">03</span>
              <span className="sd-step-label">Rough Design</span>
            </div>
            <div className="sd-step-divider" />
            <div className={`sd-step-node ${step >= 4 ? 'active' : ''}`}>
              <span className="sd-step-num">04</span>
              <span className="sd-step-label">Review</span>
            </div>
          </div>
        )}

        {/* Step 1: Contact Information */}
        {step === 1 && (
          <div className="sd-enquiry-body">
            <p className="sd-enquiry-step-desc">
              Please share your primary contact details. We will use this information exclusively to communicate regarding your architectural or interior engagement.
            </p>

            <div className="sd-form-group">
              <label className="sd-form-label">
                Full Name <span className="sd-required">*</span>
              </label>
              <input
                type="text"
                className={`sd-form-input ${errors.name ? 'has-error' : ''}`}
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {errors.name && <span className="sd-form-error">{errors.name}</span>}
            </div>

            <div className="sd-form-grid-2">
              <div className="sd-form-group">
                <label className="sd-form-label">
                  Email Address <span className="sd-required">*</span>
                </label>
                <input
                  type="email"
                  className={`sd-form-input ${errors.email ? 'has-error' : ''}`}
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <span className="sd-form-error">{errors.email}</span>}
              </div>

              <div className="sd-form-group">
                <label className="sd-form-label">
                  Phone Number <span className="sd-required">*</span>
                </label>
                <input
                  type="tel"
                  className={`sd-form-input ${errors.phone ? 'has-error' : ''}`}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <span className="sd-form-error">{errors.phone}</span>}
              </div>
            </div>

            <div className="sd-enquiry-footer">
              <div />
              <button
                type="button"
                className="sd-btn-editorial-primary"
                onClick={handleNextFrom1}
              >
                Continue to Project Brief &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Project Specifications */}
        {step === 2 && (
          <div className="sd-enquiry-body">
            <p className="sd-enquiry-step-desc">
              Describe the nature and scale of your space. All fields help us tailor our initial architectural review.
            </p>

            <div className="sd-form-group">
              <label className="sd-form-label">
                Project Typology <span className="sd-required">*</span>
              </label>
              <div className="sd-chip-selector">
                {(config?.project_types || [
                  'Residential Villa',
                  'Apartment',
                  'Office',
                  'Restaurant',
                  'Retail',
                  'Hospitality',
                  'Furniture / Product',
                  'Other',
                ]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`sd-chip-btn ${projectType === t ? 'active' : ''}`}
                    onClick={() => setProjectType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {errors.projectType && <span className="sd-form-error">{errors.projectType}</span>}
            </div>

            <div className="sd-form-grid-3">
              <div className="sd-form-group">
                <label className="sd-form-label">Location</label>
                <input
                  type="text"
                  className="sd-form-input"
                  placeholder="City or Area (e.g. Surat, Gujarat)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="sd-form-group">
                <label className="sd-form-label">Budget Guide</label>
                <select
                  className="sd-form-select"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="">Select range (optional)</option>
                  {(config?.budgets || [
                    'Under ₹15 Lakhs',
                    '₹15L – ₹30 Lakhs',
                    '₹30L – ₹60 Lakhs',
                    '₹60L – ₹1.2 Crore',
                    '₹1.2 Crore – ₹3 Crore',
                    '₹3 Crore +',
                    'Undisclosed',
                  ]).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sd-form-group">
                <label className="sd-form-label">Target Timeline</label>
                <select
                  className="sd-form-select"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                >
                  <option value="">Select timeline (optional)</option>
                  {(config?.timelines || [
                    'Immediate (Within 1 month)',
                    '1 – 3 Months',
                    '3 – 6 Months',
                    '6 – 12 Months',
                    'Concept Stage / Flexible',
                  ]).map((tl) => (
                    <option key={tl} value={tl}>
                      {tl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sd-form-group">
              <label className="sd-form-label">
                Project Brief & Spatial Vision <span className="sd-required">*</span>
              </label>
              <textarea
                className={`sd-form-textarea ${errors.message ? 'has-error' : ''}`}
                rows={5}
                placeholder="Share your spatial requirements, aesthetic preferences, layout notes, or anything that inspires your design..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              {errors.message && <span className="sd-form-error">{errors.message}</span>}
            </div>

            <div className="sd-enquiry-footer">
              <button
                type="button"
                className="sd-btn-editorial-secondary"
                onClick={() => setStep(1)}
              >
                &larr; Back
              </button>
              <button
                type="button"
                className="sd-btn-editorial-primary"
                onClick={handleNextFrom2}
              >
                Rough Design / Uploads &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Optional File Uploads / Rough Sketches */}
        {step === 3 && (
          <div className="sd-enquiry-body">
            <div className="sd-upload-callout">
              <span className="sd-upload-callout-tag">OPTIONAL STEP</span>
              <h3 className="sd-upload-callout-title">Share Sketches, Reference Drawings or Media</h3>
              <p className="sd-upload-callout-desc">
                If you have existing hand sketches, structural floor plans, moodboard PDFs, photographs, or walk-through clips, upload them below. You may also skip this step entirely and proceed to review.
              </p>
            </div>

            {/* Dropzone */}
            <div
              className="sd-upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.pdf,.dwg,.dxf,.svg,.mp4,.mov"
              />
              <div className="sd-upload-zone-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="sd-upload-zone-text">
                <strong>Click to browse files</strong> or drag and drop here
              </p>
              <span className="sd-upload-zone-hint">
                Supported: JPG, PNG, WEBP, PDF, DWG, DXF, SVG, MP4, MOV (Up to 50MB each)
              </span>
            </div>

            {fileError && <div className="sd-form-error mt-2">{fileError}</div>}

            {/* Uploaded files list */}
            {files.length > 0 && (
              <div className="sd-file-list">
                <div className="sd-file-list-header">
                  <span>Attached Material ({files.length})</span>
                </div>
                {files.map((file, idx) => (
                  <div key={idx} className="sd-file-item">
                    <div className="sd-file-info">
                      <span className="sd-file-name">{file.name}</span>
                      <span className="sd-file-meta">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="sd-file-remove-btn"
                      onClick={() => removeFile(idx)}
                      title="Remove file"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="sd-enquiry-footer">
              <button
                type="button"
                className="sd-btn-editorial-secondary"
                onClick={() => setStep(2)}
              >
                &larr; Back
              </button>
              <button
                type="button"
                className="sd-btn-editorial-primary"
                onClick={handleNextFrom3}
              >
                {files.length > 0 ? 'Review Submission &rarr;' : 'Skip & Review &rarr;'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Verification & Review Step */}
        {step === 4 && (
          <div className="sd-enquiry-body">
            <p className="sd-enquiry-step-desc">
              Please verify your information before formal submission to the Studio Desire team.
            </p>

            <div className="sd-review-sheet">
              <div className="sd-review-section">
                <span className="sd-review-label">CLIENT INFORMATION</span>
                <div className="sd-review-grid">
                  <div>
                    <span className="sd-review-sublabel">Name</span>
                    <span className="sd-review-val">{name}</span>
                  </div>
                  <div>
                    <span className="sd-review-sublabel">Email</span>
                    <span className="sd-review-val">{email}</span>
                  </div>
                  <div>
                    <span className="sd-review-sublabel">Phone</span>
                    <span className="sd-review-val">{phone}</span>
                  </div>
                </div>
              </div>

              <div className="sd-review-section">
                <span className="sd-review-label">PROJECT SPECIFICATION</span>
                <div className="sd-review-grid">
                  <div>
                    <span className="sd-review-sublabel">Typology</span>
                    <span className="sd-review-val">{projectType}</span>
                  </div>
                  <div>
                    <span className="sd-review-sublabel">Location</span>
                    <span className="sd-review-val">{location || '—'}</span>
                  </div>
                  <div>
                    <span className="sd-review-sublabel">Budget</span>
                    <span className="sd-review-val">{budget || '—'}</span>
                  </div>
                  <div>
                    <span className="sd-review-sublabel">Timeline</span>
                    <span className="sd-review-val">{timeline || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="sd-review-section">
                <span className="sd-review-label">PROJECT BRIEF</span>
                <p className="sd-review-message">{message}</p>
              </div>

              <div className="sd-review-section">
                <span className="sd-review-label">ATTACHED MATERIAL</span>
                {files.length === 0 ? (
                  <span className="sd-review-val text-muted">No files attached (text enquiry)</span>
                ) : (
                  <ul className="sd-review-files">
                    {files.map((f, i) => (
                      <li key={i}>
                        {f.name} <span className="sd-review-filesize">({formatFileSize(f.size)})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="sd-enquiry-submit-error">
                {errors.submit}
              </div>
            )}

            <div className="sd-enquiry-footer">
              <button
                type="button"
                className="sd-btn-editorial-secondary"
                onClick={() => setStep(3)}
                disabled={isSubmitting}
              >
                &larr; Make Changes
              </button>
              <button
                type="button"
                className="sd-btn-editorial-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting to Studio...' : 'SUBMIT PROJECT ENQUIRY'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success Screen */}
        {step === 5 && submitResult && (
          <div className="sd-enquiry-body sd-enquiry-success-view">
            <div className="sd-success-badge">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2.5 2.5L16 9" />
              </svg>
            </div>

            <span className="sd-success-eyebrow">SUBMISSION CONFIRMED</span>
            <h2 className="sd-success-title">PROJECT ENQUIRY RECEIVED</h2>

            <div className="sd-success-ref-box">
              <span className="sd-success-ref-label">YOUR ENQUIRY REFERENCE</span>
              <span className="sd-success-ref-code">{submitResult.reference_number}</span>
            </div>

            <p className="sd-success-statement">
              Thank you for sharing your project with Studio Desire.
            </p>

            <p className="sd-success-detail">
              Your project enquiry has been successfully received. We will review the information provided and contact you using the details submitted.
            </p>

            <div className="sd-success-actions">
              <button
                type="button"
                className="sd-btn-editorial-primary"
                onClick={resetAndClose}
              >
                RETURN TO STUDIO DESIRE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
