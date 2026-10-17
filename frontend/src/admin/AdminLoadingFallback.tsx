import React from "react";

interface AdminLoadingFallbackProps {
  message?: string;
}

export const AdminLoadingFallback: React.FC<AdminLoadingFallbackProps> = ({
  message = "Loading Studio Desire Management Console...",
}) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0d0e11",
        color: "#e2e8f0",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderTopColor: "#eab308",
          borderRadius: "50%",
          animation: "sd-spin 0.8s linear infinite",
          marginBottom: "1.5rem",
        }}
      />
      <p
        style={{
          fontSize: "0.85rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#94a3b8",
        }}
      >
        {message}
      </p>
      <style>{`
        @keyframes sd-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
