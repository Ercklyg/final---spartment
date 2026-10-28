import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const empty={data:null,total:0,unreadCount:0,asOf:null,loading:true,error:''};
export function useNotificationFeed() {
  const [state,setState]=useState(empty);
  const [revision,setRevision]=useState(0);
  const generation=useRef(0),busy=useRef(false),controller=useRef(null);
  useEffect(()=>{
    const current=++generation.current;
    const requestController=new AbortController();controller.current=requestController;
    busy.current=false;
    api.get('/notifications?limit=25',{signal:requestController.signal,force:revision>0}).then(page=>{if(current===generation.current)setState({...page,loading:false,error:''});})
      .catch(error=>{if(error?.name!=='AbortError'&&current===generation.current)setState({...empty,loading:false,error:error.message});});
    return ()=>{requestController.abort();generation.current=current+1;};
  },[revision]);
  const reload=()=>{controller.current?.abort();generation.current++;setState(s=>({...s,loading:true,error:''}));setRevision(n=>n+1);};
  const more=async()=>{
    if(busy.current||state.loading||!state.data||state.data.length>=state.total)return;
    busy.current=true;const current=generation.current;
    setState(s=>({...s,loadingMore:true,error:''}));
    try{
      const page=await api.get('/notifications?'+new URLSearchParams({limit:25,offset:state.data.length,before:state.asOf}),{signal:controller.current?.signal});
      if(current===generation.current){setState(s=>({...page,data:[...s.data,...page.data],loading:false,loadingMore:false,error:''}));return true;}
    }catch(error){if(error?.name!=='AbortError'&&current===generation.current)setState(s=>({...s,loadingMore:false,error:error.message}));}
    finally{if(current===generation.current)busy.current=false;}
  };
  return {...state,reload,more};
}
