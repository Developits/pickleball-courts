export class TournamentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireValue(condition, message, status = 400) {
  if (!condition) throw new TournamentError(status, message);
}
export function uuid(value, label = "ID") {
  requireValue(typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value), `Invalid ${label}`);
  return value;
}
export function userId(value) {
  requireValue(/^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)), "Invalid user ID");
  return Number(value);
}
export function revision(value, minimum = 1) {
  requireValue(Number.isSafeInteger(value) && value >= minimum, "Expected revision is required");
  return value;
}
export function text(value, label, max, required = false) {
  requireValue(typeof value === "string" && value.length <= max && (!required || value.trim().length > 0), `Invalid ${label}`);
  return value.trim();
}
export function allowFields(body, fields) {
  requireValue(body && typeof body === "object" && !Array.isArray(body), "Expected a JSON object");
  requireValue(Object.keys(body).every(key => fields.includes(key)), "Unsupported field or action");
}
export async function readBody(request) {
  const reader=request.body?.getReader(),chunks=[];
  let size=0;
  if(reader){
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        size+=value.byteLength;
        if(size>65536){await reader.cancel();throw new TournamentError(413,"Request body exceeds 64 KiB");}
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new TournamentError(400, "Invalid JSON body"); }
}
const eventFields = ["title", "description", "venue_name", "venue_address", "timezone", "starts_at", "ends_at", "registration_deadline_at", "rules_text"];
export function eventInput(body, current = null) {
  allowFields(body, [...eventFields, "expected_revision"]);
  const result = current ? Object.fromEntries(eventFields.map(key => [key, current[key]])) : {
    title: "", description: "", venue_name: null, venue_address: null,
    timezone: "", starts_at: null, ends_at: null, registration_deadline_at: null, rules_text: "",
  };
  for (const key of eventFields) if (Object.hasOwn(body, key)) result[key] = body[key];
  for (const [key, max, required] of [["title",160,true],["description",20000,false],["rules_text",20000,false],["timezone",100,true]]) {
    result[key] = text(result[key], key, max, required);
  }
  for (const key of ["venue_name", "venue_address"]) {
    if (result[key] !== null) result[key] = text(result[key], key, 1000);
  }
  try { new Intl.DateTimeFormat("en", { timeZone: result.timezone }); }
  catch { throw new TournamentError(400, "Invalid IANA timezone"); }
  for (const key of ["starts_at", "ends_at", "registration_deadline_at"]) {
    requireValue(result[key] === null || (Number.isSafeInteger(result[key]) && Math.abs(result[key]) <= 8640000000000), `Invalid ${key}: use UTC epoch seconds`);
  }
  requireValue((result.starts_at === null && result.ends_at === null) ||
    (result.starts_at !== null && result.ends_at !== null && result.ends_at >= result.starts_at), "Provide an ordered start/end pair");
  return result;
}
export function categoryInput(body, current = null) {
  const fields = ["code","name","team_size","rules_text","sort_order","is_active"];
  allowFields(body, [...fields, "expected_revision"]);
  const result = current ? Object.fromEntries(fields.map(key => [key, current[key]])) :
    { code:"", name:"", team_size:2, rules_text:"", sort_order:0, is_active:1 };
  for (const key of fields) if (Object.hasOwn(body,key)) result[key] = body[key];
  result.code = text(result.code, "category code", 64, true);
  requireValue(/^[a-z][a-z0-9_-]*$/.test(result.code), "Invalid category code");
  result.name = text(result.name, "category name", 120, true);
  result.rules_text = text(result.rules_text, "category rules", 20000);
  requireValue(Number.isSafeInteger(result.team_size) && result.team_size > 0, "Invalid team size");
  requireValue(Number.isSafeInteger(result.sort_order) && result.sort_order >= 0, "Invalid sort order");
  requireValue([true,false,0,1].includes(result.is_active), "Invalid category active flag");
  result.is_active = Number(result.is_active);
  return result;
}
export function page(request) {
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") ?? 20), offset = Number(params.get("offset") ?? 0);
  requireValue(Number.isSafeInteger(limit) && limit > 0 && limit <= 100 &&
    Number.isSafeInteger(offset) && offset >= 0 && offset <= 1000000, "Invalid pagination");
  return { limit, offset };
}
