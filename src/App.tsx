import React, { useState, useEffect, useCallback } from 'react'
import { Profile } from './components/Profile'
import { useGameStore } from './store/gameStore'
import { COMPONENTS, GAME_MECHANICS } from './types/game'
import './styles/effects.css'

type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { 
    tokens, 
    highScore, 
    addTokens,
    engineLevel,
    gearboxLevel,
    batteryLevel,
    hyperdriveLevel,
    powerGridLevel,
    fuelLevel,
    setFuelLevel
  } = useGameStore();

  // Состояния для игровой механики
  const [gear, setGear] = useState<Gear>('N');
  const [taps, setTaps] = useState<number[]>([]);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [intensity, setIntensity] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(GAME_MECHANICS.TEMPERATURE.MIN);
  const [hyperdriveEnergy, setHyperdriveEnergy] = useState<number>(0);
  const [hyperdriveCharging, setHyperdriveCharging] = useState<boolean>(false);
  const [hyperdriveReadiness, setHyperdriveReadiness] = useState<number>(0);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState<boolean>(false);

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

  // Обработка тапов
  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTaps = [...taps, now].slice(-20); // Сохраняем последние 20 тапов
    setTaps(newTaps);
    
    // Обновляем передачу
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    // Проверяем наличие топлива
    if (fuelLevel <= 0) {
      setIsCharging(true);
      return;
    }
    
    // Накапливаем энергию для гипердвигателя
    if (!isHyperdriveActive) {
      const fuelUsed = GAME_MECHANICS.GEAR.MULTIPLIERS[newGear] * (currentPowerGrid.efficiency / 100);
      const energyGain = fuelUsed * GAME_MECHANICS.ENERGY.HYPERDRIVE_CHARGE_RATIO;
      const newEnergy = Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, hyperdriveEnergy + energyGain);
      setHyperdriveEnergy(newEnergy);
    }
    
    // Рассчитываем награду
    const baseReward = GAME_MECHANICS.TAP.BASE_REWARD;
    const gearMultiplier = GAME_MECHANICS.GEAR.MULTIPLIERS[newGear];
    const engineBonus = 1 + (currentEngine.power / 100);
    const gearboxBonus = 1 + (currentGearbox.gear / 10);
    const gridEfficiency = currentPowerGrid.efficiency / 100;
    const hyperdriveBonus = isHyperdriveActive ? currentHyperdrive.speedMultiplier : 1;
    
    const reward = baseReward * gearMultiplier * engineBonus * gearboxBonus * gridEfficiency * hyperdriveBonus;
    
    // Расчет потребления топлива
    const baseCost = GAME_MECHANICS.ENERGY.CONSUMPTION_RATE[newGear];
    const totalCost = baseCost / (currentEngine.fuelEfficiency / 100); // Учитываем КПД двигателя
    
    // Обновляем состояние
    const newFuelLevel = Math.max(GAME_MECHANICS.ENERGY.MIN_LEVEL, fuelLevel - totalCost);
    setFuelLevel(newFuelLevel);
    setIsCharging(false);
    
    // Добавляем токены
    addTokens(reward);
    
    // Обновляем температуру
    const tempIncrease = gearMultiplier / currentEngine.fuelEfficiency;
    const newTemp = Math.min(GAME_MECHANICS.TEMPERATURE.MAX, temperature + tempIncrease);
    setTemperature(newTemp);
    
    // Обновляем интенсивность
    const newIntensity = Math.min(100, intensity + 5);
    setIntensity(newIntensity);
  }, [taps, calculateGear, currentEngine, currentGearbox, currentPowerGrid, currentHyperdrive, isHyperdriveActive, fuelLevel, addTokens, temperature, intensity, hyperdriveEnergy]);

  // Активация гипердвигателя
  const activateHyperdrive = useCallback(() => {
    if (hyperdriveReadiness === 100 && !isHyperdriveActive) {
      setIsHyperdriveActive(true);
      setHyperdriveReadiness(0);
    } else if (isHyperdriveActive) {
      setIsHyperdriveActive(false);
    }
  }, [hyperdriveReadiness, isHyperdriveActive]);

  // Эффекты для автоматического восстановления и обработки гипердвигателя
  useEffect(() => {
    const interval = setInterval(() => {
      // Восстановление топлива: новая система - 0.033% за 100мс = 100% за 5 минут
      const newFuelLevel = Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, fuelLevel + GAME_MECHANICS.ENERGY.RECOVERY_RATE);
      setFuelLevel(newFuelLevel);
      
      // Снижение интенсивности
      setIntensity((prev: number) => Math.max(0, prev - 1));
      
      // Охлаждение
      setTemperature((prev: number) => Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prev - GAME_MECHANICS.TEMPERATURE.COOLING_RATE));
    }, GAME_MECHANICS.ENERGY.RECOVERY_INTERVAL);

    return () => clearInterval(interval);
  }, [fuelLevel, setFuelLevel]);

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
    }

    return () => {
      if (chargeInterval) {
        clearInterval(chargeInterval);
      }
    };
  }, [hyperdriveEnergy, currentHyperdrive.activationThreshold, isHyperdriveActive, hyperdriveReadiness]);

  // Потребление энергии гипердвигателем - настроено на 1 минуту работы
  useEffect(() => {
    let consumptionInterval: NodeJS.Timeout;
    
    if (isHyperdriveActive) {
      consumptionInterval = setInterval(() => {
        setHyperdriveEnergy(prevEnergy => {
          // Тратим энергию за 1 минуту (60 секунд = 60 интервалов по 1 секунде)
          const energyConsumptionPerSecond = 100 / 60; // 1.67% в секунду = 100% за 60 секунд
          const newEnergy = Math.max(GAME_MECHANICS.ENERGY.MIN_LEVEL, prevEnergy - energyConsumptionPerSecond);
          
          if (newEnergy <= 0) {
            setIsHyperdriveActive(false);
          }
          
          return newEnergy;
        });
      }, 1000); // каждую секунду
    }

    return () => {
      if (consumptionInterval) {
        clearInterval(consumptionInterval);
      }
    };
  }, [isHyperdriveActive]);

  // Предотвращаем нежелательные жесты браузера
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });
    document.addEventListener('gesturestart', preventDefault, { passive: false });
    document.addEventListener('gesturechange', preventDefault, { passive: false });
    document.addEventListener('gestureend', preventDefault, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('gesturechange', preventDefault);
      document.removeEventListener('gestureend', preventDefault);
    };
  }, []);

  // Расчет времени восстановления топлива
  const calculateRecoveryTime = () => {
    const remainingFuel = GAME_MECHANICS.ENERGY.MAX_LEVEL - fuelLevel;
    const recoveryRate = GAME_MECHANICS.ENERGY.RECOVERY_RATE; // % за интервал
    const timeInIntervals = remainingFuel / recoveryRate;
    const timeInMs = timeInIntervals * GAME_MECHANICS.ENERGY.RECOVERY_INTERVAL;
    const timeInSeconds = Math.ceil(timeInMs / 1000);
    
    if (timeInSeconds <= 0) return "Полное";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    } else {
      return `${seconds}с`;
    }
  };

  return (
    <div 
      className={`cyber-container intensity-${Math.floor(intensity / 10) * 10} gear-${gear} ${isHyperdriveActive ? 'hyperdrive-active' : ''}`}
      style={{
        height: '100vh',
        minHeight: '-webkit-fill-available',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* Фоновые эффекты */}
      <div className="cyber-background-effects">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="cyber-glitch" />
        <div className="cyber-vignette" />
      </div>

      {/* 1. Название на самом верху в центре */}
      <div className="absolute top-2 sm:top-4 md:top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="cyber-text text-2xl sm:text-3xl md:text-4xl font-bold text-center" style={{ 
          color: '#ffcc00',
          textShadow: `0 0 20px rgba(255, 204, 0, ${0.5 + intensity / 200})`,
          filter: `brightness(${1 + intensity / 100})`
        }}>
          CYBERFLEX
        </div>
      </div>

      {/* 2. Счетчик натапанных DEL - растянут на всю ширину */}
      <div className="absolute top-12 sm:top-16 md:top-20 left-2 right-2 sm:left-4 sm:right-4 md:left-6 md:right-6 z-20">
        <div className="cyber-panel" style={{
          boxShadow: `0 0 ${10 + intensity / 2}px rgba(0, 255, 136, ${0.3 + intensity / 200})`
        }}>
          <div className="text-center p-2 sm:p-3 md:p-4">
            <div className="cyber-text text-xl sm:text-2xl md:text-3xl font-bold" style={{
              filter: `brightness(${1 + intensity / 100})`,
              textShadow: `0 0 ${5 + intensity / 10}px rgba(0, 255, 136, 0.8)`
            }}>
              {Math.floor(tokens)} DEL
            </div>
          </div>
        </div>
      </div>

      {/* 3. Два блока с информацией о компонентах - опущены на 25% (10% + 15%) */}
      <div className="absolute left-2 sm:left-3 md:left-4 right-2 sm:right-3 md:right-4 z-20" style={{
        top: 'calc(24px + 25vh + 32px)'
      }}>
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          {/* Левый блок */}
          <div className="flex-1 cyber-panel p-2 sm:p-2.5 md:p-3" style={{
            boxShadow: `0 0 ${5 + intensity / 4}px rgba(0, 255, 136, ${0.2 + intensity / 300})`
          }}>
            <div className="cyber-text text-xs mb-1 sm:mb-2">ДВИГАТЕЛЬ & КПП</div>
            <div className="cyber-text text-xs sm:text-sm">
              {currentEngine.level} • {currentEngine.power}W • {currentEngine.fuelEfficiency}%
            </div>
            <div className="cyber-text text-xs sm:text-sm">
              {currentGearbox.level} • {currentGearbox.gear}x • {currentGearbox.switchTime}ms
            </div>
          </div>
          
          {/* Правый блок */}
          <div className="flex-1 cyber-panel p-2 sm:p-2.5 md:p-3" style={{
            boxShadow: `0 0 ${5 + intensity / 4}px rgba(0, 255, 136, ${0.2 + intensity / 300})`
          }}>
            <div className="cyber-text text-xs mb-1 sm:mb-2">БАТАРЕЯ & СЕТЬ</div>
            <div className="cyber-text text-xs sm:text-sm">
              {currentBattery.level} • {currentBattery.capacity}% • {currentBattery.chargeRate}%/s
            </div>
            <div className="cyber-text text-xs sm:text-sm">
              {currentPowerGrid.level} • {currentPowerGrid.efficiency}% • {currentPowerGrid.maxLoad}W
            </div>
          </div>
        </div>
      </div>

      {/* 5. Левая шкала интенсивности - шире в 2 раза, 100 градаций */}
      <div className="absolute left-1 sm:left-2 md:left-4 top-0 bottom-0 z-20 flex items-center">
        <div className="cyber-scale" style={{
          width: '48px', // увеличено в 2 раза
          height: 'calc(100vh - 40px)',
          marginTop: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(to bottom, rgba(0, 255, 136, 0.1), rgba(0, 100, 50, 0.1))',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: `
            0 0 ${15 + intensity / 5}px rgba(0, 255, 136, ${0.3 + intensity / 200}),
            inset 0 0 15px rgba(0, 255, 136, 0.1)
          `,
          overflow: 'hidden'
        }}>
          {/* Фоновое свечение */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${intensity}%`,
            background: `linear-gradient(to top, 
              rgba(0, 255, 136, ${0.6 + intensity / 200}), 
              rgba(0, 255, 136, ${0.3 + intensity / 300}))`,
            transition: 'height 0.3s ease-out',
            boxShadow: `0 0 ${8 + intensity / 10}px rgba(0, 255, 136, 0.8)`
          }} />
          
          {/* 100 градаций шкалы */}
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 1}%`,
                left: i % 10 === 0 ? '4px' : '8px', // длинные деления каждые 10%
                right: '4px',
                height: i % 10 === 0 ? '2px' : '1px', // толстые деления каждые 10%
                background: intensity >= (100 - i) ? 
                  `rgba(0, 255, 136, ${0.8 + intensity / 500})` : 
                  'rgba(0, 255, 136, 0.2)',
                boxShadow: intensity >= (100 - i) ? 
                  `0 0 3px rgba(0, 255, 136, 0.8)` : 'none'
              }}
            />
          ))}
          
          {/* Индикатор текущего уровня */}
          <div style={{
            position: 'absolute',
            bottom: `${intensity}%`,
            left: '-3px',
            right: '-3px',
            height: '3px',
            background: `rgba(0, 255, 136, ${0.9 + intensity / 200})`,
            boxShadow: `0 0 12px rgba(0, 255, 136, 0.9)`,
            transition: 'bottom 0.3s ease-out',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      {/* 6. Правая шкала заряда гипердвигателя - шире в 2 раза, 100 градаций */}
      <div className="absolute right-1 sm:right-2 md:right-4 top-0 bottom-0 z-20 flex items-center">
        <div className="cyber-scale" style={{
          width: '48px', // увеличено в 2 раза
          height: 'calc(100vh - 40px)',
          marginTop: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(to bottom, rgba(255, 0, 255, 0.1), rgba(100, 0, 100, 0.1))',
          border: '2px solid rgba(255, 0, 255, 0.3)',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: `
            0 0 ${15 + hyperdriveEnergy / 5}px rgba(255, 0, 255, ${0.3 + hyperdriveEnergy / 200}),
            inset 0 0 15px rgba(255, 0, 255, 0.1)
          `,
          overflow: 'hidden'
        }}>
          {/* Фоновое свечение */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${(hyperdriveEnergy / GAME_MECHANICS.ENERGY.MAX_LEVEL) * 100}%`,
            background: `linear-gradient(to top, 
              rgba(255, 0, 255, ${0.6 + hyperdriveEnergy / 200}), 
              rgba(255, 100, 255, ${0.3 + hyperdriveEnergy / 300}))`,
            transition: 'height 0.3s ease-out',
            boxShadow: `0 0 ${8 + hyperdriveEnergy / 10}px rgba(255, 0, 255, 0.8)`
          }} />
          
          {/* 100 градаций шкалы */}
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 1}%`,
                left: i % 10 === 0 ? '4px' : '8px', // длинные деления каждые 10%
                right: '4px',
                height: i % 10 === 0 ? '2px' : '1px', // толстые деления каждые 10%
                background: hyperdriveEnergy >= ((100 - i)) ? 
                  `rgba(255, 0, 255, ${0.8 + hyperdriveEnergy / 500})` : 
                  'rgba(255, 0, 255, 0.2)',
                boxShadow: hyperdriveEnergy >= ((100 - i)) ? 
                  `0 0 3px rgba(255, 0, 255, 0.8)` : 'none'
              }}
            />
          ))}
          
          {/* Индикатор текущего уровня */}
          <div style={{
            position: 'absolute',
            bottom: `${(hyperdriveEnergy / GAME_MECHANICS.ENERGY.MAX_LEVEL) * 100}%`,
            left: '-3px',
            right: '-3px',
            height: '3px',
            background: `rgba(255, 0, 255, ${0.9 + hyperdriveEnergy / 200})`,
            boxShadow: `0 0 12px rgba(255, 0, 255, 0.9)`,
            transition: 'bottom 0.3s ease-out',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      {/* 4. Центральная круглая кнопка с топливом */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div 
          className="power-display pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            handleTap();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleTap();
          }}
          style={{
            filter: `brightness(${1 + intensity / 50})`,
            transform: `scale(${1 + intensity / 500})`,
            width: 'clamp(180px, 25vw, 280px)',
            height: 'clamp(180px, 25vw, 280px)'
          }}
        >
          {/* Внешние кольца */}
          <div className="power-ring-outer" style={{
            boxShadow: `0 0 ${20 + intensity}px rgba(0, 255, 136, ${0.4 + intensity / 100})`
          }} />
          <div className="power-ring" style={{
            boxShadow: `inset 0 0 ${15 + intensity / 2}px rgba(0, 255, 136, ${0.6 + intensity / 150})`
          }} />
          <div className="power-ring-inner" style={{
            background: `radial-gradient(circle, 
              rgba(0, 255, 136, ${0.3 + intensity / 200}) 0%, 
              rgba(0, 0, 0, 0.8) 100%)`
          }} />
          
          {/* Индикатор топлива */}
          <div className="fuel-display">
            <div className="cyber-text text-sm sm:text-base md:text-lg mb-1 sm:mb-2">ТОПЛИВО</div>
            <div className="cyber-text text-lg sm:text-xl md:text-2xl font-bold" style={{
              color: fuelLevel > 50 ? '#00ff88' : fuelLevel > 20 ? '#ffaa00' : '#ff4444',
              textShadow: `0 0 ${5 + intensity / 10}px currentColor`
            }}>
              {Math.floor(fuelLevel)}%
            </div>
            <div className="cyber-text text-xs opacity-70">
              Передача: {gear}
            </div>
            {fuelLevel < 100 && (
              <div className="cyber-text text-xs opacity-60">
                Восст.: {calculateRecoveryTime()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Кнопка гипердвигателя - опущена на 20% ниже */}
      {hyperdriveEnergy >= currentHyperdrive.activationThreshold && (
        <div className="absolute left-1/2 transform -translate-x-1/2 z-30 px-2" style={{
          bottom: 'calc(20% - 20px)' // опущена на 20% от предыдущего положения
        }}>
          <button
            className={`hyperdrive-button ${isHyperdriveActive ? 'active' : ''} ${hyperdriveCharging ? 'charging' : ''} ${hyperdriveReadiness === 100 ? 'ready' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              activateHyperdrive();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            disabled={!isHyperdriveActive && hyperdriveReadiness < 100}
            style={{
              boxShadow: `0 0 ${10 + hyperdriveEnergy / 5}px rgba(255, 0, 255, ${0.5 + hyperdriveEnergy / 200})`,
              filter: `brightness(${1 + hyperdriveEnergy / 100})`,
              padding: '10px 20px',
              fontSize: 'clamp(14px, 3vw, 18px)',
              minHeight: '45px',
              minWidth: '120px',
              pointerEvents: 'auto'
            }}
          >
            <div className="hyperdrive-status">
              <div 
                className="hyperdrive-charge-indicator"
                style={{ width: `${hyperdriveReadiness}%` }}
              />
              <span className="hyperdrive-label">
                {isHyperdriveActive ? 'DISENGAGE' : 
                 hyperdriveReadiness === 100 ? 'ENGAGE' : 
                 `CHARGING ${hyperdriveReadiness}%`
                }
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 8. Кнопка профиля внизу экрана */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <button
          className="cyber-button"
          onClick={(e) => {
            e.stopPropagation();
            setIsProfileOpen(true);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          style={{
            padding: '10px 20px',
            fontSize: 'clamp(14px, 3vw, 18px)',
            minHeight: '45px',
            minWidth: '100px',
            boxShadow: `0 0 15px rgba(0, 255, 136, 0.5)`,
            background: 'rgba(0, 255, 136, 0.1)',
            border: '2px solid rgba(0, 255, 136, 0.3)',
            pointerEvents: 'auto'
          }}
        >
          Профиль
        </button>
      </div>

      {/* Модальное окно профиля */}
      {isProfileOpen && (
        <Profile onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  )
}

export default App;