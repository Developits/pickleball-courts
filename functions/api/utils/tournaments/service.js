import { createSuccessResponse, createErrorResponse } from "../jwt.js";
import { currentActor, assertAuthority, eventAccess, authoritySQL, eligibleSQL, organizerSQL } from "./policy.js";
import { TournamentError, requireValue, uuid, userId, revision, readBody, allowFields, eventInput, categoryInput, page, text } from "./validation.js";
import { command, replay } from "./audit.js";
import { createEvent, editEvent, writeCategory, writeCapability, writeStaff } from "./repository.js";

function paginated(rows, key, limit, offset) {
  return { [key]:rows.slice(0,limit), has_more:rows.length>limit, next_offset:rows.length>limit?offset+limit:null };
}
async function selectPage(db,request,sql,args,key) {
  const {limit,offset}=page(request);
  const rows=await db.prepare(`${sql} LIMIT ? OFFSET ?`).bind(...args,limit+1,offset).all();
  return paginated(rows.results,key,limit,offset);
}
async function mutationResult(db,op,run,authorize) {
  const prior=await replay(db,op);
  if(prior){
    // A replay is still a request: re-check current authority rather than
    // trusting the permissions that existed when the command first committed.
    await authorize();
    return prior;
  }
  return run();
}
export async function handleTournament(context, resource) {
  const {request,env}=context, db=env.DB, method=request.method;
  const params=context.params || {};
  try {
    const identity=await currentActor(request,env);
    if(identity.response)return identity.response;
    const actor=identity.user;
    if(resource==="organizers"){
      await assertAuthority(db,actor);
      requireValue(method==="GET","Method not allowed",405);
      const q=text(new URL(request.url).searchParams.get("q") || "","search",120);
      return createSuccessResponse(await selectPage(db,request,`SELECT u.id,u.name,u.student_id,u.role,
        (${eligibleSQL("u")}) AS eligible,COALESCE(cap.revision,0) AS revision,
        (cap.user_id IS NOT NULL AND cap.revoked_at IS NULL) AS organizer_active
        FROM users u LEFT JOIN user_capabilities cap ON cap.user_id=u.id AND cap.capability='tournament_organizer'
        WHERE u.name LIKE ? OR u.student_id LIKE ? ORDER BY u.name COLLATE NOCASE,u.id`,
      [`%${q}%`,`%${q}%`],"users"));
    }
    if(resource==="organizer"){
      await assertAuthority(db,actor);
      requireValue(["PUT","DELETE"].includes(method),"Method not allowed",405);
      const target=userId(params.userId), body=await readBody(request);
      allowFields(body,["expected_revision"]);
      const expected=revision(body.expected_revision,0), active=method==="PUT";
      const op=await command(request,actor,active?"organizer.grant":"organizer.revoke",String(target),body);
      return createSuccessResponse(await mutationResult(db,op,async()=>{
        requireValue(await db.prepare("SELECT id FROM users WHERE id=?").bind(target).first(),"User not found",404);
        const previous=await db.prepare("SELECT * FROM user_capabilities WHERE user_id=? AND capability='tournament_organizer'").bind(target).first();
        return writeCapability(db,actor,op,target,expected,active,previous);
      },()=>assertAuthority(db,actor)));
    }
    if(resource==="list"){
      if(method==="GET"){
        const result=await selectPage(db,request,`SELECT t.* FROM tournaments t WHERE EXISTS
          (SELECT 1 FROM users u WHERE u.id=? AND ${eligibleSQL("u")} AND
          (u.role='admin' OR EXISTS(SELECT 1 FROM tournament_staff s WHERE s.tournament_id=t.id
            AND s.user_id=u.id AND s.revoked_at IS NULL AND
            ((s.staff_role='organizer' AND ${organizerSQL()}) OR (s.staff_role='supervisor' AND u.role IN ('supervisor','admin'))))))
          ORDER BY t.updated_at DESC,t.id`,[actor.id],"tournaments");
        return createSuccessResponse({...result,can_create:actor.role==="admin"});
      }
      requireValue(method==="POST","Method not allowed",405);
      await assertAuthority(db,actor);
      const body=await readBody(request), data=eventInput(body);
      requireValue(!Object.hasOwn(body,"expected_revision"),"New drafts have no expected revision");
      const op=await command(request,actor,"event.create","new",body);
      op.targetId=crypto.randomUUID();
      return createSuccessResponse(await mutationResult(db,op,()=>createEvent(db,actor,op,data),
        ()=>assertAuthority(db,actor)),201);
    }
    const id=uuid(params.tournamentId,"tournament ID");
    const event=await eventAccess(db,actor,id);
    if(resource==="event" && method==="GET"){
      const edit=authoritySQL(actor.id,id,"edit");
      const canEdit=Boolean(await db.prepare(`SELECT 1 AS allowed WHERE ${edit.sql}`).bind(...edit.args).first());
      return createSuccessResponse({tournament:event,permissions:{can_edit:canEdit,can_assign_staff:actor.role==="admin",can_audit:canEdit}});
    }
    if(resource==="event"){
      requireValue(method==="PATCH","Method not allowed",405);
      await eventAccess(db,actor,id,true);
      const body=await readBody(request); allowFields(body,["title","description","venue_name","venue_address","timezone","starts_at","ends_at","registration_deadline_at","rules_text","expected_revision"]);
      const expected=revision(body.expected_revision);
      const op=await command(request,actor,"event.edit",id,body);
      return createSuccessResponse(await mutationResult(db,op,()=>{
        const data=eventInput(body,event);
        requireValue(Object.entries(data).some(([key,value])=>event[key]!==value),"No changes to save",409);
        return editEvent(db,actor,op,event,data,expected);
      },()=>eventAccess(db,actor,id,true)));
    }
    if(resource==="categories" && method==="GET"){
      return createSuccessResponse(await selectPage(db,request,
        "SELECT * FROM tournament_categories WHERE tournament_id=? ORDER BY sort_order,id",[id],"categories"));
    }
    if(resource==="category" || resource==="categories"){
      requireValue((resource==="category" && method==="PATCH")||(resource==="categories" && method==="POST"),"Method not allowed",405);
      await eventAccess(db,actor,id,true);
      const target=resource==="category"?uuid(params.categoryId,"category ID"):null;
      const previous=target?await db.prepare("SELECT * FROM tournament_categories WHERE id=? AND tournament_id=?").bind(target,id).first():null;
      if(target)requireValue(previous,"Category not found",404);
      const body=await readBody(request), expected=revision(body.expected_revision);
      allowFields(body,["code","name","team_size","rules_text","sort_order","is_active","expected_revision"]);
      const op=await command(request,actor,target?"category.edit":"category.create",target||id,{tournament_id:id,...body});
      if(!target)op.targetId=crypto.randomUUID();
      return createSuccessResponse(await mutationResult(db,op,()=>{
        const data=categoryInput(body,previous);
        if(previous)requireValue(Object.entries(data).some(([key,value])=>previous[key]!==value),"No changes to save",409);
        return writeCategory(db,actor,op,event,data,expected,previous);
      },()=>eventAccess(db,actor,id,true)),target?200:201);
    }
    if(resource==="staff" && method==="GET"){
      const result=await selectPage(db,request,`SELECT u.id AS user_id,u.name,u.role,
        (${eligibleSQL("u")}) AS eligible,${organizerSQL()} AS organizer_eligible,
        GROUP_CONCAT(s.staff_role) AS roles
        FROM tournament_staff s JOIN users u ON u.id=s.user_id
        WHERE s.tournament_id=? AND s.revoked_at IS NULL GROUP BY u.id ORDER BY u.name COLLATE NOCASE,u.id`,[id],"staff");
      result.staff=result.staff.map(row=>{
        const roles=row.roles.split(",").sort();
        return {user_id:row.user_id,name:row.name,roles,effective_roles:roles.filter(role=>row.eligible &&
          (role==="organizer"?(row.organizer_eligible||row.role==="admin"):["admin","supervisor"].includes(row.role)))};
      });
      return createSuccessResponse(result);
    }
    if(resource==="staffMember"){
      requireValue(["PUT","DELETE"].includes(method),"Method not allowed",405);
      await assertAuthority(db,actor);
      const target=userId(params.userId), body=await readBody(request);
      allowFields(body,method==="PUT"?["roles","expected_revision"]:["expected_revision"]);
      const expected=revision(body.expected_revision), roles=method==="DELETE"?[]:body.roles;
      requireValue(Array.isArray(roles)&&roles.length<=2&&roles.every(role=>["organizer","supervisor"].includes(role))&&new Set(roles).size===roles.length,"Invalid staff roles");
      roles.sort();
      const op=await command(request,actor,"staff.replace",String(target),{tournament_id:id,...body,roles});
      return createSuccessResponse(await mutationResult(db,op,async()=>{
        const old=await db.prepare("SELECT staff_role FROM tournament_staff WHERE tournament_id=? AND user_id=? AND revoked_at IS NULL ORDER BY staff_role").bind(id,target).all();
        const previous=old.results.map(row=>row.staff_role);
        requireValue(JSON.stringify(previous)!==JSON.stringify(roles),"No assignment changes to save",409);
        return writeStaff(db,actor,op,event,target,roles,expected,previous);
      },()=>assertAuthority(db,actor)));
    }
    if(resource==="audit"){
      requireValue(method==="GET","Method not allowed",405);
      await eventAccess(db,actor,id,true);
      const result=await selectPage(db,request,`SELECT id,actor_user_id,action,target_type,target_id,
        resource_revision,before_json,after_json,created_at FROM tournament_audit_log
        WHERE tournament_id=? ORDER BY created_at DESC,id DESC`,[id],"audit");
      result.audit=result.audit.map(({before_json,after_json,...row})=>({...row,before:before_json?JSON.parse(before_json):null,after:JSON.parse(after_json)}));
      return createSuccessResponse(result);
    }
    throw new TournamentError(405,"Method not allowed");
  }catch(error){
    if(error instanceof TournamentError)return createErrorResponse(error.message,error.status);
    if(/no such table: .*?(?:tournament|user_capabilities)/i.test(error.message))return createErrorResponse("Tournament foundation migration is required",503);
    if(/UNIQUE constraint/i.test(error.message))return createErrorResponse("A record with that identifier already exists",409);
    console.error("Tournament request failed:",error);
    return createErrorResponse("Unable to complete tournament request",500);
  }
}
