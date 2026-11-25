import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTournamentResource, useTournamentCommand } from "../hooks/useTournament";
import { ResourceFeedback, CommandFeedback, Pagination } from "../components/Feedback";
import DraftForm from "../components/DraftForm";
import Categories from "../components/Categories";
import Staff from "../components/Staff";
import Audit from "../components/Audit";

export function TournamentList() {
  const [offset,setOffset]=useState(0),[creating,setCreating]=useState(false);
  const resource=useTournamentResource(`/api/tournaments?offset=${offset}`),navigate=useNavigate();
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-bold">Tournament drafts</h1><p className="text-gray-600 mt-2">Phase 1 staff workspace. Registration, draws, scheduling and scores are not available yet.</p></header>
    <ResourceFeedback resource={resource}/>
    {resource.data?.can_create&&<><div className="flex flex-wrap gap-3"><button type="button" className="btn btn-primary" onClick={()=>setCreating(value=>!value)}>New tournament draft</button><Link className="btn btn-secondary" to="/admin/tournament-organizers">Manage Organizer access</Link></div>
      {creating&&<DraftForm onSaved={result=>navigate(`/tournaments/${result.id}`)}/>}</>}
    {resource.data?.tournaments.length===0&&<p className="card">No draft tournaments are assigned to you.</p>}
    <div className="grid sm:grid-cols-2 gap-4">{resource.data?.tournaments.map(event=><Link key={event.id} className="card block border hover:border-green-600" to={`/tournaments/${event.id}`}><h2 className="font-bold text-xl">{event.title}</h2><p className="text-sm text-gray-500 mt-2">Private draft · revision {event.revision} · {event.timezone}</p><p className="mt-2">{event.venue_name||"Venue not set"}</p></Link>)}</div>
    <Pagination data={resource.data} offset={offset} onChange={setOffset}/>
  </div>;
}
export function TournamentEditor() {
  const {tournamentId}=useParams();
  const resource=useTournamentResource(`/api/tournaments/${tournamentId}`);
  const [saved,setSaved]=useState(false),[epoch,setEpoch]=useState(0);
  const changed=()=>{setSaved(true);resource.reload();};
  const reload=()=>{setSaved(false);setEpoch(value=>value+1);resource.reload();};
  const event=resource.data?.tournament,permissions=resource.data?.permissions;
  return <div className="space-y-6">
    <Link className="text-green-700 underline" to="/tournaments">← Tournament drafts</Link>
    <ResourceFeedback resource={resource}/>
    {saved&&<p role="status" className="rounded bg-green-50 p-3 text-green-800">Changes saved to the private draft.</p>}
    {event&&<>
      <header><h1 className="text-3xl font-bold">{event.title}</h1><p className="text-sm text-gray-600 mt-2">Private draft · revision {event.revision}. Save one section at a time; reloading refreshes all editors.</p></header>
      <DraftForm key={`draft:${event.revision}:${epoch}`} initial={event} readOnly={!permissions.can_edit||resource.loading} onSaved={changed} onReload={reload}/>
      <Categories key={`categories:${event.revision}:${epoch}`} event={event} canEdit={permissions.can_edit&&!resource.loading} onChanged={changed} onReload={reload}/>
      <Staff key={`staff:${event.revision}:${epoch}`} event={event} canAssign={permissions.can_assign_staff&&!resource.loading} onChanged={changed} onReload={reload}/>
      {permissions.can_audit&&<Audit key={event.revision} eventId={event.id} revision={event.revision}/>}
    </>}
  </div>;
}
export function OrganizerAdmin() {
  const [query,setQuery]=useState(""),[search,setSearch]=useState(""),[offset,setOffset]=useState(0);
  const resource=useTournamentResource(`/api/admin/tournament-organizers?q=${encodeURIComponent(query)}&offset=${offset}`);
  const command=useTournamentCommand();
  const update=async user=>{
    const result=await command.run(`/api/admin/tournament-organizers/${user.id}`,user.organizer_active?"DELETE":"PUT",{expected_revision:user.revision});
    if(result)resource.reload();
  };
  return <div className="space-y-5">
    <Link to="/tournaments" className="text-green-700 underline">← Tournament drafts</Link>
    <h1 className="text-3xl font-bold">Organizer access</h1>
    <p>Grant an additional capability without replacing a user's Player, Supervisor or Admin role. Event assignments are still required.</p>
    <p className="text-sm text-amber-800">Restoring capability also restores any existing, non-revoked Organizer assignments. Review event staff before reinstating access.</p>
    <form className="flex flex-wrap gap-3" onSubmit={event=>{event.preventDefault();setQuery(search);setOffset(0);}}><label>Find account<input className="block border rounded p-2" maxLength={120} value={search} onChange={event=>setSearch(event.target.value)}/></label><button className="btn btn-secondary self-end" type="submit">Search accounts</button></form>
    <ResourceFeedback resource={resource}/><CommandFeedback command={command} onReload={resource.reload}/>
    <div className="space-y-3">{resource.data?.users.map(user=><div key={user.id} className="card flex flex-wrap justify-between items-center gap-3">
      <div><p className="font-bold">{user.name} · user #{user.id}</p><p className="text-sm text-gray-600">{user.student_id} · {user.role} · {user.organizer_active?"Organizer enabled":"Organizer disabled"}</p>{!user.eligible&&<p className="text-sm text-amber-800">Account is not currently eligible.</p>}</div>
      <button type="button" disabled={command.busy||(!user.eligible&&!user.organizer_active)} onClick={()=>update(user)} className="btn btn-secondary">{user.organizer_active?"Revoke":"Grant"} Organizer access for {user.name}</button>
    </div>)}</div>
    {resource.data?.users.length===0&&<p>No matching accounts.</p>}
    <Pagination data={resource.data} offset={offset} onChange={setOffset}/>
  </div>;
}
