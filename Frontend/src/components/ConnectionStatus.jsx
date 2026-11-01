import { useEffect, useRef, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import { reconnectedEvent, useOnlineStatus } from '../lib/useOnlineStatus.js';

export default function ConnectionStatus() {
  const online = useOnlineStatus();
  const previous = useRef(online);
  const [restored, setRestored] = useState(false);
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
  if (online && !restored) return null;
  return <div role="status" aria-live="polite" className={`connection-status ${online ? 'is-online' : 'is-offline'}`}>
    {online ? <Wifi size={17}/> : <CloudOff size={17}/>}<span>{online ? 'Back online. Updating your data…' : 'You are offline. Loaded information remains visible, but changes cannot be submitted.'}</span>
  </div>;
}
