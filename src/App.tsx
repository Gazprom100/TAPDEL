import { useEffect, useState } from 'react'
import { TapButton } from './components/TapButton'
import { EnergyIndicator } from './components/EnergyIndicator'
import { TokenCounter } from './components/TokenCounter'
import { useGameStore } from './stores/gameStore'
import { initializeTelegramBot } from './utils/telegram'

function App() {
  const { energy, tokens, addTokens, useEnergy } = useGameStore()
  const [isVibrationEnabled, _setIsVibrationEnabled] = useState(true)

  const handleTap = () => {
    if (energy > 0) {
      useEnergy()
      addTokens(1)
      
      if (isVibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }
  }

  useEffect(() => {
    // Initialize Telegram bot
    initializeTelegramBot()
    
    // Other initialization code...
  }, [])

  return (
    <div className="min-h-screen bg-cyber-gradient text-neon-green flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Фоновый эффект */}
      <div className="absolute inset-0 bg-cyber-gradient opacity-80" />
      
      {/* Основной контент */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold text-neon-green mb-8 animate-pulse-neon">
          TAPDEL
        </h1>
        
        <TokenCounter tokens={tokens} />
        <EnergyIndicator energy={energy} />
        <TapButton onTap={handleTap} disabled={energy <= 0} />
      </div>
    </div>
  )
}

export default App 