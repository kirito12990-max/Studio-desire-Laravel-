import React, { useEffect } from "react";

// ============================================================================
// 1. STUDIO CLOSE BUTTON
// ============================================================================
interface StudioCloseButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  darkSurface?: boolean;
}

export const StudioCloseButton: React.FC<StudioCloseButtonProps> = ({
  onClick,
  label = "Close",
  className = "",
  style = {},
  darkSurface = false
}) => {
  return (
    <button
      type="button"
      className={`studio-close-btn ${darkSurface ? "dark-theme" : ""} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      style={style}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M13 1L1 13M1 1L13 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

// ============================================================================
// 2. STUDIO MODAL COMPONENT
// ============================================================================
export type StudioModalSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_MAP: Record<StudioModalSize, string> = {
  sm: "460px",
  md: "600px",
  lg: "780px",
  xl: "980px",
  full: "1180px"
};

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: StudioModalSize;
  maxWidth?: string;
  width?: string;
  closeOnBackdropClick?: boolean;
  darkSurface?: boolean;
  className?: string;
}

export const StudioModal: React.FC<StudioModalProps> = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  size,
  maxWidth,
  width,
  closeOnBackdropClick = true,
  darkSurface = false,
  className = ""
}) => {
  const finalMaxWidth = width || maxWidth || (size ? SIZE_MAP[size] : "640px");

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`studio-modal-backdrop ${darkSurface ? "dark-theme" : ""}`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`studio-modal-surface ${darkSurface ? "dark-theme" : ""} ${className}`}
        style={{ maxWidth: finalMaxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || eyebrow) && (
          <div className="studio-modal-header">
            <div>
              {eyebrow && <span className="studio-modal-eyebrow">{eyebrow}</span>}
              {title && <h3 className="studio-modal-title">{title}</h3>}
              {subtitle && <p className="studio-modal-subtitle">{subtitle}</p>}
            </div>
            <StudioCloseButton onClick={onClose} darkSurface={darkSurface} />
          </div>
        )}
        {!title && !subtitle && !eyebrow && (
          <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
            <StudioCloseButton onClick={onClose} darkSurface={darkSurface} />
          </div>
        )}
        <div className="studio-modal-body">{children}</div>
        {footer && <div className="studio-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ============================================================================
// 2b. STUDIO CONFIRM MODAL COMPONENT (Deliberate confirmation workflow)
// ============================================================================
interface StudioConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  eyebrow?: string;
}

export const StudioConfirmModal: React.FC<StudioConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
  eyebrow = "ACTION REQUIRED"
}) => {
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      size="sm"
      closeOnBackdropClick={!isLoading}
      eyebrow={eyebrow}
      title={title}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`admin-btn ${isDestructive ? "admin-btn-danger" : "admin-btn-primary"}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      }
    >
      <div style={{ fontSize: "0.85rem", color: "var(--admin-text-main)", lineHeight: 1.6 }}>
        {message}
      </div>
    </StudioModal>
  );
};

// ============================================================================
// 3. STUDIO SIDE DRAWER COMPONENT
// ============================================================================
interface StudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  category?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  darkSurface?: boolean;
}

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  onClose,
  title,
  category,
  subtitle,
  children,
  footer,
  width = "540px",
  darkSurface = false
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="studio-drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`studio-drawer-surface ${darkSurface ? "dark-theme" : ""}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-drawer-header">
          <div>
            {category && <span className="studio-drawer-category">{category}</span>}
            <h3 className="studio-drawer-title">{title}</h3>
            {subtitle && <p className="studio-drawer-subtitle">{subtitle}</p>}
          </div>
          <StudioCloseButton onClick={onClose} darkSurface={darkSurface} />
        </div>

        <div className="studio-drawer-body">{children}</div>

        {footer && <div className="studio-drawer-footer">{footer}</div>}
      </div>
    </div>
  );
};
