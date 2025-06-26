import React, { useState } from 'react'
import { TapButton } from './components/TapButton'
import { Profile } from './components/Profile'
import { useGameStore } from './store/gameStore'
import './styles/effects.css'

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { tokens, highScore } = useGameStore()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
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