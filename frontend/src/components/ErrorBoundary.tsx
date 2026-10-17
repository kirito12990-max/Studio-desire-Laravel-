import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Studio Desire ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.hash = "#projects";
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            color: "#f3f4f6",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              padding: "2.5rem",
              background: "rgba(18, 18, 18, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "#9ca3af",
                display: "block",
                marginBottom: "0.75rem",
              }}
            >
              System Notice
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Cinzel', serif)",
                fontSize: "1.5rem",
                fontWeight: 400,
                letterSpacing: "0.05em",
                marginBottom: "1rem",
                color: "#ffffff",
              }}
            >
              {this.props.fallbackTitle || "An unexpected error occurred"}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#9ca3af",
                lineHeight: 1.6,
                marginBottom: "1.75rem",
              }}
            >
              {this.state.error?.message ||
                "A component failed to load or render properly. You can try refreshing or return to the main archive."}
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: "0.625rem 1.5rem",
                  background: "#ffffff",
                  color: "#111111",
                  border: "none",
                  borderRadius: "2px",
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.2s ease",
                }}
              >
                Return to Portfolio
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: "0.625rem 1.5rem",
                  background: "transparent",
                  color: "#e5e7eb",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "2px",
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Reload Window
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
