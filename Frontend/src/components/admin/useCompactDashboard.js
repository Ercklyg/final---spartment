import { useEffect, useState } from 'react';
const query = '(min-width: 1280px) and (min-height: 720px)';
export default function useCompactDashboard() {
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = event => setCompact(event.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return compact;
}
