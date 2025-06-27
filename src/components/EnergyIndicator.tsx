import React from 'react'

interface EnergyIndicatorProps {
  hyperdriveCharge: number
  isHyperdriveActive: boolean
}

export const EnergyIndicator: React.FC<EnergyIndicatorProps> = ({ 
  hyperdriveCharge,
  isHyperdriveActive
}) => {
  // Функция для определения цвета на основе заряда
  const getChargeColor = (charge: number) => {
    if (charge >= 100) return 'rgb(0, 255, 136)'; // Полный заряд - зеленый
    if (charge >= 75) return 'rgb(150, 255, 136)';
    if (charge >= 50) return 'rgb(255, 255, 0)';
    if (charge >= 25) return 'rgb(255, 165, 0)';
    return 'rgb(255, 0, 0)'; // Минимальный заряд - красный
  };

  const chargeColor = getChargeColor(hyperdriveCharge);

  return (
    <div className="absolute right-4 sm:right-6 top-20 z-20">
      <div className="cyber-panel p-3 sm:p-4">
        <div className="text-center">
          <div className="text-sm sm:text-base opacity-70 mb-1">
            Заряд гипердвигателя
          </div>
          <div 
            className="text-xl sm:text-2xl font-bold"
            style={{ color: chargeColor }}
          >
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