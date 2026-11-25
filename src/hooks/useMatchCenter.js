import { useCallback, useEffect, useRef } from "react";
import { useApiList } from "./useApiList";
import { useSSE } from "./useSSE";

export function useMatchCenter({ scope = "all", limit = 20 } = {}) {
  const live = useApiList("/api/game-history/live", "matches");
  const history = useApiList(`/api/game-history/history?scope=${scope}&limit=${limit}`, "matches");
  const leaderboard = useApiList("/api/game-history/leaderboard", "leaderboard");
  const { data: snapshot, connected } = useSSE("/api/events");
  const previousIds = useRef(null);
  const { refresh: refreshLive, replace: replaceLive } = live;
  const { refresh: refreshHistory } = history;
  const { refresh: refreshLeaderboard } = leaderboard;
  const refreshResults = useCallback(() =>
    Promise.all([refreshHistory(), refreshLeaderboard()]), [refreshHistory, refreshLeaderboard]);
  const refresh = useCallback(() =>
    Promise.all([refreshLive(), refreshResults()]), [refreshLive, refreshResults]);

  useEffect(() => {
    if (!Array.isArray(snapshot?.matches)) return;
    const ids = new Set(snapshot.matches.map(match => match.id));
    // Compare identities, not counts: a new game can start as another finishes.
    if (previousIds.current?.some(id => !ids.has(id))) refreshResults();
    previousIds.current = [...ids];
    replaceLive(snapshot.matches);
  }, [snapshot, replaceLive, refreshResults]);

  useEffect(() => {
    // Catch completions that happened during an SSE outage/reconnection.
    if (connected) refresh();
  }, [connected, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!connected) refreshLive();
      refreshResults();
    }, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [connected, refreshLive, refreshResults, refresh]);

  return { live, history, leaderboard, connected, snapshot, refresh };
}
