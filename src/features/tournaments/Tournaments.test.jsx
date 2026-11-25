import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TournamentList, TournamentEditor, OrganizerAdmin } from "./pages/Tournaments";
import { useTournamentCommand } from "./hooks/useTournament";

const ID="11111111-1111-4111-8111-111111111111";
let draft,permissions,categories,staff,users,fetchMock,mutate,detailStatus,listCreate;
beforeEach(()=>{
  draft={id:ID,title:"Private cup",description:"",venue_name:null,venue_address:null,timezone:"UTC",
    starts_at:null,ends_at:null,registration_deadline_at:null,rules_text:"",revision:1,status:"draft"};
  permissions={can_edit:true,can_assign_staff:true,can_audit:true};
  categories=[];staff=[];users=[{id:2,name:"Alice",student_id:"test2",role:"player",eligible:1,organizer_active:0,revision:0}];
  detailStatus=200;listCreate=true;
  mutate=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(options.method==="POST"&&!_url.includes("categories"))draft={...draft,...body};
    return Response.json({id:ID,revision:2});
  };
  fetchMock=vi.fn(async(url,options={})=>{
    if(options.method && options.method!=="GET")return mutate(url,options);
    if(url.includes("tournament-organizers"))return Response.json({users,has_more:false});
    if(url.includes("/categories"))return Response.json({categories,has_more:false});
    if(url.includes("/staff"))return Response.json({staff,has_more:false});
    if(url.includes("/audit"))return Response.json({audit:[],has_more:false});
    if(url.startsWith(`/api/tournaments/${ID}`))return Response.json(detailStatus===200?{tournament:draft,permissions}:{error:"Tournament not found"},{status:detailStatus});
    return Response.json({tournaments:[draft],can_create:listCreate,has_more:false});
  });
  vi.stubGlobal("fetch",fetchMock);localStorage.setItem("auth_token","local-test");
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
function editor(){return render(<MemoryRouter initialEntries={[`/tournaments/${ID}`]}><Routes><Route path="/tournaments/:tournamentId" element={<TournamentEditor/>}/></Routes></MemoryRouter>);}

it("creates private drafts with a stable command key and no future-state fields",async()=>{
  render(<MemoryRouter initialEntries={["/tournaments"]}><Routes><Route path="/tournaments" element={<TournamentList/>}/><Route path="/tournaments/:tournamentId" element={<TournamentEditor/>}/></Routes></MemoryRouter>);
  await userEvent.click(await screen.findByRole("button",{name:"New tournament draft"}));
  await userEvent.type(screen.getByLabelText("Title"),"New local cup");
  await userEvent.click(screen.getByRole("button",{name:"Create draft"}));
  await screen.findByRole("heading",{name:"New local cup"});
  const [,options]=fetchMock.mock.calls.find(([,o])=>o?.method==="POST");
  const body=JSON.parse(options.body);
  expect(body.title).toBe("New local cup");expect(body.timezone).toBe("UTC");
  expect(body.status).toBeUndefined();expect(body.created_by_user_id).toBeUndefined();
  expect(options.headers["Idempotency-Key"]).toMatch(/^[a-f0-9-]{36}$/);
});
it("uses server permissions for assigned Supervisor read-only views",async()=>{
  permissions={can_edit:false,can_assign_staff:false,can_audit:false};
  editor();await screen.findByRole("heading",{name:"Private cup"});
  expect(screen.getByLabelText("Title").closest("fieldset").disabled).toBe(true);
  expect(screen.queryByRole("button",{name:"Save draft"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Save assignments"})).toBeNull();
  expect(screen.queryByText("Change history (read-only)")).toBeNull();
  expect(fetchMock.mock.calls.some(([url])=>url.includes("/audit"))).toBe(false);
});
it("recovers a stale edit only after explicit reload and does not blindly retry",async()=>{
  mutate=async()=>Response.json({error:"Revision changed"},{status:409});
  editor();await screen.findByLabelText("Title");
  await userEvent.clear(screen.getByLabelText("Title"));await userEvent.type(screen.getByLabelText("Title"),"Unsaved version");
  await userEvent.click(screen.getByRole("button",{name:"Save draft"}));
  await screen.findByText("Revision changed");
  draft={...draft,title:"Other editor's version",revision:2};
  await userEvent.click(screen.getByRole("button",{name:"Reload latest draft"}));
  await waitFor(()=>expect(screen.getByLabelText("Title").value).toBe("Other editor's version"));
  expect(fetchMock.mock.calls.filter(([,options])=>options?.method==="PATCH")).toHaveLength(1);
});
it("allows assigned Organizers to create custom category metadata but not assign staff",async()=>{
  permissions.can_assign_staff=false;
  editor();await screen.findByRole("heading",{name:"Add category metadata"});
  await userEvent.type(screen.getByLabelText("Category code"),"custom");
  await userEvent.type(screen.getByLabelText("Category name"),"Custom format");
  await userEvent.clear(screen.getByLabelText("Team size"));await userEvent.type(screen.getByLabelText("Team size"),"3");
  await userEvent.click(screen.getByRole("button",{name:"Save category"}));
  const [url,options]=fetchMock.mock.calls.find(([,o])=>o?.method==="POST");
  expect(url).toContain("/categories");
  expect(JSON.parse(options.body)).toMatchObject({code:"custom",team_size:3,expected_revision:1});
  expect(screen.queryByRole("button",{name:"Save assignments"})).toBeNull();
});
it("provides Admin assignment controls with parent revisions",async()=>{
  editor();await screen.findByRole("button",{name:"Save assignments"});
  await userEvent.type(screen.getByLabelText("Staff user ID"),"2");
  await userEvent.click(screen.getByRole("checkbox",{name:"organizer"}));
  await userEvent.click(screen.getByRole("button",{name:"Save assignments"}));
  const [url,options]=fetchMock.mock.calls.find(([,o])=>o?.method==="PUT");
  expect(url).toContain("/staff/2");
  expect(JSON.parse(options.body)).toEqual({roles:["organizer"],expected_revision:1});
});
it("hides drafts after denied access and shows explicit retry instead",async()=>{
  detailStatus=404;editor();
  expect((await screen.findByRole("alert")).textContent).toContain("Tournament not found");
  expect(screen.queryByLabelText("Title")).toBeNull();
  detailStatus=200;await userEvent.click(screen.getByRole("button",{name:"Reload data"}));
  expect(await screen.findByLabelText("Title")).toBeTruthy();
});
it("shows no creation controls to non-Admin directory viewers",async()=>{
  listCreate=false;render(<MemoryRouter><TournamentList/></MemoryRouter>);
  await screen.findByText("Private cup");
  expect(screen.queryByRole("button",{name:"New tournament draft"})).toBeNull();
  expect(screen.queryByRole("link",{name:"Manage Organizer access"})).toBeNull();
});
it("Admin grants Organizer capability without submitting a primary-role change",async()=>{
  render(<MemoryRouter><OrganizerAdmin/></MemoryRouter>);
  await userEvent.click(await screen.findByRole("button",{name:"Grant Organizer access for Alice"}));
  const [,options]=fetchMock.mock.calls.find(([,o])=>o?.method==="PUT");
  expect(JSON.parse(options.body)).toEqual({expected_revision:0});
  expect(screen.getByText(/player · Organizer disabled/)).toBeTruthy();
});
it("keeps idempotency keys across uncertain failures and blocks changed-payload retries",async()=>{
  let attempt=0;
  mutate=async()=>{if(++attempt===1)throw Error("Connection lost");return Response.json({id:ID,revision:1,replayed:true});};
  const hook=renderHook(()=>useTournamentCommand());
  await act(async()=>{await hook.result.current.run("/api/tournaments","POST",{title:"One"});});
  expect(hook.result.current.error).toBe("Connection lost");
  await act(async()=>{await hook.result.current.run("/api/tournaments","POST",{title:"Changed"});});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async()=>{await hook.result.current.run("/api/tournaments","POST",{title:"One"});});
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]);
});
it("retains command identity after an HTTP 500 that could follow a committed write",async()=>{
  mutate=async()=>Response.json({error:"Response unavailable"},{status:500});
  const hook=renderHook(()=>useTournamentCommand());
  await act(async()=>{await hook.result.current.run("/api/tournaments","POST",{title:"One"});});
  await act(async()=>{await hook.result.current.run("/api/tournaments","POST",{title:"One"});});
  expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]);
});
