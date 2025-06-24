import React from 'react'
import { TapButton } from './components/TapButton'
import { useGameStore } from './store/gameStore'
import './styles/effects.css'

const App: React.FC = () => {
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
      </div>
      
      <div className="cyber-container mt-8">
        <div className="cyber-text text-sm">CYBER FLEX v1.0</div>
        <div className="cyber-text text-xs mt-2">ELECTRON SERIES</div>
      </div>
    </div>
  )
}

export default App 