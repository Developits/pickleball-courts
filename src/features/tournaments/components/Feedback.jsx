export function ResourceFeedback({resource}) {
  if(resource.error)return <div role="alert" className="card bg-red-50 text-red-800"><p>{resource.error}</p><button type="button" className="underline mt-2" onClick={resource.reload}>Reload data</button></div>;
  if(resource.loading && !resource.data)return <p role="status">Loading tournament data…</p>;
  return null;
}
export function CommandFeedback({command,onReload}) {
  if(!command.error)return null;
  return <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800 mb-4">
    <p>{command.error}</p>
    {command.conflict && onReload && <><p className="text-sm mt-2">Reloading discards unsaved edits; it does not retry the write.</p><button type="button" className="underline mt-2" onClick={onReload}>Reload latest draft</button></>}
  </div>;
}
export function Pagination({data,offset,onChange}) {
  return <div className="flex gap-3 mt-4">
    {offset>0 && <button type="button" className="btn btn-secondary" onClick={()=>onChange(Math.max(0,offset-20))}>Previous page</button>}
    {data?.has_more && <button type="button" className="btn btn-secondary" onClick={()=>onChange(data.next_offset)}>Next page</button>}
  </div>;
}
