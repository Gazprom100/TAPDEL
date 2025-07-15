import { useEffect, useCallback } from 'react';

export const useFullscreen = () => {
  // Вызов Telegram WebApp Fullscreen и установка safe-area
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        // Safe area
        if (tg.safeAreaInset) {
          document.documentElement.style.setProperty('--safe-top', `${tg.safeAreaInset.top}px`);
          document.documentElement.style.setProperty('--safe-bottom', `${tg.safeAreaInset.bottom}px`);
        }
        // Fullscreen
        if (typeof tg.requestFullscreen === 'function') {
          const res = tg.requestFullscreen();
          if (res && typeof res.then === 'function') {
            res.catch((e: any) => {
              console.warn('Telegram requestFullscreen error:', e);
            });
          }
        }
      } catch (e) {
        console.warn('Telegram WebApp fullscreen/init error:', e);
      }
    }
  }, []);

  // Выход из fullscreen для Telegram
  const exitFullscreen = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.exitFullscreen === 'function') {
      tg.exitFullscreen();
    }
  }, []);

  return { exitFullscreen };
}; 