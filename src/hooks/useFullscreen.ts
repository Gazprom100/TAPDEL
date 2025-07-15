import { useEffect, useCallback } from 'react';

export const useFullscreen = () => {
  // Вызов Telegram WebApp Fullscreen и установка safe-area
  useEffect(() => {
    console.log('🖥️ useFullscreen: Инициализация полноэкранного режима...');
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      console.log('✅ useFullscreen: Telegram WebApp найден');
      console.log('📱 useFullscreen: Platform:', (tg as any).platform);
      console.log('📱 useFullscreen: Version:', (tg as any).version);
      console.log('📱 useFullscreen: Is Expanded:', (tg as any).isExpanded);
      
      try {
        console.log('🔄 useFullscreen: Вызываем tg.ready()...');
        tg.ready();
        console.log('✅ useFullscreen: tg.ready() выполнен');
        
        // Safe area
        if (tg.safeAreaInset) {
          console.log('📐 useFullscreen: Safe area insets:', tg.safeAreaInset);
          document.documentElement.style.setProperty('--safe-top', `${tg.safeAreaInset.top}px`);
          document.documentElement.style.setProperty('--safe-bottom', `${tg.safeAreaInset.bottom}px`);
          console.log('✅ useFullscreen: Safe area переменные установлены');
        } else {
          console.log('⚠️ useFullscreen: Safe area insets недоступны');
        }
        
        // Fullscreen
        if (typeof tg.requestFullscreen === 'function') {
          console.log('🖥️ useFullscreen: Запрашиваем полноэкранный режим...');
          const res = tg.requestFullscreen();
          if (res && typeof res.then === 'function') {
            res.then(() => {
              console.log('✅ useFullscreen: Полноэкранный режим активирован');
            }).catch((e: any) => {
              console.warn('❌ useFullscreen: Telegram requestFullscreen error:', e);
            });
          } else {
            console.log('✅ useFullscreen: requestFullscreen вызван (синхронно)');
          }
        } else {
          console.log('⚠️ useFullscreen: requestFullscreen недоступен');
        }
        
        // Расширяем WebApp если не в полноэкранном режиме
        if (!(tg as any).isExpanded && typeof (tg as any).expand === 'function') {
          console.log('📱 useFullscreen: Расширяем WebApp...');
          try {
            (tg as any).expand();
            console.log('✅ useFullscreen: WebApp расширен');
          } catch (e) {
            console.warn('⚠️ useFullscreen: Ошибка расширения WebApp:', e);
          }
        }
        
      } catch (e) {
        console.error('❌ useFullscreen: Telegram WebApp fullscreen/init error:', e);
      }
    } else {
      console.log('ℹ️ useFullscreen: Telegram WebApp недоступен, работаем в обычном режиме');
    }
  }, []);

  // Выход из fullscreen для Telegram
  const exitFullscreen = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.exitFullscreen === 'function') {
      console.log('🔄 useFullscreen: Выход из полноэкранного режима');
      tg.exitFullscreen();
    }
  }, []);

  return { exitFullscreen };
}; 