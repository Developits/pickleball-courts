import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useMatchCenter } from "../hooks/useMatchCenter";
import { useApiList } from "../hooks/useApiList";
import { apiJson } from "../api/client";
import { dashboardForRole } from "../utils/matches";
import MatchCard from "../components/MatchCard";
import ResourceFeedback from "../components/ResourceFeedback";

export default function MemberHome() {
  const { user, isAdmin, isSupervisor } = useAuth();
  const { live, history, leaderboard, connected, snapshot, refresh } = useMatchCenter({ scope: "mine", limit: 3 });
  const courts = useApiList("/api/court/list", "courts");
  const { refresh: refreshCourts, replace: replaceCourts } = courts;
  const [session, setSession] = useState({ loading: true, data: null, error: "" });
  const sessionRequest = useRef(null);
  const loadSession = useCallback(async () => {
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    try {
      const data = await apiJson("/api/court/status", { signal: controller.signal });
      if (!controller.signal.aborted) setSession({ loading: false, data, error: "" });
    } catch (error) {
      if (!controller.signal.aborted) setSession(previous => ({ ...previous, loading: false, error: error.message }));
    }
  }, []);

  useEffect(() => {
    loadSession();
    const timer = window.setInterval(() => {
      loadSession();
      refreshCourts();
    }, 30000);
    return () => {
      sessionRequest.current?.abort();
      window.clearInterval(timer);
    };
  }, [loadSession, refreshCourts]);

  useEffect(() => {
    if (Array.isArray(snapshot?.courts)) replaceCourts(snapshot.courts);
  }, [snapshot, replaceCourts]);

  const dashboard = dashboardForRole(user?.role);
  const ownRanking = leaderboard.records.find(player => Number(player.id) === Number(user?.id));
  const statsReady = !leaderboard.loading && !leaderboard.error;
  const sessionLabel = session.error ? "Court status unavailable" : session.loading ? "Checking court session…" : session.data?.is_open ? "Courts are open" : "Courts are closed";
  const refreshHome = () => { refresh(); loadSession(); refreshCourts(); };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl bg-green-950 text-white p-6 sm:p-9">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="text-green-200 text-sm font-semibold uppercase tracking-wider">Your club, at a glance</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-3">Welcome back, {user?.name || "player"}.</h1>
            <p className="text-green-100 mt-3 max-w-xl">See what is happening on court, follow the results, and get ready for your next game.</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm capitalize">{user?.role || "player"}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link to={dashboard.path} className="rounded-lg bg-green-400 text-green-950 px-5 py-3 font-bold hover:bg-green-300">{dashboard.label} →</Link>
          {isAdmin && <Link to="/supervisor" className="rounded-lg border border-green-700 px-5 py-3 font-semibold hover:bg-green-900">Manage courts</Link>}
          <Link to="/profile" className="rounded-lg border border-green-700 px-5 py-3 font-semibold hover:bg-green-900">My profile</Link>
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div>
          <h2 className="text-xl font-bold">{sessionLabel}</h2>
          {session.error ? <p role="alert" className="text-sm text-red-700">{session.error}</p> : <p className="text-sm text-gray-500 mt-1">{session.data?.date || "Today"} · {connected ? "Live updates connected" : "Automatic refresh enabled"}</p>}
          {session.data?.is_queue_locked && <p className="text-sm text-amber-700 mt-1">Queue entry is locked for this session.</p>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={refreshHome}>Refresh overview</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Completed matches", statsReady ? ownRanking?.total_matches || 0 : "—"],
          ["Wins", statsReady ? ownRanking?.wins || 0 : "—"],
          ["Win rate", statsReady ? `${ownRanking?.win_rate_percent || 0}%` : "—"],
          ["Club rank", statsReady ? ownRanking ? `#${ownRanking.rank}` : "Unranked" : "—"],
        ].map(([label, value]) => <div key={label} className="card"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl sm:text-3xl font-bold mt-2">{value}</p></div>)}
      </div>
      <ResourceFeedback resource={leaderboard} label="player statistics" />

      <section>
        <h2 className="text-xl font-bold mb-4">Court overview</h2>
        <ResourceFeedback resource={courts} label="courts" />
        {!courts.loading && !courts.error && courts.records.length === 0 && <p className="text-gray-500">No courts have been configured yet.</p>}
        <div className="grid sm:grid-cols-3 gap-4">
          {courts.records.map(court => (
            <div key={court.id} className="card">
              <h3 className="font-bold">{court.name}</h3>
              <p className="mt-2 text-sm capitalize">{court.status === "available" ? "Available" : court.status === "occupied" ? "Match in progress" : court.status || "Status unknown"}</p>
              {court.reserved_for && <p className="text-xs text-gray-500 mt-1">Reserved for {court.reserved_for}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ["live", "Live matches", "Follow the action on every court."],
          ["leaderboard", "Leaderboard", "See club rankings and your progress."],
          ["history", "My match history", "Review your scores and recent results."],
        ].map(([tab, title, description]) => (
          <Link key={tab} to={`/game-history?tab=${tab}${tab === "history" ? "&scope=mine" : ""}`} className="card block border border-gray-100 hover:border-green-500 transition-colors">
            <h2 className="font-bold text-green-800">{title} →</h2><p className="text-sm text-gray-500 mt-2">{description}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="flex justify-between items-center gap-3 mb-4"><h2 className="text-xl font-bold">On court now</h2><Link className="text-sm font-semibold text-green-700" to="/game-history?tab=live">View all →</Link></div>
        <ResourceFeedback resource={live} label="live matches" />
        {!live.loading && !live.error && !live.records.length && <div className="card text-gray-500">No matches in progress. {isSupervisor ? "Start a match from court management when the session is open." : "Check in with the supervisor to get ready for your next match."}</div>}
        <div className="grid lg:grid-cols-2 gap-4">{live.records.map(match => <MatchCard key={match.id} match={match} />)}</div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Your recent results</h2>
        <ResourceFeedback resource={history} label="recent results" />
        {!history.loading && !history.error && !history.records.length && <div className="card text-gray-500">Your completed matches will appear here after the score is recorded.</div>}
        <div className="space-y-4">{history.records.map(match => <MatchCard key={match.id} match={match} />)}</div>
      </section>
    </div>
  );
}
