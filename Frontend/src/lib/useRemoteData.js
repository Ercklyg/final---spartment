import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { showFeedback } from './actionFeedback.js';
import { reconnectedEvent } from './useOnlineStatus.js';
let loaderCache=new WeakMap();
window.addEventListener('spartment:data-cleared',()=>{loaderCache=new WeakMap();});
// Pass a module-level loader to avoid re-fetching on each render.
export function useRemoteData(loader,{keepPrevious=false}={}) {
  const manual=useRef(false),force=useRef(false);
  const paths=useRef(new Set());
  const [state,setState]=useState(()=>loaderCache.get(loader)||{data:null,error:'',loading:true});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const refresh=()=>{force.current=true;setRevision(n=>n+1);};
    window.addEventListener(reconnectedEvent,refresh);
    return ()=>window.removeEventListener(reconnectedEvent,refresh);
  },[]);
  useEffect(()=>{
    const showFreshData=event=>{if(paths.current.has(event.detail?.path))setRevision(n=>n+1);};
    window.addEventListener('spartment:data-refreshed',showFreshData);
    return ()=>window.removeEventListener('spartment:data-refreshed',showFreshData);
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    paths.current.clear();
    const client=api.withSignal(controller.signal,{force:force.current,onGet:path=>paths.current.add(path)});
    force.current=false;
    loader(client).then(data=>{if(controller.signal.aborted)return;const next={data,error:'',loading:false,loader};loaderCache.set(loader,next);setState(next);if(manual.current){manual.current=false;showFeedback('The latest records have been loaded.');}})
      .catch(error=>{if(controller.signal.aborted||error?.name==='AbortError')return;setState(previous=>({data:keepPrevious||previous.loader===loader?previous.data:null,error:error.message,loading:false,loader}));if(manual.current){manual.current=false;showFeedback(error.message,'error');}});
    return ()=>controller.abort();
  },[keepPrevious,loader,revision]);
  const reload=event=>{manual.current=Boolean(event?.type);force.current=true;setState(previous=>({...previous,error:'',loading:true}));setRevision(n=>n+1);};
  return state.loader!==loader?{data:keepPrevious?state.data:null,error:'',loading:true,reload}:{...state,reload};
}
