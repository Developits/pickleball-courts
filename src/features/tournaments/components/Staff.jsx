import { useState } from "react";
import { useTournamentResource, useTournamentCommand } from "../hooks/useTournament";
import { ResourceFeedback, CommandFeedback, Pagination } from "./Feedback";

export default function Staff({event,canAssign,onChanged,onReload}) {
  const [offset,setOffset]=useState(0),[target,setTarget]=useState(""),[roles,setRoles]=useState([]);
  const resource=useTournamentResource(`/api/tournaments/${event.id}/staff?offset=${offset}`);
  const command=useTournamentCommand();
  const submit=async submitEvent=>{
    submitEvent.preventDefault();
    const result=await command.run(`/api/tournaments/${event.id}/staff/${target}`,"PUT",{roles:[...roles].sort(),expected_revision:event.revision});
    if(result){setTarget("");setRoles([]);resource.reload();onChanged();}
  };
  return <section className="card">
    <h2 className="text-xl font-bold mb-3">Event staff</h2><ResourceFeedback resource={resource}/>
    <ul className="space-y-3">{resource.data?.staff.map(member=><li key={member.user_id} className="border rounded p-3">
      <p className="font-semibold">{member.name} · user #{member.user_id}</p><p>{member.roles.join(", ")}</p>
      {member.effective_roles.length!==member.roles.length&&<p className="text-amber-800 text-sm">Some assignments are inactive because the account or required capability is not eligible.</p>}
      {canAssign&&<button type="button" className="underline mt-2" onClick={()=>{setTarget(String(member.user_id));setRoles(member.roles);}}>Edit assignments for {member.name}</button>}
    </li>)}</ul>
    {resource.data?.staff.length===0&&<p>No staff assigned.</p>}
    <Pagination data={resource.data} offset={offset} onChange={setOffset}/>
    {canAssign&&<form onSubmit={submit} className="border rounded p-4 mt-4 space-y-3">
      <h3 className="font-bold">Assign / replace event roles</h3>
      <CommandFeedback command={command} onReload={onReload}/>
      <label className="block">Staff user ID<input type="number" min="1" step="1" required value={target} onChange={event=>setTarget(event.target.value)} className="block w-full border rounded p-2"/></label>
      {["organizer","supervisor"].map(role=><label key={role} className="flex gap-2 capitalize"><input type="checkbox" checked={roles.includes(role)} onChange={event=>setRoles(previous=>event.target.checked?[...previous,role]:previous.filter(item=>item!==role))}/>{role}</label>)}
      <p className="text-sm text-gray-600">Organizer needs an active capability; Supervisor needs the existing Supervisor/Admin role. Clearing both roles revokes this user's event assignments.</p>
      <button type="submit" disabled={command.busy} className="btn btn-primary">{command.busy?"Saving…":"Save assignments"}</button>
    </form>}
  </section>;
}
