import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMPONENTS, GAME_MECHANICS } from '../types/game';
import { useFullscreen } from '../hooks/useFullscreen';
import '../styles/effects.css';

type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

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
  const [temperature, setTemperature] = useState(GAME_MECHANICS.TEMPERATURE.MIN);
  const [hyperdriveEnergy, setHyperdriveEnergy] = useState(0);
  const [hyperdriveCharging, setHyperdriveCharging] = useState(false);
  const [hyperdriveReadiness, setHyperdriveReadiness] = useState(0);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState(false);
  const [activeTouches, setActiveTouches] = useState(new Set<number>());

  // Получаем текущие компоненты
  const currentEngine = COMPONENTS.ENGINES.find(e => e.level === engineLevel)!;
  const currentGearbox = COMPONENTS.GEARBOXES.find(g => g.level === gearboxLevel)!;
  const currentBattery = COMPONENTS.BATTERIES.find(b => b.level === batteryLevel)!;
  const currentHyperdrive = COMPONENTS.HYPERDRIVES.find(h => h.level === hyperdriveLevel)!;
  const currentPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === powerGridLevel)!;

  // Расчет передачи на основе частоты нажатий
  const calculateGear = useCallback((tapHistory: number[]): Gear => {
    if (tapHistory.length < 2) return 'N';
    
    const now = Date.now();
    const recentTaps = tapHistory.filter(tap => now - tap < GAME_MECHANICS.TAP.RATE_WINDOW);
    const tapFrequency = recentTaps.length;
    
    if (tapFrequency >= GAME_MECHANICS.GEAR.THRESHOLDS.M) return 'M';
    if (tapFrequency >= GAME_MECHANICS.GEAR.THRESHOLDS['4']) return '4';
    if (tapFrequency >= GAME_MECHANICS.GEAR.THRESHOLDS['3']) return '3';
    if (tapFrequency >= GAME_MECHANICS.GEAR.THRESHOLDS['2']) return '2';
    if (tapFrequency >= GAME_MECHANICS.GEAR.THRESHOLDS['1']) return '1';
    return 'N';
  }, []);

  // Накопление энергии для гипердвигателя от тапов
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();
    const touchCount = Math.min(e.touches.length, GAME_MECHANICS.TAP.MAX_FINGERS);
    
    // Обновляем активные касания
    const newTouches = new Set(activeTouches);
    Array.from(e.changedTouches).forEach(touch => {
      newTouches.add(touch.identifier);
    });
    setActiveTouches(newTouches);
    
    // Добавляем все тапы
    setTaps(prev => [...prev, now]);
    
    // Обновляем состояние
    const newGear = calculateGear([...taps, now]);
    setGear(newGear);
    
    // Накапливаем энергию для гипердвигателя
    if (!isHyperdriveActive && fuelLevel > 0) {
      const energyGain = touchCount * GAME_MECHANICS.GEAR.MULTIPLIERS[newGear] * (currentPowerGrid.efficiency / 100);
      setHyperdriveEnergy((prev: number) => Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, prev + energyGain));
    }
    
    // Рассчитываем и добавляем награду в токенах
    if (touchCount !== activeTouches.size) {
      const reward = GAME_MECHANICS.TAP.BASE_REWARD * 
        touchCount * 
        GAME_MECHANICS.GEAR.MULTIPLIERS[newGear] * 
        (1 + (currentEngine.power / 100)) * 
        (1 + (currentGearbox.gear / 10)) * 
        (currentPowerGrid.efficiency / 100) * 
        (isHyperdriveActive ? currentHyperdrive.speedMultiplier : 1);
      
      // Добавляем токены только если есть топливо
      if (fuelLevel > 0) {
        addTokens(reward);
        
        // Расчет потребления топлива
        const baseCost = GAME_MECHANICS.ENERGY.CONSUMPTION_RATE[newGear];
        const touchMultiplier = Math.min(touchCount, GAME_MECHANICS.TAP.MAX_FINGERS);
        const totalCost = (baseCost * touchMultiplier) / currentEngine.fuelEfficiency;
        
        setFuelLevel((prev: number) => Math.max(GAME_MECHANICS.ENERGY.MIN_LEVEL, prev - totalCost));
        setIsCharging(false);
      }
    }
    
    // Обновляем интенсивность
    setIntensity(prev => Math.min(100, prev + 5 * touchCount));
  }, [taps, calculateGear, currentEngine, currentGearbox, currentPowerGrid, currentHyperdrive, isHyperdriveActive, fuelLevel, addTokens, activeTouches]);

  // Обработка состояния гипердвигателя
  useEffect(() => {
    let chargeInterval: NodeJS.Timeout;
    
    if (hyperdriveEnergy >= currentHyperdrive.activationThreshold && !isHyperdriveActive) {
      setHyperdriveCharging(true);
      chargeInterval = setInterval(() => {
        setHyperdriveReadiness(prev => {
          const next = Math.min(100, prev + GAME_MECHANICS.HYPERDRIVE.CHARGE_RATE);
          if (next === 100) {
            setHyperdriveCharging(false);
          }
          return next;
        });
      }, GAME_MECHANICS.HYPERDRIVE.CHARGE_INTERVAL);
    } else {
      setHyperdriveCharging(false);
      setHyperdriveReadiness(0);
    }

    return () => {
      if (chargeInterval) {
        clearInterval(chargeInterval);
      }
    };
  }, [hyperdriveEnergy, currentHyperdrive.activationThreshold, isHyperdriveActive]);

  // Потребление энергии гипердвигателем
  useEffect(() => {
    let consumptionInterval: NodeJS.Timeout;
    
    if (isHyperdriveActive) {
      consumptionInterval = setInterval(() => {
        setHyperdriveEnergy(prev => {
          const newEnergy = prev - currentHyperdrive.energyConsumption;
          if (newEnergy <= GAME_MECHANICS.ENERGY.MIN_LEVEL) {
            setIsHyperdriveActive(false);
            return GAME_MECHANICS.ENERGY.MIN_LEVEL;
          }
          return newEnergy;
        });
      }, GAME_MECHANICS.HYPERDRIVE.CONSUMPTION_INTERVAL);
    }

    return () => {
      if (consumptionInterval) {
        clearInterval(consumptionInterval);
      }
    };
  }, [isHyperdriveActive, currentHyperdrive.energyConsumption]);

  // Восстановление энергии и охлаждение
  useEffect(() => {
    const recoveryInterval = setInterval(() => {
      const now = Date.now();
      const isIdle = taps.length === 0 || now - Math.max(...taps) > GAME_MECHANICS.TAP.RATE_WINDOW;

      if (isIdle) {
        // Восстановление энергии
        const chargeRate = currentBattery.chargeRate * (currentPowerGrid.efficiency / 100);
        setFuelLevel((prev: number) => Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, prev + chargeRate));
        
        // Охлаждение
        setTemperature(prev => Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prev - GAME_MECHANICS.TEMPERATURE.COOLING_RATE));
        
        setIsCharging(true);
        setIntensity(prev => Math.max(0, prev - 5));
      } else {
        setIsCharging(false);
      }
    }, GAME_MECHANICS.ENERGY.RECOVERY_INTERVAL);

    return () => clearInterval(recoveryInterval);
  }, [taps, currentBattery.chargeRate, currentPowerGrid.efficiency]);

  // Активация гипердвигателя
  const activateHyperdrive = useCallback(() => {
    if (hyperdriveEnergy < currentHyperdrive.activationThreshold) {
      return;
    }

    if (!isHyperdriveActive && hyperdriveReadiness === 100) {
      setIsHyperdriveActive(true);
      setHyperdriveReadiness(0);
    } else if (isHyperdriveActive) {
      setIsHyperdriveActive(false);
    }
  }, [hyperdriveEnergy, currentHyperdrive.activationThreshold, isHyperdriveActive, hyperdriveReadiness]);

  return (
    <div 
      className={`cyber-container gear-${gear} intensity-${Math.floor(intensity / 10) * 10} ${isHyperdriveActive ? 'hyperdrive-active' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => {}}
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

      <div className="hyperdrive-control">
        <div className="hyperdrive-energy-bar">
          <div 
            className={`
              hyperdrive-energy-fill
              ${hyperdriveEnergy < currentHyperdrive.activationThreshold ? 'low' :
                hyperdriveEnergy < currentHyperdrive.activationThreshold * 2 ? 'medium' : 'high'}
            `}
            style={{ width: `${(hyperdriveEnergy / GAME_MECHANICS.ENERGY.MAX_LEVEL) * 100}%` }}
          />
          <span className="hyperdrive-energy-label">
            {Math.round(hyperdriveEnergy)}%
          </span>
        </div>
        
        {hyperdriveEnergy >= currentHyperdrive.activationThreshold && (
          <button
            className={`
              hyperdrive-button cyber-button
              ${isHyperdriveActive ? 'bg-[#ff00ff]' : ''}
              ${hyperdriveCharging ? 'charging' : ''}
              ${hyperdriveReadiness === 100 ? 'ready' : ''}
            `}
            onClick={activateHyperdrive}
            disabled={!isHyperdriveActive && hyperdriveReadiness < 100}
          >
            <div className="hyperdrive-status">
              <div 
                className="hyperdrive-charge-indicator"
                style={{ width: `${hyperdriveReadiness}%` }}
              />
              <span className="hyperdrive-label">
                {isHyperdriveActive ? 'DISENGAGE' : 
                 hyperdriveReadiness === 100 ? 'READY' : 
                 `CHARGING ${hyperdriveReadiness}%`}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Предупреждение о низком заряде */}
      {isHyperdriveActive && hyperdriveEnergy < currentHyperdrive.activationThreshold * GAME_MECHANICS.HYPERDRIVE.WARNING_THRESHOLD && (
        <div className="hyperdrive-warning">
          WARNING: Low Energy
        </div>
      )}

      {temperature >= GAME_MECHANICS.TEMPERATURE.WARNING_THRESHOLD && (
        <div className="temperature-warning">
          WARNING: High Temperature
        </div>
      )}

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
    </div>
  );
};