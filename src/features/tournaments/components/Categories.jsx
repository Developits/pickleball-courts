import { useState } from "react";
import { useTournamentResource, useTournamentCommand } from "../hooks/useTournament";
import { ResourceFeedback, CommandFeedback, Pagination } from "./Feedback";

const blank={code:"",name:"",team_size:2,rules_text:"",sort_order:0,is_active:1};
function CategoryForm({event,initial,onSaved,onReload}) {
  const [form,setForm]=useState(initial||blank),command=useTournamentCommand();
  const change=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  const submit=async submitEvent=>{
    submitEvent.preventDefault();
    const payload={...Object.fromEntries(Object.keys(blank).map(key=>[key,form[key]])),expected_revision:event.revision};
    const result=await command.run(`/api/tournaments/${event.id}/categories${initial?`/${initial.id}`:""}`,initial?"PATCH":"POST",payload);
    if(result)onSaved();
  };
  return <form onSubmit={submit} className="border rounded-lg p-4 space-y-3 mt-4">
    <h3 className="font-bold">{initial?"Edit category":"Add category metadata"}</h3>
    <CommandFeedback command={command} onReload={onReload}/>
    <fieldset disabled={command.busy} className="space-y-3">
      {!initial&&<label className="block">Optional template<select className="block w-full border rounded p-2" defaultValue="" onChange={event=>{
        const value=event.target.value;
        const names={mens_doubles:"Men's doubles",womens_doubles:"Women's doubles",mixed_doubles:"Mixed doubles"};
        if(value)setForm({...blank,code:value,name:names[value]});
      }}><option value="">Custom category</option><option value="mens_doubles">Men's doubles</option><option value="womens_doubles">Women's doubles</option><option value="mixed_doubles">Mixed doubles</option></select></label>}
      {[["code","Category code"],["name","Category name"]].map(([key,label])=><label key={key} className="block">{label}<input required maxLength={key==="code"?64:120} className="block w-full border rounded p-2" value={form[key]} onChange={event=>change(key,event.target.value)}/></label>)}
      {[["team_size","Team size"],["sort_order","Display order"]].map(([key,label])=><label key={key} className="block">{label}<input type="number" min={key==="team_size"?1:0} step="1" required className="block w-full border rounded p-2" value={form[key]} onChange={event=>change(key,Number(event.target.value))}/></label>)}
      <label className="block">Category rules / eligibility notes<textarea maxLength={20000} className="block w-full border rounded p-2" value={form.rules_text} onChange={event=>change("rules_text",event.target.value)}/></label>
      <label className="flex gap-2"><input type="checkbox" checked={Boolean(form.is_active)} onChange={event=>change("is_active",Number(event.target.checked))}/>Active category</label>
      <button className="btn btn-primary" type="submit">{command.busy?"Saving…":"Save category"}</button>
    </fieldset>
  </form>;
}
export default function Categories({event,canEdit,onChanged,onReload}) {
  const [offset,setOffset]=useState(0),[editing,setEditing]=useState(null);
  const resource=useTournamentResource(`/api/tournaments/${event.id}/categories?offset=${offset}`);
  const saved=()=>{setEditing(null);resource.reload();onChanged();};
  return <section className="card">
    <h2 className="text-xl font-bold mb-3">Categories</h2><ResourceFeedback resource={resource}/>
    {resource.data?.categories.length===0&&<p>No categories configured.</p>}
    <ul className="space-y-3">{resource.data?.categories.map(category=><li key={category.id} className="border rounded p-3">
      <p className="font-semibold">{category.name} {!category.is_active&&"(disabled)"}</p>
      <p className="text-sm text-gray-600">Code: {category.code} · Team size: {category.team_size}</p>
      <p className="whitespace-pre-wrap">{category.rules_text}</p>
      {canEdit&&<button type="button" className="underline text-green-700 mt-2" onClick={()=>setEditing(category)}>Edit {category.name}</button>}
    </li>)}</ul>
    <Pagination data={resource.data} offset={offset} onChange={setOffset}/>
    {canEdit&&<><button type="button" className="btn btn-secondary mt-4" onClick={()=>setEditing(null)}>New category</button>
      <CategoryForm key={`${editing?.id||"new"}:${event.revision}`} event={event} initial={editing} onSaved={saved} onReload={()=>{setEditing(null);resource.reload();onReload();}}/></>}
  </section>;
}
