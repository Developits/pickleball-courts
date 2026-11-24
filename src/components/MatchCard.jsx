import { formatGameType, formatMatchDate } from "../utils/matches";

export default function MatchCard({ match }) {
  const live = !match.ended_at;
  const winner = Number(match.winner_team);
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{match.court_name || "Court"}</h3>
          <p className="text-sm text-gray-500">{formatGameType(match.game_type)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold self-start ${live ? "bg-green-100 text-green-800" : "bg-blue-50 text-blue-800"}`}>
          {live ? "Live" : match.score || "Score not recorded"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(team => (
          <div key={team} className={`rounded-lg p-3 ${!live && winner === team ? "bg-green-50" : "bg-gray-50"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Team {team}{!live && winner === team ? " · Winner" : ""}
            </p>
            <p className="font-medium break-words">
              {match[`team${team}_player1_name`] || "Former player"} &amp; {match[`team${team}_player2_name`] || "Former player"}
            </p>
          </div>
        ))}
      </div>
      {!live && !winner && <p className="text-sm text-gray-600 mt-3">Draw / no winner recorded</p>}
      <p className="text-xs text-gray-500 mt-3">
        {live ? "Started" : "Ended"}: {formatMatchDate(live ? match.started_at : match.ended_at)}
      </p>
    </article>
  );
}
