import React, { useState } from "react";
import { VisualizationService } from "../services/visualizationService";

interface ProjectCentralVrPortalProps {
  projectName: string;
  roomName?: string;
  vrUrl: string;
  subtitle?: string;
  showQr?: boolean;
  portalType?: "room" | "project";
}

export const ProjectCentralVrPortal: React.FC<ProjectCentralVrPortalProps> = ({
  projectName,
  roomName,
  vrUrl,
  subtitle,
  showQr = true,
  portalType = "room"
}) => {
  const [qrError, setQrError] = useState(false);

  if (!vrUrl || !vrUrl.trim()) return null;

  const qrImageUrl = VisualizationService.getDynamicQrUrl(vrUrl);
  const isRoomPortal = portalType === "room";
  const displayTitle = roomName || projectName;

  return (
    <div className="central-vr-portal-container">
      <div className="central-vr-portal-card">
        {/* Left Side: Refined Editorial Typography & Instructions */}
        <div className="central-vr-info-col">
          <div className="central-vr-badge">
            <span className="central-vr-pulse-dot"></span>
            <span className="central-vr-badge-text">
              {isRoomPortal ? "ROOM VR PORTAL" : "PROJECT CENTRAL VR PORTAL"}
            </span>
          </div>

          <h3 className="central-vr-headline">
            {isRoomPortal ? "EXPLORE THIS ROOM IN VR" : "EXPLORE THE FULL SPACE IN VR"}
          </h3>

          <p className="central-vr-statement">
            {isRoomPortal
              ? `Scan with your phone camera to launch the interactive room experience for ${displayTitle}. Walk through volumetric daylighting, material junctions, and spatial transitions at 1:1 scale.`
              : `Experience the complete architectural property of ${projectName} in interactive 360° virtual reality.`}
          </p>

          {subtitle && (
            <div className="central-vr-subcontext">
              <span className="central-vr-sublabel">SPATIAL CONTEXT</span>
              <p className="central-vr-subtext">{subtitle}</p>
            </div>
          )}

          <div className="central-vr-action-row">
            <a
              href={vrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="central-vr-launch-btn"
              title={`Launch interactive VR experience for ${displayTitle}`}
            >
              <span>{isRoomPortal ? "OPEN ROOM VR ↗" : "OPEN FULL VR EXPERIENCE ↗"}</span>
            </a>
          </div>
        </div>

        {/* Right Side: Architectural Scannable QR Frame */}
        {showQr && (
          <div className="central-vr-qr-col">
            <div className="central-vr-qr-wrapper">
              <div className="central-vr-qr-corner top-left"></div>
              <div className="central-vr-qr-corner top-right"></div>
              <div className="central-vr-qr-corner bottom-left"></div>
              <div className="central-vr-qr-corner bottom-right"></div>

              <div className="central-vr-qr-box">
                {!qrError ? (
                  <img
                    src={qrImageUrl}
                    alt={`Central QR Code for ${projectName} Full-Property VR`}
                    className="central-vr-qr-svg"
                    onError={() => setQrError(true)}
                    loading="eager"
                  />
                ) : (
                  <div className="central-vr-qr-fallback">
                    <span>CENTRAL VR CONFIGURED</span>
                  </div>
                )}
              </div>

              <span className="central-vr-qr-caption">
                Scan with your phone camera to launch
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
