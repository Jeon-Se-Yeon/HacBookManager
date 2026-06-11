import { useState, useEffect, useCallback } from 'react';

export function useAppNavigation() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goHome = useCallback(() => {
    window.history.replaceState({}, '', '/');
    setPath('/');
  }, []);

  const navigate = useCallback(
    (to) => {
      const next = to.startsWith('/') ? to : `/${to}`;
      if (next === '/') {
        goHome();
        return;
      }
      if (window.location.pathname !== next) {
        window.history.pushState({}, '', next);
        setPath(next);
      }
    },
    [goHome]
  );

  return { path, navigate, goHome };
}
