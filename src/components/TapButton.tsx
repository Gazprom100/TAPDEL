import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import '../styles/effects.css';

type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

const ENERGY_CONSUMPTION_RATE = {
  'N': 0.1,  // 0.1% в секунду
  '1': 0.2,  // 0.2% в секунду
  '2': 0.4,  // 0.4% в секунду
  '3': 0.6,  // 0.6% в секунду
  '4': 0.8,  // 0.8% в секунду
  'M': 0.833  // ~0.833% в секунду (100% за 120 секунд)
};

export const TapButton: React.FC = () => {
  const { addTokens, energy, setEnergy } = useGameStore();
  const [gear, setGear] = useState<Gear>('N');
  const [taps, setTaps] = useState<number[]>([]);
  const [isCharging, setIsCharging] = useState(false);
  const [intensity, setIntensity] = useState(0); // 0-100

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

  // Расчет интенсивности для визуальных эффектов
  const calculateIntensity = useCallback((currentGear: Gear) => {
    const intensityMap = {
      'N': 0,
      '1': 20,
      '2': 40,
      '3': 60,
      '4': 80,
      'M': 100
    };
    return intensityMap[currentGear];
  }, []);

  // Обработка нажатия
  const handleTap = useCallback(() => {
    if (energy <= 0) return;

    const now = Date.now();
    const newTaps = [...taps.filter(tap => now - tap < 1000), now];
    setTaps(newTaps);
    
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    // Обновление интенсивности
    const newIntensity = calculateIntensity(newGear);
    setIntensity(newIntensity);
    
    // Добавление токенов с учетом передачи и энергии
    const gearMultiplier = {
      'N': 0.5,
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      'M': 5
    }[newGear];
    
    const energyMultiplier = energy / 100;
    const tokensToAdd = gearMultiplier * energyMultiplier;
    
    addTokens(tokensToAdd);
    
    // Уменьшение энергии в зависимости от передачи
    const energyCost = ENERGY_CONSUMPTION_RATE[newGear];
    setEnergy(Math.max(0, energy - energyCost));
    
    setIsCharging(false);
  }, [taps, energy, addTokens, setEnergy, calculateGear]);

  // Восстановление энергии
  useEffect(() => {
    const energyRecoveryInterval = setInterval(() => {
      if (taps.length === 0 || Date.now() - Math.max(...taps) > 1000) {
        setEnergy(Math.min(100, energy + 0.1));
        setIsCharging(true);
        setIntensity(Math.max(0, intensity - 5)); // Плавное угасание эффектов
      }
    }, 50);

    return () => clearInterval(energyRecoveryInterval);
  }, [energy, taps, intensity, setEnergy]);

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
    <div className={`cyber-container gear-${gear} intensity-${Math.floor(intensity / 10) * 10}`}>
      <div className="cyber-background-effects">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="cyber-glitch" />
        <div className="cyber-vignette" />
      </div>

      <div className="power-display">
        <div className="power-ring" />
        <div className="power-ring-outer" />
        <div className="power-ring-inner" />
        <div className="power-value">{Math.round(energy)}</div>
        <div className="gear-indicator">{gear}</div>
        
        <div className="power-indicators">
          <div className="power-bar left" />
          <div className="power-bar right" />
          <div className="power-bar top" />
          <div className="power-bar bottom" />
        </div>
      </div>

      <div className="status-indicators">
        <div>
          <div className="cyber-text">WATT</div>
          <div className="status-bar" />
          <div className="status-particles" />
        </div>
        <div>
          <div className="cyber-text">POWER</div>
          <div className="status-bar" />
          <div className="status-particles" />
        </div>
      </div>

      {isCharging && (
        <div className="charging-indicator">
          <div className="charging-dot" />
          <div className="charging-dot" />
          <div className="charging-dot" />
        </div>
      )}

      <div className="intensity-meter">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`intensity-bar ${intensity >= (i + 1) * 10 ? 'active' : ''}`}
          />
        ))}
      </div>

      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleTap}
      />
    </div>
  );
}; 