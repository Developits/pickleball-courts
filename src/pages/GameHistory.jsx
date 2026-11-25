import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useMatchCenter } from "../hooks/useMatchCenter";
import MatchCard from "../components/MatchCard";
import ResourceFeedback from "../components/ResourceFeedback";

const TABS = [
  { id: "live", label: "Live matches" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "history", label: "Match history" },
];

export default function GameHistory() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeTab = TABS.some(tab => tab.id === params.get("tab")) ? params.get("tab") : "live";
  const scope = params.get("scope") === "mine" ? "mine" : "all";
  const { live, history, leaderboard, connected, refresh } = useMatchCenter({ scope });
  const tabRefs = useRef({});
  const active = ({ live, history, leaderboard })[activeTab];
  const selectTab = (id) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("tab", id);
    return next;
  });
  const selectScope = (value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.set("scope", value);
    return next;
  });

  const handleTabKey = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Game history</h1>
          <p className="text-sm text-gray-500 mt-2">
            {connected ? "Live updates connected" : "Live updates reconnecting · automatic refresh every 30 seconds"}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={active.refreshing}>
          {active.refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div role="tablist" aria-label="Game history views" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab, index) => (
          <button
            type="button" key={tab.id} role="tab" id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            ref={element => { tabRefs.current[tab.id] = element; }}
            onKeyDown={event => handleTabKey(event, index)}
            onClick={() => selectTab(tab.id)}
            className={`whitespace-nowrap px-4 py-3 text-sm sm:text-base font-semibold border-b-2 transition-colors ${activeTab === tab.id ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0} className="card">
        {activeTab === "live" && (
          <>
            <h2 className="text-xl font-bold mb-4">On court now</h2>
            <ResourceFeedback resource={live} label="live matches" />
            {!live.loading && !live.error && !live.records.length && <p className="text-gray-500 py-6">No ongoing matches. Games appear here when a supervisor starts a match.</p>}
            <div className="space-y-4">{live.records.map(match => <MatchCard key={match.id} match={match} />)}</div>
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold">Completed matches</h2>
              <label className="text-sm text-gray-600">
                Show{" "}
                <select aria-label="History scope" value={scope} onChange={event => selectScope(event.target.value)} className="border border-gray-300 rounded-lg p-2">
                  <option value="all">All matches</option>
                  <option value="mine">My matches</option>
                </select>
              </label>
            </div>
            <ResourceFeedback resource={history} label="match history" />
            {!history.loading && !history.error && !history.records.length && <p className="text-gray-500 py-6">{scope === "mine" ? "You have no completed matches yet." : "No completed matches yet."} Results appear after a supervisor records the score.</p>}
            <div className="space-y-4">{history.records.map(match => <MatchCard key={match.id} match={match} />)}</div>
            {history.hasMore && (
              <button type="button" className="btn btn-secondary mt-5 w-full" disabled={history.loadingMore || history.refreshing} onClick={history.loadMore}>
                {history.loadingMore ? "Loading more…" : "Load more matches"}
              </button>
            )}
          </>
        )}

        {activeTab === "leaderboard" && (
          <>
            <h2 className="text-xl font-bold">Club leaderboard</h2>
            <p className="text-sm text-gray-500 mt-2 mb-4">Ranked by win rate, then wins. Each win earns 2 points. Only completed, non-deleted matches count; draws count as a match but not a win or loss.</p>
            <ResourceFeedback resource={leaderboard} label="leaderboard" />
            {!leaderboard.loading && !leaderboard.error && !leaderboard.records.length && <p className="text-gray-500 py-6">No completed matches yet. Finish a scored match to join the leaderboard.</p>}
            {leaderboard.records.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Player rankings from completed matches</caption>
                  <thead className="border-b text-gray-500">
                    <tr>{["Rank", "Player", "Points", "Matches", "Wins", "Losses", "Win rate"].map(label => <th key={label} scope="col" className="p-3 whitespace-nowrap">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {leaderboard.records.map(player => (
                      <tr key={player.id} className={`border-b ${Number(player.id) === Number(user?.id) ? "bg-green-50" : "hover:bg-gray-50"}`}>
                        <td className="p-3 font-bold">#{player.rank}</td>
                        <th scope="row" className="p-3 font-semibold">{player.name}{Number(player.id) === Number(user?.id) && <span className="ml-2 text-xs text-green-700">(you)</span>}</th>
                        <td className="p-3 font-semibold text-blue-700">{player.points}</td>
                        <td className="p-3">{player.total_matches}</td>
                        <td className="p-3 text-green-700">{player.wins}</td>
                        <td className="p-3">{player.losses}</td>
                        <td className="p-3 font-semibold">{player.win_rate_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
