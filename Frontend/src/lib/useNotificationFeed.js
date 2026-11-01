import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { loadNotificationPreferences } from './notifications.js';

const empty={data:null,total:0,unreadCount:0,asOf:null,loading:true,error:''};
export function useNotificationFeed() {
  const [state,setState]=useState(empty);
  const [revision,setRevision]=useState(0);
  const generation=useRef(0),busy=useRef(false),controller=useRef(null);
  const latest=useRef(null),preferences=useRef(null);
  useEffect(()=>{loadNotificationPreferences(api).then(value=>{preferences.current=value;}).catch(()=>undefined);},[]);
  useEffect(()=>{
    const current=++generation.current;
    const requestController=new AbortController();controller.current=requestController;
    busy.current=false;
    api.get('/notifications?limit=25',{signal:requestController.signal,force:revision>0}).then(page=>{if(current!==generation.current)return;const newest=page.data?.[0];if(latest.current&&newest?.id!==latest.current&&!newest?.is_read){const prefs=preferences.current;if(prefs?.sound_enabled){const context=new AudioContext(),oscillator=context.createOscillator(),gain=context.createGain();oscillator.connect(gain).connect(context.destination);gain.gain.value=.035;oscillator.frequency.value=660;oscillator.start();oscillator.stop(context.currentTime+.12);}if(prefs?.browser_enabled&&'Notification'in window&&Notification.permission==='granted')new Notification(newest.title,{body:newest.message,icon:'/favicon.svg'});}if(newest)latest.current=newest.id;setState({...page,loading:false,error:''});})
      .catch(error=>{if(error?.name!=='AbortError'&&current===generation.current)setState(previous=>({...previous,loading:false,loadingMore:false,error:error.message}));});
    return ()=>{requestController.abort();generation.current=current+1;};
  },[revision]);
  useEffect(()=>{
    const timer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)setRevision(n=>n+1);},30000);
    const visible=()=>{if(document.visibilityState==='visible'&&navigator.onLine)setRevision(n=>n+1);};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[]);
  const reload=()=>{controller.current?.abort();generation.current++;setState(s=>({...s,loading:true,loadingMore:false,error:''}));setRevision(n=>n+1);};
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
