import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import '../styles/effects.css';

type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

export const TapButton: React.FC = () => {
  const { addTokens, energy, setEnergy } = useGameStore();
  const [gear, setGear] = useState<Gear>('N');
  const [taps, setTaps] = useState<number[]>([]);
  const [isCharging, setIsCharging] = useState(false);

  // Расчет передачи на основе частоты нажатий
  const calculateGear = useCallback((tapHistory: number[]) => {
    if (tapHistory.length < 2) return 'N';
    
    const now = Date.now();
    const recentTaps = tapHistory.filter(tap => now - tap < 1000);
    const tapFrequency = recentTaps.length;
    
    if (tapFrequency >= 8) return 'M';
    if (tapFrequency >= 6) return '4';
    if (tapFrequency >= 4) return '3';
    if (tapFrequency >= 2) return '2';
    if (tapFrequency >= 1) return '1';
    return 'N';
  }, []);

  // Получение множителя токенов на основе передачи
  const getGearMultiplier = (currentGear: Gear): number => {
    const multipliers: Record<Gear, number> = {
      'N': 0.5,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      'M': 5
    };
    return multipliers[currentGear];
  };

  // Обработка нажатия
  const handleTap = useCallback(() => {
    if (energy <= 0) return;

    const now = Date.now();
    const newTaps = [...taps.filter(tap => now - tap < 1000), now];
    setTaps(newTaps);
    
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    // Добавление токенов с учетом передачи и энергии
    const gearMultiplier = getGearMultiplier(newGear);
    const energyMultiplier = energy / 100;
    const tokensToAdd = gearMultiplier * energyMultiplier;
    
    addTokens(tokensToAdd);
    
    // Уменьшение энергии в зависимости от передачи
    const energyCost = gearMultiplier * 2;
    setEnergy(Math.max(0, energy - energyCost));
    
    setIsCharging(false);
  }, [taps, energy, addTokens, setEnergy, calculateGear]);

  // Восстановление энергии
  useEffect(() => {
    const energyRecoveryInterval = setInterval(() => {
      if (taps.length === 0 || Date.now() - Math.max(...taps) > 1000) {
        setEnergy(Math.min(100, energy + 0.5));
        setIsCharging(true);
      }
    }, 50);

    return () => clearInterval(energyRecoveryInterval);
  }, [energy, taps, setEnergy]);

  // Очистка старых тапов
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTaps(prev => {
        const newTaps = prev.filter(tap => now - tap < 1000);
        if (newTaps.length === 0) {
          setGear('N');
        }
        return newTaps;
      });
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <div className={`cyber-container gear-${gear}`}>
      <div className="power-display">
        <div className="power-ring" />
        <div className="power-value">{Math.round(energy)}</div>
        <div className="gear-indicator">{gear}</div>
      </div>

      <div className="status-indicators">
        <div>
          <div>WATT</div>
          <div className="status-bar" />
        </div>
        <div>
          <div>POWER</div>
          <div className="status-bar" />
        </div>
      </div>

      {isCharging && (
        <div className="charging-indicator">
          <div className="charging-dot" />
          <div className="charging-dot" />
          <div className="charging-dot" />
        </div>
      )}

      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleTap}
      />
    </div>
  );
}; 