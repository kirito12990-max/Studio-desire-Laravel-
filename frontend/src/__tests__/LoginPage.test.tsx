import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginPage } from "../admin/LoginPage";
import { authService } from "../services/authService";

describe("LoginPage Component", () => {
  const mockOnLoginSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOnLoginSuccess.mockReset();
    mockOnCancel.mockReset();
  });

  it("renders username and password input fields and branding", () => {
    render(
      <LoginPage onLoginSuccess={mockOnLoginSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByText("STUDIO DESIRE")).toBeInTheDocument();
    expect(screen.getByText("OWNER ACCESS")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /SIGN IN/i })).toBeInTheDocument();
  });

  it("shows validation error message when submitting empty fields", async () => {
    render(
      <LoginPage onLoginSuccess={mockOnLoginSuccess} onCancel={mockOnCancel} />
    );

    const submitBtn = screen.getByRole("button", { name: /SIGN IN/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Please enter both username and password/i)
    ).toBeInTheDocument();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("handles successful login submission and invokes onLoginSuccess", async () => {
    const mockSession = {
      user_id: 1,
      username: "Studio Desier",
      role: "MASTER",
      must_change_password: false,
    };

    vi.spyOn(authService, "login").mockResolvedValue(mockSession as any);

    render(
      <LoginPage onLoginSuccess={mockOnLoginSuccess} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "studiodesire" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /SIGN IN/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith("studiodesire", "password123");
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockSession);
    });
  });

  it("displays error message on authentication failure", async () => {
    vi.spyOn(authService, "login").mockRejectedValue(
      new Error("Invalid owner credentials provided.")
    );

    render(
      <LoginPage onLoginSuccess={mockOnLoginSuccess} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "unknown" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button", { name: /SIGN IN/i }));

    expect(
      await screen.findByText(/Invalid owner credentials provided/i)
    ).toBeInTheDocument();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("invokes onCancel when Return to Studio Desire is clicked", () => {
    render(
      <LoginPage onLoginSuccess={mockOnLoginSuccess} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Return to Studio Desire/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
