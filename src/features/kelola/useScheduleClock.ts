import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useScheduleClock(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  return now;
}
