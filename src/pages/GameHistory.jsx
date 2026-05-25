import { useState, useEffect, useCallback } from "react";
import { useSSE } from "../hooks/useSSE";

export default function GameHistory() {
  const [activeTab, setActiveTab] = useState("live");
  const [liveMatches, setLiveMatches] = useState([]);
  const [historyMatches, setHistoryMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use SSE for real-time updates
  const { data: sseData } = useSSE("/api/events");

  const fetchLiveMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/game-history/live", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLiveMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Error fetching live matches:", err);
    }
  }, []);

  const fetchHistoryMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/game-history/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistoryMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Error fetching match history:", err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/game-history/leaderboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on component mount
    Promise.all([
      fetchLiveMatches(),
      fetchHistoryMatches(),
      fetchLeaderboard(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [fetchLiveMatches, fetchHistoryMatches, fetchLeaderboard]);

  // Refresh data when SSE events occur
  useEffect(() => {
    if (!sseData) return;

    // Refresh live matches if there's any update
    Promise.all([
      fetchLiveMatches(),
      fetchHistoryMatches(),
    ]);
  }, [sseData, fetchLiveMatches, fetchHistoryMatches]);

  const formatGameType = (type) => {
    const types = {
      mens_double: "Men's Double",
      womens_double: "Women's Double",
      mixed_double: "Mix Double",
    };
    return types[type] || type;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
        Game History
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === "live"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          Live Matches
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === "history"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          Match History
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === "leaderboard"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* Live Matches Tab */}
      {activeTab === "live" && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Ongoing Matches</h2>
          {liveMatches.length === 0 ? (
            <p className="text-gray-500">No ongoing matches at the moment.</p>
          ) : (
            <div className="space-y-4">
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold">{match.court_name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatGameType(match.game_type)}
                      </span>
                    </div>
                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-1">Team 1</p>
                      <p className="font-semibold">
                        {match.team1_player1_name} & {match.team1_player2_name}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-1">Team 2</p>
                      <p className="font-semibold">
                        {match.team2_player1_name} & {match.team2_player2_name}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Started: {formatDateTime(match.started_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match History Tab */}
      {activeTab === "history" && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Past Matches</h2>
          {historyMatches.length === 0 ? (
            <p className="text-gray-500">No match history yet.</p>
          ) : (
            <div className="space-y-4">
              {historyMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold">{match.court_name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatGameType(match.game_type)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {match.score || "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-1">Team 1</p>
                      <p
                        className={`font-semibold ${
                          match.winner_team === 1 ? "text-green-600" : ""
                        }`}
                      >
                        {match.team1_player1_name} & {match.team1_player2_name}
                        {match.winner_team === 1 && " ✓"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-1">Team 2</p>
                      <p
                        className={`font-semibold ${
                          match.winner_team === 2 ? "text-green-600" : ""
                        }`}
                      >
                        {match.team2_player1_name} & {match.team2_player2_name}
                        {match.winner_team === 2 && " ✓"}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Ended: {formatDateTime(match.ended_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-gray-500">No players on the leaderboard yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Rank</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Points</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Matches</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Wins</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => (
                    <tr key={player.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            player.rank === 1
                              ? "bg-yellow-500"
                              : player.rank === 2
                              ? "bg-gray-400"
                              : player.rank === 3
                              ? "bg-orange-600"
                              : "bg-blue-500"
                          }`}
                        >
                          {player.rank}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium">{player.name}</td>
                      <td className="py-3 px-3 font-semibold text-blue-600">{player.points}</td>
                      <td className="py-3 px-3">{player.total_matches}</td>
                      <td className="py-3 px-3 text-green-600">{player.wins}</td>
                      <td className="py-3 px-3 font-medium">{player.win_rate_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
