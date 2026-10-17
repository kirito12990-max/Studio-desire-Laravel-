import React, { useEffect } from "react";
import { VisualizationService } from "../services/visualizationService";
import { StudioCloseButton } from "./StudioModal";

interface RenderQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  projectName: string;
  roomName: string;
  vrUrl: string;
}

export const RenderQrModal: React.FC<RenderQrModalProps> = ({
  isOpen,
  onClose,
  title,
  projectName,
  roomName,
  vrUrl
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !vrUrl) return null;

  const qrImageUrl = VisualizationService.getDynamicQrUrl(vrUrl);

  return (
    <div
      className="render-qr-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="render-qr-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="render-qr-modal-header">
          <div className="render-qr-modal-tags">
            <span className="qr-tag-project">{projectName}</span>
            <span className="qr-tag-sep">/</span>
            <span className="qr-tag-room">{roomName}</span>
          </div>
          <StudioCloseButton onClick={onClose} label="Close QR Modal" />
        </div>

        <div className="render-qr-modal-body">
          <div className="render-qr-modal-badge">
            <span className="qr-pulse-dot"></span>
            <span>PERSPECTIVE VR PORTAL</span>
          </div>

          <h3 id="qr-modal-title" className="render-qr-modal-title">
            {title || `${roomName} Interactive Perspective`}
          </h3>

          <div className="render-qr-code-frame">
            <img
              src={qrImageUrl}
              alt={`QR code to access VR experience for ${title}`}
              className="render-qr-image"
              loading="eager"
            />
          </div>

          <p className="render-qr-modal-note">
            Scan with your mobile camera to explore this high-resolution VR perspective in 360° immersion.
          </p>

          <a
            href={vrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="render-qr-modal-direct-btn"
          >
            <span>Open VR Experience ↗</span>
          </a>
        </div>
      </div>
    </div>
  );
};
