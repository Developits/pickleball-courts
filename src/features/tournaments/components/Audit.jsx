import { useState } from "react";
import { useTournamentResource } from "../hooks/useTournament";
import { ResourceFeedback, Pagination } from "./Feedback";

export default function Audit({eventId,revision}) {
  const [offset,setOffset]=useState(0);
  // A revision change remounts this view in the parent after a successful write.
  const resource=useTournamentResource(`/api/tournaments/${eventId}/audit?offset=${offset}`);
  return <section className="card" aria-label={`Audit through revision ${revision}`}>
    <h2 className="text-xl font-bold mb-3">Change history (read-only)</h2>
    <ResourceFeedback resource={resource}/>
    {resource.data?.audit.length===0&&<p>No changes recorded.</p>}
    <ul className="space-y-3">{resource.data?.audit.map(row=><li key={row.id} className="border rounded p-3">
      <p className="font-semibold">{row.action} · revision {row.resource_revision}</p>
      <p className="text-sm text-gray-600">User #{row.actor_user_id} · {new Date(row.created_at*1000).toISOString()}</p>
      <details className="mt-2"><summary>Change details</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify({before:row.before,after:row.after},null,2)}</pre></details>
    </li>)}</ul><Pagination data={resource.data} offset={offset} onChange={setOffset}/>
  </section>;
}
