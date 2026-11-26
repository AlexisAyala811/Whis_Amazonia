import { useCallback, useEffect, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export type Tema = 'dark' | 'light';

/** Solo se guarda cuando la persona elige el tema; por defecto es el claro (crema) */
const TEMA_KEY = 'whis-tema';

export function useTheme(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#0D0F12' : '#F4F1E8');
    try {
      localStorage.setItem(TEMA_KEY, tema);
      // La versión anterior guardaba siempre "dark" (era el tema por defecto): se descarta
      localStorage.removeItem('whis-theme');
    } catch {
      /* sin almacenamiento */
    }
  }, [tema]);
  const toggle = useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return [tema, toggle];
}
