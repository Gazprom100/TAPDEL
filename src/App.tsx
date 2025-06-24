import { useEffect, useState } from 'react'
import { TapButton } from './components/TapButton'
import { EnergyIndicator } from './components/EnergyIndicator'
import { TokenCounter } from './components/TokenCounter'
import { useGameStore } from './stores/gameStore'
import { initializeTelegramBot } from './utils/telegram'

function App() {
  const { energy, tokens, addTokens, useEnergy } = useGameStore()
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true)

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
    <div className="min-h-screen bg-black text-neon-green flex flex-col items-center justify-center p-4">
      <TokenCounter tokens={tokens} />
      <EnergyIndicator energy={energy} />
      <TapButton onTap={handleTap} disabled={energy <= 0} />
    </div>
  )
}

export default App 