import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMPONENTS } from '../types/game';
import { useFullscreen } from '../hooks/useFullscreen';
import '../styles/effects.css';

type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

const ENERGY_CONSUMPTION_RATE = {
  'N': 0.01,  // 0.01% в секунду
  '1': 0.02,  // 0.02% в секунду
  '2': 0.04,  // 0.04% в секунду
  '3': 0.08,  // 0.08% в секунду
  '4': 0.16,  // 0.16% в секунду
  'M': 0.33   // 0.33% в секунду (примерно 100% за 300 секунд при максимальной нагрузке)
};

const BASE_TOKEN_REWARD = 1; // Базовая награда за один тап

const GEAR_MULTIPLIERS = {
  'N': 0,    // Нейтраль не дает токенов
  '1': 1,    // Базовый множитель
  '2': 1.5,  // +50% токенов
  '3': 2,    // в 2 раза больше токенов
  '4': 3,    // в 3 раза больше токенов
  'M': 5     // в 5 раз больше токенов
};

export const TapButton: React.FC = () => {
  useFullscreen();

  const { 
    addTokens, 
    tokens,
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
  const [tapRate, setTapRate] = useState(0);
  const [lastTapRate, setLastTapRate] = useState(0);
  const [tapRateHistory, setTapRateHistory] = useState<number[]>([]);
  const [activeTouches, setActiveTouches] = useState(new Set<number>());

  // Устанавливаем начальный уровень топлива при монтировании
  useEffect(() => {
    setFuelLevel(100);
  }, [setFuelLevel]);

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
    
    if (tapFrequency >= 20) return 'M';  // Увеличили порог для максимальной передачи
    if (tapFrequency >= 15) return '4';
    if (tapFrequency >= 10) return '3';
    if (tapFrequency >= 5) return '2';
    if (tapFrequency >= 1) return '1';
    return 'N';
  }, []);

  // Проверка стабильности скорости тапания
  const isTapRateStable = useCallback((history: number[]) => {
    if (history.length < 3) return false;
    const last3Rates = history.slice(-3);
    const average = last3Rates.reduce((a, b) => a + b, 0) / 3;
    return last3Rates.every(rate => Math.abs(rate - average) <= 1);
  }, []);

  const calculateTokenReward = useCallback((
    gear: Gear,
    touchCount: number,
    engine: typeof currentEngine,
    gearbox: typeof currentGearbox,
    powerGrid: typeof currentPowerGrid,
    hyperdrive: typeof currentHyperdrive,
    isHyperActive: boolean
  ) => {
    // Базовая награда за тап
    let reward = BASE_TOKEN_REWARD;

    // Множитель от количества пальцев (линейный рост)
    const touchMultiplier = touchCount;

    // Множитель от текущей передачи
    const gearMultiplier = GEAR_MULTIPLIERS[gear];

    // Множитель от уровня двигателя (каждый уровень +20% к базовой награде)
    const engineMultiplier = 1 + (Number(engine.level) * 0.2);

    // Множитель от уровня коробки передач (каждый уровень +10% к базовой награде)
    const gearboxMultiplier = 1 + (Number(gearbox.level) * 0.1);

    // Множитель от эффективности энергосети
    const gridMultiplier = powerGrid.efficiency / 100;

    // Множитель от гипердвигателя
    const hyperdriveMultiplier = isHyperActive ? hyperdrive.speedMultiplier : 1;

    // Применяем все множители
    reward = reward * touchMultiplier;  // Умножаем на количество пальцев
    reward = reward * gearMultiplier;   // Умножаем на множитель передачи
    reward = reward * engineMultiplier;  // Умножаем на множитель двигателя
    reward = reward * gearboxMultiplier; // Умножаем на множитель коробки передач
    reward = reward * gridMultiplier;    // Умножаем на эффективность сети
    reward = reward * hyperdriveMultiplier; // Умножаем на множитель гипердвигателя

    return Math.max(0, reward); // Не может быть меньше 0
  }, []);

  // Обработка множественных касаний
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const newTouches = new Set(activeTouches);
    Array.from(e.changedTouches).forEach(touch => {
      newTouches.add(touch.identifier);
    });
    setActiveTouches(newTouches);

    const now = Date.now();
    const newTaps = [...taps.filter(tap => now - tap < 1000), now];
    setTaps(newTaps);
    
    const currentTapRate = newTaps.length;
    setLastTapRate(tapRate);
    setTapRate(currentTapRate);
    
    const newTapRateHistory = [...tapRateHistory.slice(-9), currentTapRate];
    setTapRateHistory(newTapRateHistory);
    
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    const newIntensity = calculateIntensity(newGear);
    setIntensity(newIntensity);

    // Перегрев только при стабильной скорости тапания
    if (isTapRateStable(newTapRateHistory) && currentTapRate > 0) {
      setTemperature(prev => Math.min(
        currentEngine.maxTemp,
        prev + (newIntensity / 100) * currentEngine.power
      ));
    }
    
    if (fuelLevel <= 0) return;

    // Рассчитываем награду в токенах
    const tokenReward = calculateTokenReward(
      newGear,
      newTouches.size,
      currentEngine,
      currentGearbox,
      currentPowerGrid,
      currentHyperdrive,
      isHyperdriveActive
    );
    
    // Добавляем токены
    if (tokenReward > 0) {
      addTokens(tokenReward);
    }
    
    // Расчет потребления энергии
    const baseCost = ENERGY_CONSUMPTION_RATE[newGear];
    const touchMultiplier = Math.min(newTouches.size, 5);
    const hyperdriveCost = isHyperdriveActive ? currentHyperdrive.energyConsumption : 0;
    const totalCost = ((baseCost * touchMultiplier) / currentEngine.fuelEfficiency) + hyperdriveCost;
    
    setFuelLevel(Math.max(0, fuelLevel - totalCost));
    setIsCharging(false);
  }, [
    taps, fuelLevel, temperature, tapRate, lastTapRate, 
    activeTouches, tapRateHistory, calculateTokenReward,
    currentEngine, currentGearbox, currentPowerGrid, 
    currentHyperdrive, isHyperdriveActive, addTokens
  ]);

  // Обработка окончания касания
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const newTouches = new Set(activeTouches);
    Array.from(e.changedTouches).forEach(touch => {
      newTouches.delete(touch.identifier);
    });
    setActiveTouches(newTouches);
  }, [activeTouches]);

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
        setTemperature(prev => Math.max(20, prev - 1));
        
        // Отключение гипердвигателя при низком заряде
        if (fuelLevel < currentHyperdrive.activationThreshold && isHyperdriveActive) {
          setIsHyperdriveActive(false);
        }

        setIsCharging(true);
        setIntensity(Math.max(0, intensity - 5));
        setTapRate(0);
        setLastTapRate(0);
      }
    }, 50);

    return () => clearInterval(recoveryInterval);
  }, [fuelLevel, taps, intensity]);

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
    <div 
      className={`cyber-container gear-${gear} intensity-${Math.floor(intensity / 10) * 10} ${isHyperdriveActive ? 'hyperdrive-active' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="cyber-background-effects">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="cyber-glitch" />
        <div className="cyber-vignette" />
      </div>

      <div className="token-counter">
        <div className="token-value">{Math.floor(tokens)}</div>
        <div className="token-label">Tokens</div>
      </div>

      <div className="stats-container">
        <div className="stats-left">
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

        <div className="stats-right">
          <div className="cyber-text">
            {currentPowerGrid.level} • {currentPowerGrid.efficiency}% • {currentPowerGrid.maxLoad}W
          </div>
          <div className={`cyber-text ${isHyperdriveActive ? 'text-[#ff00ff]' : ''}`}>
            {currentHyperdrive.level} • {currentHyperdrive.speedMultiplier}x
          </div>
        </div>
      </div>

      <div className="power-display">
        <div className="power-ring" />
        <div className="power-ring-outer" />
        <div className="power-ring-inner" />
        <div className="fuel-display">
          <div className="fuel-value">{Math.round(fuelLevel)}</div>
          <div className="gear-indicator">{gear}</div>
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

      {fuelLevel >= currentHyperdrive.activationThreshold && (
        <button
          className={`hyperdrive-button cyber-button ${isHyperdriveActive ? 'bg-[#ff00ff]' : ''}`}
          onClick={() => setIsHyperdriveActive(!isHyperdriveActive)}
        >
          HYPERDRIVE
        </button>
      )}

      <button className="profile-button cyber-button">
        ПРОФИЛЬ
      </button>

      <div 
        className="absolute inset-0 cursor-pointer" 
      />
    </div>
  );
};