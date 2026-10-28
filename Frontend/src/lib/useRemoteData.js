import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { showFeedback } from './actionFeedback.js';
// Pass a module-level loader to avoid re-fetching on each render.
export function useRemoteData(loader,{keepPrevious=false}={}) {
  const manual=useRef(false),force=useRef(false);
  const [state,setState]=useState({data:null,error:'',loading:true});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    const client=api.withSignal(controller.signal,{force:force.current});
    force.current=false;
    loader(client).then(data=>{setState({data,error:'',loading:false,loader});if(manual.current){manual.current=false;showFeedback('The latest records have been loaded.');}})
      .catch(error=>{if(error?.name==='AbortError')return;setState(previous=>({data:keepPrevious?previous.data:null,error:error.message,loading:false,loader}));if(manual.current){manual.current=false;showFeedback(error.message,'error');}});
    return ()=>controller.abort();
  },[keepPrevious,loader,revision]);
  const reload=event=>{manual.current=Boolean(event?.type);force.current=true;setState(previous=>({...previous,error:'',loading:true}));setRevision(n=>n+1);};
  return state.loader!==loader?{data:keepPrevious?state.data:null,error:'',loading:true,reload}:{...state,reload};
}
