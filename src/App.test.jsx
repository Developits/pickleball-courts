import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";

const state = vi.hoisted(() => ({ auth: {} }));
vi.mock("./hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("./contexts/AuthProvider", () => ({ default: ({ children }) => children }));
vi.mock("./components/NotificationBell", () => ({ default: () => null }));
vi.mock("./pages/Home", () => ({ default: () => <h1>Public landing page</h1> }));
vi.mock("./pages/MemberHome", () => ({ default: () => <h1>Member home page</h1> }));
vi.mock("./pages/PlayerDashboard", () => ({ default: () => <h1>Player dashboard</h1> }));
vi.mock("./pages/SupervisorDashboard", () => ({ default: () => null }));
vi.mock("./pages/AdminDashboard", () => ({ default: () => null }));
vi.mock("./pages/Profile", () => ({ default: () => null }));
vi.mock("./pages/GameHistory", () => ({ default: () => null }));
vi.mock("./pages/Register", () => ({ default: () => null }));
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  state.auth = { user: null, isAuthenticated: false, loading: false };
});
afterEach(cleanup);

it("keeps the public landing page for signed-out visitors", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Public landing page" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Member home page" })).toBeNull();
});

it("shows the member home at / for authenticated users", () => {
  state.auth = { user: { id: 1, name: "Alice", role: "player" }, isAuthenticated: true, loading: false };
  render(<App />);
  expect(screen.getByRole("heading", { name: "Member home page" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
});

it("redirects already signed-in users away from the login screen", async () => {
  state.auth = { user: { id: 1, name: "Alice", role: "admin" }, isAuthenticated: true, isAdmin: true, isSupervisor: true, loading: false };
  window.history.replaceState({}, "", "/login");
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Member home page" })).toBeTruthy();
  expect(window.location.pathname).toBe("/");
});
