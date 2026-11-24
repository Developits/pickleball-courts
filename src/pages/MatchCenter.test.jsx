import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import GameHistory from "./GameHistory";
import MemberHome from "./MemberHome";
import { parseMatchDate } from "../utils/matches";

const state = vi.hoisted(() => ({
  feed: { data: null, connected: false },
  auth: { user: { id: 1, name: "Alice", role: "player" }, isAdmin: false, isSupervisor: false },
}));
vi.mock("../hooks/useSSE", () => ({ useSSE: () => state.feed }));
vi.mock("../hooks/useAuth", () => ({ useAuth: () => state.auth }));

function match(id, ended = false) {
  return {
    id, court_name: `Court ${id}`, game_type: "mixed_double",
    team1_player1_name: `Player ${id}A`, team1_player2_name: `Player ${id}B`,
    team2_player1_name: `Player ${id}C`, team2_player2_name: `Player ${id}D`,
    started_at: "2026-06-19 04:00:00", ended_at: ended ? "2026-06-19 05:00:00" : null,
    score: ended ? "11-4" : null, winner_team: ended ? 1 : null,
  };
}
let fetchMock;
let responses;
beforeEach(() => {
  state.feed = { data: null, connected: false };
  state.auth = { user: { id: 1, name: "Alice", role: "player" }, isAdmin: false, isSupervisor: false };
  localStorage.setItem("auth_token", "test-token-not-for-production");
  responses = {
    live: { matches: [match(1)] },
    history: { matches: [match(2, true)], has_more: false, next_offset: null },
    leaderboard: { leaderboard: [{ id: 1, name: "Alice", rank: 1, points: 2, wins: 1, losses: 0, total_matches: 1, win_rate_percent: 100 }] },
  };
  fetchMock = vi.fn(async (url) => {
    if (url.includes("/api/court/status")) return Response.json({ is_open: true, date: "2026-06-19" });
    if (url.includes("/api/court/list")) return Response.json({ courts: [{ id: 1, name: "Court 1", status: "available" }] });
    const key = url.includes("/leaderboard") ? "leaderboard" : url.includes("/history") ? "history" : "live";
    const response = responses[key];
    return typeof response === "function" ? response(url) : Response.json(response);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

function showHistory(path = "/game-history") {
  return render(<MemoryRouter initialEntries={[path]}><GameHistory /></MemoryRouter>);
}

describe("functional game-history tabs", () => {
  it("polls all resources when SSE is unavailable and removes the timer on unmount", async () => {
    vi.useFakeTimers();
    const view = showHistory();
    await act(async () => { await Promise.resolve(); });
    fetchMock.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/live"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/history"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/leaderboard"))).toBe(true);
    view.unmount();
    fetchMock.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("loads live matches over REST even with no SSE connection, and opens other tabs", async () => {
    const user = userEvent.setup();
    showHistory();
    expect(await screen.findByText("Player 1A & Player 1B")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/game-history/live")).toBe(true);
    await user.click(screen.getByRole("tab", { name: "Match history" }));
    expect(await screen.findByText("11-4")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Leaderboard" }));
    expect(await screen.findByText("Alice")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("(you)")).toBeTruthy();
  });

  it("shows request failures rather than fake empty lists, and supports retry", async () => {
    responses.live = () => Response.json({ error: "Temporarily unavailable" }, { status: 500 });
    showHistory();
    expect((await screen.findByRole("alert")).textContent).toContain("Temporarily unavailable");
    expect(screen.queryByText(/No ongoing matches/)).toBeNull();
    responses.live = { matches: [match(3)] };
    await userEvent.click(screen.getByRole("button", { name: "Retry live matches" }));
    expect(await screen.findByText("Player 3A & Player 3B")).toBeTruthy();
  });

  it("refreshes history and leaderboard when a match ID disappears even if the live count stays the same", async () => {
    state.feed = { data: { matches: [match(1)] }, connected: true };
    const view = showHistory();
    await screen.findByText("Player 1A & Player 1B");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("/history"))).toBe(true));
    fetchMock.mockClear();
    state.feed.data = { matches: [match(3)] };
    view.rerender(<MemoryRouter><GameHistory /></MemoryRouter>);
    await screen.findByText("Player 3A & Player 3B");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url.includes("/history"))).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => url.includes("/leaderboard"))).toBe(true);
    });
  });

  it("supports a deep-linked history tab, pagination, and authenticated 'my matches' filtering", async () => {
    responses.history = (url) => Response.json(url.includes("offset=20")
      ? { matches: [match(4, true)], has_more: false, next_offset: null }
      : { matches: [match(2, true)], has_more: true, next_offset: 20 });
    showHistory("/game-history?tab=history");
    await screen.findByText("Player 2A & Player 2B");
    await userEvent.click(screen.getByRole("button", { name: "Load more matches" }));
    expect(await screen.findByText("Player 4A & Player 4B")).toBeTruthy();
    expect(screen.getByText("Player 2A & Player 2B")).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "History scope" }), "mine");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("scope=mine"))).toBe(true));
  });

  it("renders genuine empty states independently and supports keyboard tab navigation", async () => {
    responses.live = { matches: [] };
    responses.leaderboard = { leaderboard: [] };
    showHistory();
    expect(await screen.findByText(/No ongoing matches/)).toBeTruthy();
    screen.getByRole("tab", { name: "Live matches" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(await screen.findByText(/Finish a scored match/)).toBeTruthy();
    expect(document.activeElement.textContent).toBe("Leaderboard");
  });
});

describe("member home", () => {
  it.each([
    ["player", false, false, "Check in & join queue", "/dashboard"],
    ["supervisor", false, true, "Manage courts", "/supervisor"],
    ["admin", true, true, "Manage members", "/admin"],
  ])("gives %s users a personalized home and the correct primary action", async (role, isAdmin, isSupervisor, label, path) => {
    state.auth = { user: { id: 1, name: "Alice", role }, isAdmin, isSupervisor };
    render(<MemoryRouter><MemberHome /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Welcome back, Alice." })).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(label) }).getAttribute("href")).toBe(path);
    expect(await screen.findByText("Courts are open")).toBeTruthy();
    expect(screen.getByRole("link", { name: /My match history/ }).getAttribute("href")).toContain("scope=mine");
    expect(screen.queryByText("Login Now")).toBeNull();
    expect(await screen.findByText("100%")).toBeTruthy();
  });
});

it("treats SQLite timestamps as UTC rather than browser-local time", () => {
  expect(parseMatchDate("2026-06-19 04:00:00").toISOString()).toBe("2026-06-19T04:00:00.000Z");
  expect(parseMatchDate("not-a-date")).toBeNull();
});
