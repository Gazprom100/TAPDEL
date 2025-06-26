import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMPONENTS } from '../types/game';
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
  const { 
    addTokens, 
    fuelLevel, 
    setFuelLevel,
    engineLevel,
    gearboxLevel,
    batteryLevel,
    hyperdriveLevel,
    powerGridLevel
  } = useGameStore();
  
  const [gear, setGear] = useState<Gear>('N');
  const [taps, setTaps] = useState<number[]>([]);
  const [isCharging, setIsCharging] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [temperature, setTemperature] = useState(20);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState(false);

  // Получаем текущие компоненты
  const currentEngine = COMPONENTS.ENGINES.find(e => e.level === engineLevel)!;
  const currentGearbox = COMPONENTS.GEARBOXES.find(g => g.level === gearboxLevel)!;
  const currentBattery = COMPONENTS.BATTERIES.find(b => b.level === batteryLevel)!;
  const currentHyperdrive = COMPONENTS.HYPERDRIVES.find(h => h.level === hyperdriveLevel)!;
  const currentPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === powerGridLevel)!;

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
    if (fuelLevel <= 0) return;
    if (temperature >= currentEngine.maxTemp) return;

    const now = Date.now();
    const newTaps = [...taps.filter(tap => now - tap < 1000), now];
    setTaps(newTaps);
    
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    // Обновление интенсивности и температуры
    const newIntensity = calculateIntensity(newGear);
    setIntensity(newIntensity);
    setTemperature((prev: number) => Math.min(
      currentEngine.maxTemp,
      prev + (newIntensity / 100) * currentEngine.power
    ));
    
    // Расчет множителей
    const gearMultiplier = currentGearbox.gear;
    const energyMultiplier = fuelLevel / 100;
    const efficiencyMultiplier = currentPowerGrid.efficiency / 100;
    const hyperdriveMultiplier = isHyperdriveActive ? currentHyperdrive.speedMultiplier : 1;
    
    // Добавление токенов с учетом всех множителей
    const baseTokens = currentEngine.power * gearMultiplier * energyMultiplier;
    const totalTokens = baseTokens * efficiencyMultiplier * hyperdriveMultiplier;
    
    addTokens(totalTokens);
    
    // Расчет потребления энергии
    const baseCost = ENERGY_CONSUMPTION_RATE[newGear];
    const hyperdriveCost = isHyperdriveActive ? currentHyperdrive.energyConsumption : 0;
    const totalCost = (baseCost / currentEngine.fuelEfficiency) + hyperdriveCost;
    
    setFuelLevel(Math.max(0, fuelLevel - totalCost));
    setIsCharging(false);
  }, [
    taps, 
    fuelLevel, 
    temperature,
    currentEngine,
    currentGearbox,
    currentPowerGrid,
    currentHyperdrive,
    isHyperdriveActive,
    addTokens, 
    setFuelLevel
  ]);

  // Восстановление энергии и охлаждение
  useEffect(() => {
    const recoveryInterval = setInterval(() => {
      const now = Date.now();
      const isIdle = taps.length === 0 || now - Math.max(...taps) > 1000;

      if (isIdle) {
        // Восстановление энергии
        const chargeRate = currentBattery.chargeRate * (currentPowerGrid.efficiency / 100);
        setFuelLevel(Math.min(currentBattery.capacity, fuelLevel + chargeRate));
        
        // Охлаждение
        setTemperature((prev: number) => Math.max(20, prev - 1));
        
        // Отключение гипердвигателя при низком заряде
        if (fuelLevel < currentHyperdrive.activationThreshold && isHyperdriveActive) {
          setIsHyperdriveActive(false);
        }

        setIsCharging(true);
        setIntensity(Math.max(0, intensity - 5));
      }
    }, 50);

    return () => clearInterval(recoveryInterval);
  }, [
    fuelLevel,
    taps,
    intensity,
    currentBattery,
    currentPowerGrid,
    currentHyperdrive,
    isHyperdriveActive
  ]);

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
        <div className="power-value">{Math.round(fuelLevel)}</div>
        <div className="gear-indicator">{gear}</div>
        
        <div className="power-indicators">
          <div className="power-bar left" />
          <div className="power-bar right" />
          <div className="power-bar top" />
          <div className="power-bar bottom" />
        </div>
      </div>

      {/* Статистика компонентов */}
      <div className="absolute top-4 left-4 space-y-2 text-xs">
        <div className="cyber-text">
          {currentEngine.level} • {currentEngine.power}W • {Math.round(temperature)}°C
        </div>
        <div className="cyber-text">
          {currentGearbox.level} • {currentGearbox.gear}x • {currentGearbox.switchTime}ms
        </div>
        <div className="cyber-text">
          {currentBattery.level} • {currentBattery.capacity}% • {currentBattery.chargeRate}%/s
        </div>
      </div>

      <div className="absolute top-4 right-4 space-y-2 text-xs">
        <div className="cyber-text">
          {currentPowerGrid.level} • {currentPowerGrid.efficiency}% • {currentPowerGrid.maxLoad}W
        </div>
        <div className={`cyber-text ${isHyperdriveActive ? 'text-[#ff00ff]' : ''}`}>
          {currentHyperdrive.level} • {currentHyperdrive.speedMultiplier}x
        </div>
      </div>

      <div className="status-indicators">
        <div>
          <div className="cyber-text">TEMP</div>
          <div 
            className="status-bar" 
            style={{
              background: `linear-gradient(to right, var(--glow-color) ${(temperature / currentEngine.maxTemp) * 100}%, transparent 0)`
            }}
          />
        </div>
        <div>
          <div className="cyber-text">LOAD</div>
          <div 
            className="status-bar"
            style={{
              background: `linear-gradient(to right, var(--glow-color) ${(intensity / 100) * 100}%, transparent 0)`
            }}
          />
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

      {/* Кнопка гипердвигателя */}
      {fuelLevel >= currentHyperdrive.activationThreshold && (
        <button
          className={`absolute bottom-4 right-4 cyber-button ${isHyperdriveActive ? 'bg-[#ff00ff]' : ''}`}
          onClick={() => setIsHyperdriveActive(!isHyperdriveActive)}
        >
          HYPERDRIVE
        </button>
      )}

      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleTap}
      />
    </div>
  );
};