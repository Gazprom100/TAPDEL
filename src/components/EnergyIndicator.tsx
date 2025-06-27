import React from 'react'

interface EnergyIndicatorProps {
  hyperdriveCharge: number
  isHyperdriveActive: boolean
}

export const EnergyIndicator: React.FC<EnergyIndicatorProps> = ({ 
  hyperdriveCharge,
  isHyperdriveActive
}) => {
  return (
    <div className="absolute right-4 sm:right-6 top-20 z-20">
      <div className="cyber-panel p-3 sm:p-4">
        <div className="text-center">
          <div className="text-sm sm:text-base opacity-70 mb-1">
            Заряд гипердвигателя
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#00ff88]">
            {Math.floor(hyperdriveCharge)}%
          </div>
          {isHyperdriveActive && (
            <div className="text-xs sm:text-sm text-[#ffcc00] mt-1">
              Активен (x2)
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 