import { useEffect, useRef, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import { reconnectedEvent, useOnlineStatus } from '../lib/useOnlineStatus.js';

export default function ConnectionStatus() {
  const online = useOnlineStatus();
  const previous = useRef(online);
  const [restored, setRestored] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  useEffect(() => {
    let timeout;
    if (online && !previous.current) {
      setRestored(true);
      window.dispatchEvent(new Event(reconnectedEvent));
      timeout = setTimeout(() => setRestored(false), 4000);
    }
    previous.current = online;
    return () => clearTimeout(timeout);
  }, [online]);
  useEffect(()=>{const used=event=>setCachedAt(event.detail?.savedAt||Date.now());window.addEventListener('spartment:offline-cache-used',used);return()=>window.removeEventListener('spartment:offline-cache-used',used);},[]);
  if (online && !restored) return null;
  return <div role="status" aria-live="polite" className={`connection-status ${online ? 'is-online' : 'is-offline'}`}>
    {online ? <Wifi size={17}/> : <CloudOff size={17}/>}<span>{online ? 'Back online. Updating your data…' : cachedAt ? `Offline copy · Last updated ${new Date(cachedAt).toLocaleString('en-PH')}` : 'You are offline. Previously visited information may be available; changes cannot be submitted.'}</span>
  </div>;
}
