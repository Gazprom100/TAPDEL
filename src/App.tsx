import React, { useState } from 'react'
import { TapButton } from './components/TapButton'
import { Profile } from './components/Profile'
import { useGameStore } from './store/gameStore'
import './styles/effects.css'

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { tokens, highScore } = useGameStore()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="cyber-text text-sm mb-2">HIGH SCORE</div>
          <div className="cyber-text text-xl">{Math.floor(highScore)}</div>
        </div>
        
        <TapButton />
        
        <div className="text-center">
          <div className="cyber-text text-sm mb-2">TOKENS</div>
          <div className="cyber-text text-xl">{Math.floor(tokens)}</div>
        </div>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="cyber-text text-xl border border-[var(--glow-color)] px-6 py-2 rounded hover:bg-[var(--glow-color)] hover:text-black transition-colors"
        >
          ПРОФИЛЬ
        </button>
      </div>

      {isProfileOpen && <Profile onClose={() => setIsProfileOpen(false)} />}
    </div>
  )
}

export default App 