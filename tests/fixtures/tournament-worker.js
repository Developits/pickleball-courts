import { createEvent, editEvent } from "../../functions/api/utils/tournaments/repository.js";
import { command } from "../../functions/api/utils/tournaments/audit.js";

const data={title:"Isolated local D1 proof",timezone:"UTC",description:"",venue_name:null,venue_address:null,
  starts_at:null,ends_at:null,registration_deadline_at:null,rules_text:""};
async function operation(action,target,payload) {
  return command(new Request("http://localhost",{headers:{"Idempotency-Key":crypto.randomUUID()}}),{id:1},action,target,payload);
}
export default {
  async fetch(request,env) {
    if(new URL(request.url).pathname!=="/proof")return new Response("Not found",{status:404});
    try {
      const create=await operation("event.create","new",data);create.targetId=crypto.randomUUID();
      await createEvent(env.DB,{id:1},create,data);
      const event=await env.DB.prepare("SELECT * FROM tournaments WHERE id=?").bind(create.targetId).first();
      const one=await operation("event.edit",event.id,{title:"one"}),two=await operation("event.edit",event.id,{title:"two"});
      const edits=await Promise.allSettled([
        editEvent(env.DB,{id:1},one,event,{...data,title:"one"},1),
        editEvent(env.DB,{id:1},two,event,{...data,title:"two"},1),
      ]);
      if(edits.filter(item=>item.status==="fulfilled").length!==1)throw Error("Concurrent revision guard failed");
      await env.DB.prepare("CREATE TRIGGER reject_tournament_audit BEFORE INSERT ON tournament_audit_log BEGIN SELECT RAISE(ABORT,'audit unavailable'); END").run();
      const fail=await operation("event.create","new",data);fail.targetId=crypto.randomUUID();
      let failed=false;
      try { await createEvent(env.DB,{id:1},fail,data); }catch{failed=true;}
      await env.DB.prepare("DROP TRIGGER reject_tournament_audit").run();
      const absent=await env.DB.prepare("SELECT id FROM tournaments WHERE id=?").bind(fail.targetId).first();
      if(!failed||absent)throw Error("D1 batch did not roll back domain insert after audit failure");
      const audit=await env.DB.prepare("SELECT COUNT(*) AS count FROM tournament_audit_log").first();
      if(audit.count!==2)throw Error("Incorrect successful audit count");
      return Response.json({passed:true,checks:["revision concurrency","atomic audit rollback","audit count"],eventId:event.id});
    }catch(error){return Response.json({error:error.message},{status:500});}
  },
};
