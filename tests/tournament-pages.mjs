import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, symlinkSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import assert from "node:assert/strict";
import { generateToken } from "../functions/api/utils/jwt.js";
import bcrypt from "bcryptjs";

const secret="phase-one-local-tests-no-production-secret";
const temp=mkdtempSync("/tmp/opencode/tournament-pages-"), cli=path.resolve("node_modules/wrangler/bin/wrangler.js");
const config=path.join(temp,"wrangler.toml"),persist=path.join(temp,"state");
// Pages requires a standard config in its working directory. Stage only local
// symlinks and a fake-ID test binding; never switch the real project's config.
writeFileSync(config,readFileSync("tests/fixtures/wrangler.pages-tournament.toml","utf8").replace("../../dist","./dist"));
symlinkSync(path.resolve("functions"),path.join(temp,"functions"),"dir");
symlinkSync(path.resolve("dist"),path.join(temp,"dist"),"dir");
const seed=path.join(temp,"seed.sql");
const password=await bcrypt.hash("Phase1LocalOnly123!",4);
writeFileSync(seed,`INSERT INTO users(id,student_id,password,name,department,degree,year,gender,role,is_approved) VALUES
 (1,'localadmin','${password}','Local Admin','Test','Test',1,'other','admin',1),
 (2,'localorganizer','${password}','Local Organizer','Test','Test',1,'other','player',1),
 (3,'localsupervisor','${password}','Local Supervisor','Test','Test',1,'other','supervisor',1);`);
for(const file of [path.resolve("schema.sql"),seed]){
  execFileSync(process.execPath,[cli,"d1","execute","tournament-pages-local-tests","--local","--config",config,"--persist-to",persist,"--file",file],
    {stdio:"pipe",env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
}
const child=spawn(process.execPath,[cli,"pages","dev","dist","--persist-to",persist,"--port","8798","--ip","127.0.0.1","--binding",`JWT_SECRET=${secret}`],
 {cwd:temp,stdio:["ignore","pipe","pipe"],env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
let output="";
const tokens=await Promise.all([["admin",1],["player",2],["supervisor",3]].map(([role,userId])=>generateToken({role,userId},secret)));
async function api(route,{actor=0,method="GET",body,status=200,key=crypto.randomUUID()}={}){
  const response=await fetch(`http://127.0.0.1:8798${route}`,{method,
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${tokens[actor]}`,"Idempotency-Key":key},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
}
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("Pages startup timeout: "+output)),60000);
    const collect=chunk=>{output+=chunk.toString();if(output.includes("Ready on http://")){clearTimeout(timer);resolve();}};
    child.stdout.on("data",collect);child.stderr.on("data",collect);
    child.once("exit",code=>{clearTimeout(timer);reject(Error(`Pages exited ${code}: ${output}`));});
  });
  await api("/api/admin/tournament-organizers/2",{method:"PUT",body:{expected_revision:0}});
  const event=await api("/api/tournaments",{method:"POST",body:{title:"Local Pages cup",timezone:"UTC"},status:201});
  const base=`/api/tournaments/${event.id}`;
  await api(`${base}/staff/2`,{method:"PUT",body:{roles:["organizer"],expected_revision:1}});
  await api(`${base}/staff/3`,{method:"PUT",body:{roles:["supervisor"],expected_revision:2}});
  const view=await api(base,{actor:1});assert.equal(view.permissions.can_edit,true);
  await api(`${base}/categories`,{actor:1,method:"POST",body:{code:"mixed",name:"Mixed doubles",team_size:2,expected_revision:3},status:201});
  await api(base,{actor:1,method:"PATCH",body:{title:"Updated local cup",expected_revision:4}});
  await api(base,{actor:1,method:"PATCH",body:{title:"Stale",expected_revision:4},status:409});
  const supervisor=await api(base,{actor:2});assert.equal(supervisor.permissions.can_edit,false);
  await api(base,{actor:2,method:"PATCH",body:{title:"Denied",expected_revision:5},status:403});
  assert.equal((await api(`${base}/audit`,{actor:1})).audit.length,5);
  await api("/api/admin/tournament-organizers/2",{method:"DELETE",body:{expected_revision:1}});
  await api(base,{actor:1,status:404});
  const session=await api("/api/auth/validate",{actor:1,method:"POST"});
  assert.equal(session.user.role,"player");assert.deepEqual(session.user.capabilities,[]);
  console.log("Local compiled Pages + D1: passed Admin grant/create/assign, Organizer category/edit, stale-edit rejection, Supervisor read-only, audit and revocation.");
  console.log("Isolated local verification workspace:",temp);
}finally{
  child.kill("SIGTERM");if(child.exitCode===null&&child.signalCode===null)await once(child,"exit");
}
