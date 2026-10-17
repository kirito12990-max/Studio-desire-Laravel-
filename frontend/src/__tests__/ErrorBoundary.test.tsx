import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "../components/ErrorBoundary";

const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Simulated component crash");
  }
  return <div>Component rendered safely</div>;
};

describe("ErrorBoundary Component", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Component rendered safely")).toBeInTheDocument();
  });

  it("catches errors and renders fallback UI with retry button", () => {
    // Suppress console.error in test output for expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Custom System Alert">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom System Alert")).toBeInTheDocument();
    expect(screen.getByText("Simulated component crash")).toBeInTheDocument();
    expect(screen.getByText("Return to Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Reload Window")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("triggers custom onReset callback when Return button is clicked", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockReset = vi.fn();

    render(
      <ErrorBoundary onReset={mockReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Return to Portfolio"));
    expect(mockReset).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
