import React, { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMPONENTS, GAME_MECHANICS } from '../types/game';
import { useFullscreen } from '../hooks/useFullscreen';
import '../styles/effects.css';

interface Profile {
  level: number;
  experience: number;
}

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
    powerGridLevel,
    activeTokenSymbol,
    refreshActiveToken
  } = useGameStore();

  useEffect(() => {
    if (!activeTokenSymbol) {
      refreshActiveToken();
    }
  }, [activeTokenSymbol, refreshActiveToken]);
  
  const [gear, setGear] = useState<Gear>('N');
  const [taps, setTaps] = useState<number[]>([]);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [intensity, setIntensity] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(GAME_MECHANICS.TEMPERATURE.MIN);
  const [hyperdriveEnergy, setHyperdriveEnergy] = useState<number>(0);
  const [hyperdriveCharging, setHyperdriveCharging] = useState<boolean>(false);
  const [hyperdriveReadiness, setHyperdriveReadiness] = useState<number>(0);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState<boolean>(false);
  const [activeTouches, setActiveTouches] = useState<Set<number>>(new Set());
  const [profile, setProfile] = useState<Profile>({ level: 1, experience: 0 });

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
  const handleTouchStart = useCallback(async (e: React.TouchEvent) => {
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
    
    // Проверяем наличие топлива
    if (fuelLevel <= 0) {
      setIsCharging(true);
      return;
    }
    
    // Накапливаем энергию для гипердвигателя
    if (!isHyperdriveActive) {
      const fuelUsed = touchCount * GAME_MECHANICS.GEAR.MULTIPLIERS[newGear] * (currentPowerGrid.efficiency / 100);
      const energyGain = fuelUsed * GAME_MECHANICS.ENERGY.HYPERDRIVE_CHARGE_RATIO;
      const newEnergy = Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, hyperdriveEnergy + energyGain);
      setHyperdriveEnergy(newEnergy);
    }
    
    // Рассчитываем базовую награду
    const baseReward = GAME_MECHANICS.TAP.BASE_REWARD * touchCount;
    
    // Применяем множители
    const gearMultiplier = GAME_MECHANICS.GEAR.MULTIPLIERS[newGear];
    const engineBonus = 1 + (currentEngine.power / 100);
    const gearboxBonus = 1 + (currentGearbox.gear / 10);
    const gridEfficiency = currentPowerGrid.efficiency / 100;
    const hyperdriveBonus = isHyperdriveActive ? currentHyperdrive.speedMultiplier : 1;
    
    // Финальный расчет награды
    const reward = baseReward * 
      gearMultiplier * 
      engineBonus * 
      gearboxBonus * 
      gridEfficiency * 
      hyperdriveBonus;
    
    // Расчет потребления топлива
    const baseCost = GAME_MECHANICS.ENERGY.CONSUMPTION_RATE[newGear];
    const touchMultiplier = Math.min(touchCount, GAME_MECHANICS.TAP.MAX_FINGERS);
    const totalCost = (baseCost * touchMultiplier) / currentEngine.fuelEfficiency;
    
    // Обновляем состояние
    const newFuelLevel = Math.max(GAME_MECHANICS.ENERGY.MIN_LEVEL, fuelLevel - totalCost);
    setFuelLevel(newFuelLevel);
    setIsCharging(false);
    
    // Добавляем токены
    addTokens(reward);
    
    // Обновляем температуру
    const tempIncrease = (touchCount * gearMultiplier) / currentEngine.fuelEfficiency;
    const newTemp = Math.min(
      GAME_MECHANICS.TEMPERATURE.MAX,
      temperature + tempIncrease
    );
    setTemperature(newTemp);
    
    // Обновляем интенсивность
    const newIntensity = Math.min(100, intensity + 5 * touchCount);
    setIntensity(newIntensity);
  }, [
    taps, 
    calculateGear, 
    currentEngine, 
    currentGearbox, 
    currentPowerGrid, 
    currentHyperdrive, 
    isHyperdriveActive, 
    fuelLevel, 
    addTokens, 
    activeTouches,
    temperature,
    intensity,
    hyperdriveEnergy
  ]);

  // Обработка состояния гипердвигателя
  useEffect(() => {
    let chargeInterval: NodeJS.Timeout;
    
    if (hyperdriveEnergy >= currentHyperdrive.activationThreshold && !isHyperdriveActive) {
      setHyperdriveCharging(true);
      chargeInterval = setInterval(() => {
        const nextReadiness = Math.min(100, hyperdriveReadiness + GAME_MECHANICS.HYPERDRIVE.CHARGE_RATE);
        setHyperdriveReadiness(nextReadiness);
        if (nextReadiness === 100) {
          setHyperdriveCharging(false);
        }
      }, GAME_MECHANICS.HYPERDRIVE.CHARGE_INTERVAL);
    } else if (hyperdriveEnergy < currentHyperdrive.activationThreshold) {
      setHyperdriveCharging(false);
      setHyperdriveReadiness(0);
      setIsHyperdriveActive(false);
    }

    return () => {
      if (chargeInterval) {
        clearInterval(chargeInterval);
      }
    };
  }, [hyperdriveEnergy, currentHyperdrive.activationThreshold, isHyperdriveActive, hyperdriveReadiness]);

  // Потребление энергии гипердвигателем
  useEffect(() => {
    let consumptionInterval: NodeJS.Timeout;
    
    if (isHyperdriveActive) {
      consumptionInterval = setInterval(() => {
        setHyperdriveEnergy(prevEnergy => {
          const newEnergy = Math.max(
            GAME_MECHANICS.ENERGY.MIN_LEVEL, 
            prevEnergy - currentHyperdrive.energyConsumption
          );
          
          // Автоматически отключаем гипердвигатель при низком заряде
          if (newEnergy <= currentHyperdrive.activationThreshold * GAME_MECHANICS.HYPERDRIVE.WARNING_THRESHOLD) {
            setIsHyperdriveActive(false);
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
  }, [isHyperdriveActive, currentHyperdrive.energyConsumption, currentHyperdrive.activationThreshold]);

  // Восстановление энергии и охлаждение
  useEffect(() => {
    const recoveryInterval = setInterval(() => {
      const now = Date.now();
      const recentTaps = taps.filter(tap => now - tap < GAME_MECHANICS.TAP.RATE_WINDOW);
      const isIdle = recentTaps.length === 0;

      if (isIdle) {
        // Восстановление энергии
        const baseChargeRate = currentBattery.chargeRate * (currentPowerGrid.efficiency / 100);
        // Увеличиваем скорость зарядки при низком уровне топлива
        const chargeMultiplier = fuelLevel < 20 ? 1.5 : 1;
        const finalChargeRate = baseChargeRate * chargeMultiplier;
        
        setFuelLevel(Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, fuelLevel + finalChargeRate));
        
        // Охлаждение с учетом эффективности двигателя
        const coolingRate = GAME_MECHANICS.TEMPERATURE.COOLING_RATE * 
          (currentEngine.fuelEfficiency / 100);
        
        setTemperature(prevTemp => 
          Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prevTemp - coolingRate)
        );
        
        // Обновление состояния зарядки и интенсивности
        setIsCharging(true);
        setIntensity(prevIntensity => Math.max(0, prevIntensity - 5));
        
        // Очистка старых тапов
        setTaps(recentTaps);
      } else {
        setIsCharging(false);
      }
    }, GAME_MECHANICS.ENERGY.RECOVERY_INTERVAL);

    return () => clearInterval(recoveryInterval);
  }, [
    taps, 
    currentBattery.chargeRate, 
    currentPowerGrid.efficiency, 
    currentEngine.fuelEfficiency,
    fuelLevel
  ]);

  // Активация гипердвигателя
  const activateHyperdrive = useCallback(() => {
    if (hyperdriveEnergy < currentHyperdrive.activationThreshold) {
      return;
    }

    if (!isHyperdriveActive && hyperdriveReadiness === 100) {
      setIsHyperdriveActive(true);
      setHyperdriveReadiness(0);
      setHyperdriveCharging(false);
    } else if (isHyperdriveActive) {
      setIsHyperdriveActive(false);
    }
  }, [hyperdriveEnergy, currentHyperdrive.activationThreshold, isHyperdriveActive, hyperdriveReadiness]);

  return (
    <div className="cyber-container">
      <div className="cyber-background-effects">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="cyber-glitch" />
        <div className="cyber-vignette" />
      </div>

      {/* Заголовок и счетчик токенов */}
      <div className="game-header">
        <h1 className="game-title">CYBERFLEX</h1>
        <div className="token-display">
          <span className="token-value">{Math.floor(tokens)}</span>
          <span className="token-label">{activeTokenSymbol || '...'}</span>
        </div>
      </div>

      {/* Информация о компонентах в два ряда */}
      <div className="components-info">
        <div className="components-row">
          <div className="component-block">
            <div className="cyber-text">
              {currentEngine.level} • {currentEngine.power}W • {Math.round(temperature)}°C
            </div>
            <div className="cyber-text">
              {currentGearbox.level} • {currentGearbox.gear}x • {currentGearbox.switchTime}ms
            </div>
          </div>
          <div className="component-block">
            <div className="cyber-text">
              {currentBattery.level} • {currentBattery.capacity}% • {currentBattery.chargeRate}%/s
            </div>
            <div className="cyber-text">
              {currentPowerGrid.level} • {currentPowerGrid.efficiency}% • {currentPowerGrid.maxLoad}W
            </div>
          </div>
        </div>
      </div>

      {/* Левая панель с индикаторами */}
      <div className="left-panel">
        {/* Шкала активности тапания */}
        <div className="intensity-meter vertical">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`intensity-bar ${intensity >= (i + 1) * 10 ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Шкала гипердвигателя */}
        <div className="hyperdrive-meter vertical">
          <div 
            className={`
              hyperdrive-energy-fill
              ${hyperdriveEnergy < currentHyperdrive.activationThreshold ? 'low' :
                hyperdriveEnergy < currentHyperdrive.activationThreshold * 2 ? 'medium' : 'high'}
            `}
            style={{ height: `${(hyperdriveEnergy / GAME_MECHANICS.ENERGY.MAX_LEVEL) * 100}%` }}
          />
        </div>
      </div>

      {/* Центральный круг мощности */}
      <div className="power-display">
        <div className="power-ring" />
        <div className="power-ring-outer" />
        <div className="power-ring-inner" />
        <div className="gear-indicator">{gear}</div>
      </div>

      {/* Кнопка гипердвигателя */}
      {hyperdriveEnergy >= currentHyperdrive.activationThreshold && (
        <button
          className={`
            hyperdrive-button
            ${isHyperdriveActive ? 'active' : ''}
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
               hyperdriveReadiness === 100 ? 'ENGAGE' : 
               `CHARGING ${hyperdriveReadiness}%`}
            </span>
          </div>
        </button>
      )}

      {/* Предупреждения */}
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

      {/* Индикатор зарядки */}
      {isCharging && (
        <div className="charging-indicator">
          <div className="charging-dot" />
          <div className="charging-dot" />
          <div className="charging-dot" />
        </div>
      )}

      {/* Кнопка профиля */}
      <button className="profile-button">
        <span className="profile-icon">👤</span>
        <span className="profile-level">LVL {profile?.level || 1}</span>
      </button>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-[#00ff88]">
            {Math.floor(fuelLevel)}%
          </div>
          <div className="text-sm sm:text-base opacity-70">
            Топливо
          </div>
        </div>
      </div>
    </div>
  );
};

// Добавляем новые стили
const styles = `
.game-header {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  text-align: center;
}

.game-title {
  font-size: 2.5rem;
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  margin-bottom: 1rem;
}

.token-display {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #00ff88;
  border-radius: 10px;
  padding: 0.5rem 2rem;
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

.token-value {
  font-size: 2rem;
  color: #00ff88;
}

.token-label {
  font-size: 1.2rem;
  color: #ffffff;
  opacity: 0.8;
}

.components-info {
  position: absolute;
  top: 150px;
  left: 20px;
  right: 20px;
}

.components-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
}

.component-block {
  flex: 1;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #00ff88;
  border-radius: 8px;
  padding: 1rem;
}

.left-panel {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.intensity-meter.vertical,
.hyperdrive-meter.vertical {
  height: 200px;
  width: 30px;
  display: flex;
  flex-direction: column-reverse;
  gap: 5px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #00ff88;
  border-radius: 15px;
  padding: 5px;
}

.intensity-bar {
  height: 100%;
  background: rgba(0, 255, 136, 0.2);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.intensity-bar.active {
  background: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.hyperdrive-meter .hyperdrive-energy-fill {
  width: 100%;
  background: #ff00ff;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.hyperdrive-button {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #ff00ff;
  border-radius: 20px;
  padding: 1rem 3rem;
  color: #ff00ff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hyperdrive-button:hover:not(:disabled) {
  background: rgba(255, 0, 255, 0.2);
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.5);
}

.hyperdrive-button.active {
  background: #ff00ff;
  color: #000000;
}

.profile-button {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #00ff88;
  border-radius: 30px;
  padding: 0.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.profile-button:hover {
  background: rgba(0, 255, 136, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.profile-icon {
  font-size: 1.5rem;
}

.profile-level {
  color: #ffffff;
  font-size: 1rem;
}
`;

// Добавляем стили в документ
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);