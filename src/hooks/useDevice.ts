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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#0D331F' : '#FAF6EC');
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

/**
 * Netlify (plan gratuito) agrega una insignia "Powered by Netlify" fija abajo a la
 * derecha. No se oculta: se deja espacio libre debajo de la barra inferior para que
 * no tape los botones. Expone la altura en la variable CSS --insignia.
 */
export function useEspacioInsignia(): void {
  useEffect(() => {
    const raiz = document.documentElement;
    const medir = () => {
      const f = document.getElementById('nl-badge-frame');
      const r = f?.getBoundingClientRect();
      const alto = r && r.height > 0 && r.bottom >= window.innerHeight - 4 ? Math.ceil(r.height) : 0;
      raiz.style.setProperty('--insignia', `${alto}px`);
    };
    medir();
    const obs = new MutationObserver(medir);
    obs.observe(document.body, { childList: true });
    window.addEventListener('resize', medir);
    const t = window.setInterval(medir, 2000);
    window.setTimeout(() => window.clearInterval(t), 20000);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', medir);
      window.clearInterval(t);
    };
  }, []);
}
