import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { showFeedback } from './actionFeedback.js';
// Pass a module-level loader to avoid re-fetching on each render.
export function useRemoteData(loader,{keepPrevious=false}={}) {
  const manual=useRef(false);
  const [state,setState]=useState({data:null,error:'',loading:true});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    loader(api).then(data=>{if(active){setState({data,error:'',loading:false,loader});if(manual.current){manual.current=false;showFeedback('The latest records have been loaded.');}}})
      .catch(error=>{if(active){setState({data:null,error:error.message,loading:false,loader});if(manual.current){manual.current=false;showFeedback(error.message,'error');}}});
    return ()=>{active=false;};
  },[loader,revision]);
  const reload=event=>{manual.current=Boolean(event?.type);setState({data:null,error:'',loading:true});setRevision(n=>n+1);};
  return state.loader!==loader?{data:keepPrevious?state.data:null,error:'',loading:true,reload}:{...state,reload};
}
