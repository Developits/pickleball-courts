import { useCallback, useEffect, useRef, useState } from "react";
import { tournamentRequest } from "../api/client";

export function useTournamentResource(path) {
  const [state,setState]=useState({data:null,loading:true,error:""});
  const request=useRef(null);
  const reload=useCallback(async()=>{
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setState(previous=>({...previous,loading:true,error:""}));
    try{
      const data=await tournamentRequest(path,{signal:controller.signal});
      if(!controller.signal.aborted)setState({data,loading:false,error:""});
    }catch(error){
      // Drop sensitive cached drafts on loss of access, not just their buttons.
      if(!controller.signal.aborted)setState({data:null,loading:false,error:error.message});
    }
  },[path]);
  useEffect(()=>{
    setState({data:null,loading:true,error:""});
    reload();
    return ()=>request.current?.abort();
  },[reload]);
  return {...state,reload};
}

export function useTournamentCommand() {
  const [state,setState]=useState({busy:false,error:"",conflict:false});
  const pending=useRef(null),mounted=useRef(true),inFlight=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const run=async(path,method,payload)=>{
    const signature=JSON.stringify({path,method,payload});
    if(inFlight.current)return null;
    if(pending.current && pending.current.signature!==signature){
      setState({busy:false,conflict:false,error:"The previous request outcome is unknown. Retry the unchanged values, or reload the page and review saved data first."});
      return null;
    }
    const operation=pending.current || {signature,key:crypto.randomUUID()};
    pending.current=operation;
    inFlight.current=true;
    setState({busy:true,error:"",conflict:false});
    try{
      const data=await tournamentRequest(path,{
        method,headers:{"Idempotency-Key":operation.key},body:JSON.stringify(payload),
      });
      pending.current=null;
      if(mounted.current)setState({busy:false,error:"",conflict:false});
      return mounted.current?data:null;
    }catch(error){
      if(error.status>=400&&error.status<500)pending.current=null;
      if(mounted.current)setState({busy:false,error:error.message,conflict:error.status===409});
      return null;
    }finally{
      inFlight.current=false;
    }
  };
  return {...state,run};
}
