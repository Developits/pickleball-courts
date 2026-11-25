// Explicitly local integration check. Never creates remote Cloudflare resources.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { once } from "node:events";

const temp=mkdtempSync("/tmp/opencode/tournament-d1-");
const cli=path.resolve("node_modules/wrangler/bin/wrangler.js");
const config=path.resolve("tests/fixtures/wrangler.tournament.toml");
const seed=path.join(temp,"seed.sql");
const legacy=path.join(temp,"legacy.sql");
writeFileSync(legacy,readFileSync("schema.sql","utf8").split("-- Tournament Phase 1 foundation")[0]);
writeFileSync(seed,`INSERT INTO users (id,student_id,password,name,department,degree,year,gender,role,is_approved)
  VALUES (1,'localadmin','not-a-password','Local Admin','Test','Test',1,'other','admin',1);`);
const common=["--config",config,"--persist-to",path.join(temp,"state")];
for(const file of [legacy,seed,path.resolve("migrate_009_tournament_foundation.sql")]){
  execFileSync(process.execPath,[cli,"d1","execute","tournament-local-tests","--local",...common,"--file",file],
    {stdio:"pipe",env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
}
const child=spawn(process.execPath,[cli,"dev","--local",...common,"--port","8797","--ip","127.0.0.1"],
  {stdio:["ignore","pipe","pipe"],env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
let output="";
try{
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error("Local D1 worker startup timed out: "+output)),60000);
    const collect=chunk=>{
      output+=chunk.toString();
      if(output.includes("Ready on http://")){clearTimeout(timeout);resolve();}
    };
    child.stdout.on("data",collect);child.stderr.on("data",collect);
    child.once("exit",code=>{clearTimeout(timeout);reject(Error(`Local worker exited ${code}: ${output}`));});
  });
  const response=await fetch("http://127.0.0.1:8797/proof",{signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  if(!response.ok||!result.passed)throw Error(JSON.stringify(result));
  console.log("Local Wrangler D1:",JSON.stringify(result));
}finally{
  child.kill("SIGTERM");
  if(child.exitCode===null&&child.signalCode===null)await once(child,"exit");
}
