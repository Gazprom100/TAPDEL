import React, { useState, useEffect } from 'react'
import { TapButton } from './components/TapButton'
import { Profile } from './components/Profile'
import { useGameStore } from './store/gameStore'
import './styles/effects.css'

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { tokens, highScore } = useGameStore();

  // Предотвращаем нежелательные жесты браузера
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    // Отключаем все жесты браузера по умолчанию
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });
    document.addEventListener('gesturestart', preventDefault, { passive: false });
    document.addEventListener('gesturechange', preventDefault, { passive: false });
    document.addEventListener('gestureend', preventDefault, { passive: false });

    // Запрещаем двойной тап для зума
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('gestureend', preventDefault);
    };
  }, []);

  return (
    <div 
      className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        height: '100vh',
        minHeight: '-webkit-fill-available',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.1)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]" />

      {/* Основной контент */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Верхняя панель */}
        <div className="cyber-panel w-full">
          <div className="text-center">
            <div className="cyber-text text-sm mb-2">РЕКОРД</div>
            <div className="cyber-text text-2xl">{Math.floor(highScore)}</div>
          </div>
        </div>

        {/* Кнопка тапа */}
        <TapButton />

        {/* Нижняя панель */}
        <div className="cyber-panel w-full">
          <div className="text-center">
            <div className="cyber-text text-sm mb-2">ТОКЕНЫ</div>
            <div className="cyber-text text-2xl">{Math.floor(tokens)}</div>
          </div>
        </div>

        {/* Кнопка профиля */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="cyber-button w-full"
          style={{ touchAction: 'manipulation' }}
        >
          ПРОФИЛЬ
        </button>
      </div>

      {/* Модальное окно профиля */}
      {isProfileOpen && <Profile onClose={() => setIsProfileOpen(false)} />}
    </div>
  )
}

export default App 