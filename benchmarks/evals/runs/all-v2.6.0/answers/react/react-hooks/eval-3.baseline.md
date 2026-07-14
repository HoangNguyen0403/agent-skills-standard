~~~jsx
import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
~~~

The lazy initial read, event subscription, and cleanup cover the browser case. For server rendering, guard navigator/window access or use a server-safe fallback. For an application-wide shared subscription, useSyncExternalStore is a better fit.
