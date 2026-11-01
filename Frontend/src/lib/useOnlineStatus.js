import { useEffect, useState } from 'react';

export const reconnectedEvent = 'spartment:reconnected';

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const offline = () => setOnline(false);
    const onlineAgain = () => setOnline(true);
    window.addEventListener('offline', offline);
    window.addEventListener('online', onlineAgain);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', onlineAgain); };
  }, []);
  return online;
}
