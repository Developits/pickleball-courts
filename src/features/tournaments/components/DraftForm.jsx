import { useState } from "react";
import { useTournamentCommand } from "../hooks/useTournament";
import { CommandFeedback } from "./Feedback";

const empty={title:"",description:"",venue_name:"",venue_address:"",timezone:"UTC",starts_at:null,ends_at:null,registration_deadline_at:null,rules_text:""};
function utcInput(value){return value===null||value===undefined?"":new Date(value*1000).toISOString().slice(0,19);}
export default function DraftForm({initial=null,readOnly=false,onSaved,onReload}) {
  const [form,setForm]=useState(()=>{
    const data={...empty,...initial};
    for(const field of ["starts_at","ends_at","registration_deadline_at"])data[field]=utcInput(data[field]);
    return data;
  });
  const [saved,setSaved]=useState(false);
  const command=useTournamentCommand();
  const change=(key,value)=>{setSaved(false);setForm(previous=>({...previous,[key]:value}));};
  const submit=async event=>{
    event.preventDefault();
    const payload=Object.fromEntries(Object.keys(empty).map(key=>[key,form[key]]));
    for(const key of ["starts_at","ends_at","registration_deadline_at"])payload[key]=form[key]?Date.parse(`${form[key]}Z`)/1000:null;
    for(const key of ["venue_name","venue_address"])payload[key]=form[key]||null;
    if(initial)payload.expected_revision=initial.revision;
    const result=await command.run(initial?`/api/tournaments/${initial.id}`:"/api/tournaments",initial?"PATCH":"POST",payload);
    if(result){setSaved(true);onSaved(result);}
  };
  return <form onSubmit={submit} className="card space-y-4">
    <h2 className="text-xl font-bold">{initial?"Draft information":"Create tournament draft"}</h2>
    <p className="text-sm text-gray-600">Private draft only. This does not open registration or reserve courts.</p>
    <CommandFeedback command={command} onReload={onReload}/>
    {saved&&<p role="status" className="text-green-700">Draft saved.</p>}
    <fieldset disabled={readOnly||command.busy} className="space-y-4">
      {[
        ["title","Title","text",true,160],["venue_name","Venue name","text",false,1000],
        ["venue_address","Venue address","text",false,1000],["timezone","Event timezone (IANA, e.g. Asia/Shanghai)","text",true,100],
        ["starts_at","Event start (UTC)","datetime-local",false],["ends_at","Event end (UTC)","datetime-local",false],
        ["registration_deadline_at","Registration deadline (UTC)","datetime-local",false],
      ].map(([key,label,type,required,maxLength])=><label key={key} className="block font-medium">
        {label}<input className="block w-full border rounded p-2 mt-1" type={type} step={type==="datetime-local"?1:undefined} required={required} maxLength={maxLength} value={form[key]??""} onChange={event=>change(key,event.target.value)}/>
      </label>)}
      <p className="text-sm text-gray-500">Enter dates in UTC, with both start and end or neither. The event timezone is stored separately; casual court time rules are unchanged.</p>
      {[["description","Description"],["rules_text","Event rules"]].map(([key,label])=><label key={key} className="block font-medium">{label}<textarea className="block w-full border rounded p-2 mt-1" rows={4} maxLength={20000} value={form[key]} onChange={event=>change(key,event.target.value)}/></label>)}
      {!readOnly&&<button className="btn btn-primary" type="submit">{command.busy?"Saving…":initial?"Save draft":"Create draft"}</button>}
    </fieldset>
    {readOnly&&<p className="text-sm text-gray-600">Read-only assignment. Only Admins and assigned Organizers can edit this draft.</p>}
  </form>;
}
