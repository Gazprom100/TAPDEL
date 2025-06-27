import { useCallback, useEffect, useState } from 'react';
import { COMPONENTS, GAME_MECHANICS } from '../types/game';
import { useGameStore } from '../store/gameStore';

// Новые константы механики
const FUEL_MECHANICS = {
  MAX_LEVEL: 100,
  MIN_LEVEL: 0,
  // За 3 минуты активного тапания 5 пальцами (максимальная скорость) тратится все топливо
  CONSUMPTION_RATE: 100 / (3 * 60), // ~0.56% в секунду при активном тапании
  // За 3 минуты бездействия восстанавливается все топливо (было 5 минут)
  RECOVERY_RATE: 100 / (3 * 60), // ~0.56% в секунду при бездействии
  INACTIVITY_THRESHOLD: 2000 // 2 секунды без активности для начала восстановления
};

const HYPERDRIVE_MECHANICS = {
  MAX_CHARGE: 100,
  MIN_CHARGE: 0,
  // Заряжается от активности тапания
  CHARGE_RATE: 0.5, // % за тап
  // При активации тратится и топливо, и заряд
  FUEL_CONSUMPTION_MULTIPLIER: 2, // Удваивает расход топлива
  CHARGE_CONSUMPTION_RATE: 100 / 10, // % заряда в секунду при активности (100% за 10 секунд = 10%/сек)
};

export const useGameMechanics = () => {
  const {
    engineLevel,
    gearboxLevel,
    batteryLevel,
    hyperdriveLevel,
    powerGridLevel,
    addTokens
  } = useGameStore();

  const [fuelLevel, setFuelLevel] = useState(FUEL_MECHANICS.MAX_LEVEL);
  const [hyperdriveCharge, setHyperdriveCharge] = useState(HYPERDRIVE_MECHANICS.MIN_CHARGE);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [gear, setGear] = useState('N');
  const [taps, setTaps] = useState<number[]>([]);

  // Получаем текущие компоненты
  const currentEngine = COMPONENTS.ENGINES.find(e => e.level === engineLevel)!;
  const currentGearbox = COMPONENTS.GEARBOXES.find(g => g.level === gearboxLevel)!;
  const currentBattery = COMPONENTS.BATTERIES.find(b => b.level === batteryLevel)!;
  const currentHyperdrive = COMPONENTS.HYPERDRIVES.find(h => h.level === hyperdriveLevel)!;
  const currentPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === powerGridLevel)!;

  // Функция расчета передачи
  const calculateGear = useCallback((tapHistory: number[]) => {
    const now = Date.now();
    const recentTaps = tapHistory.filter(tap => now - tap < 1000);
    const tapsPerSecond = recentTaps.length;
    
    if (tapsPerSecond >= 15) return 'M';
    if (tapsPerSecond >= 12) return '4';
    if (tapsPerSecond >= 8) return '3';
    if (tapsPerSecond >= 4) return '2';
    if (tapsPerSecond >= 1) return '1';
    return 'N';
  }, []);

  // Обработка тапа
  const handleTap = useCallback(() => {
    const now = Date.now();
    setLastTapTime(now);
    
    // Обновляем историю тапов
    const newTaps = [...taps, now].slice(-20);
    setTaps(newTaps);
    
    // Рассчитываем передачу
    const newGear = calculateGear(newTaps);
    setGear(newGear);
    
    // Проверяем наличие топлива
    if (fuelLevel <= 0) {
      return; // Не обрабатываем тап без топлива
    }
    
    // Заряжаем аккумулятор гипердвигателя (только если гипердвигатель НЕ активен)
    if (!isHyperdriveActive) {
      setHyperdriveCharge(prev => 
        Math.min(HYPERDRIVE_MECHANICS.MAX_CHARGE, prev + HYPERDRIVE_MECHANICS.CHARGE_RATE)
      );
    }
    
    // Рассчитываем награду
    const baseReward = 1;
    const gearMultiplier = GAME_MECHANICS.GEAR.MULTIPLIERS[newGear] || 1;
    const engineBonus = 1 + (currentEngine.power / 100);
    const gearboxBonus = 1 + (currentGearbox.gear / 10);
    const gridEfficiency = currentPowerGrid.efficiency / 100;
    
    // Используем множитель скорости из конкретной модели гипердвигателя
    const hyperdriveBonus = isHyperdriveActive ? currentHyperdrive.speedMultiplier : 1;
    
    const reward = baseReward * gearMultiplier * engineBonus * gearboxBonus * gridEfficiency * hyperdriveBonus;
    
    // Добавляем токены
    addTokens(reward);
    
  }, [taps, calculateGear, fuelLevel, isHyperdriveActive, currentEngine, currentGearbox, currentPowerGrid, currentHyperdrive, addTokens]);

  // Активация гипердвигателя (только включение, выключение автоматическое)
  const activateHyperdrive = useCallback(() => {
    // Только активация, если заряд достаточен и гипердвигатель не активен
    if (!isHyperdriveActive && hyperdriveCharge >= currentHyperdrive.activationThreshold) {
      setIsHyperdriveActive(true);
    }
    // Убираем возможность ручного выключения
  }, [isHyperdriveActive, hyperdriveCharge, currentHyperdrive.activationThreshold]);

  // Механика топлива и заряда аккумулятора
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;
      const isActive = timeSinceLastTap < FUEL_MECHANICS.INACTIVITY_THRESHOLD;
      
      if (isActive) {
        // Активность - тратим топливо
        const fuelConsumption = isHyperdriveActive 
          ? FUEL_MECHANICS.CONSUMPTION_RATE * HYPERDRIVE_MECHANICS.FUEL_CONSUMPTION_MULTIPLIER
          : FUEL_MECHANICS.CONSUMPTION_RATE;
          
        setFuelLevel(prev => Math.max(FUEL_MECHANICS.MIN_LEVEL, prev - fuelConsumption));
        
        // Если гипердвигатель активен, тратим заряд (используем параметр energyConsumption из модели)
        if (isHyperdriveActive) {
          setHyperdriveCharge(prev => {
            const newCharge = Math.max(HYPERDRIVE_MECHANICS.MIN_CHARGE, 
              prev - HYPERDRIVE_MECHANICS.CHARGE_CONSUMPTION_RATE);
            
            // Автоматически выключаем гипердвигатель при разрядке ниже порога активации
            if (newCharge < currentHyperdrive.activationThreshold) {
              setIsHyperdriveActive(false);
            }
            
            return newCharge;
          });
        }
      } else {
        // Бездействие - восстанавливаем топливо
        setFuelLevel(prev => Math.min(FUEL_MECHANICS.MAX_LEVEL, prev + FUEL_MECHANICS.RECOVERY_RATE));
      }
    }, 1000); // Обновляем каждую секунду

    return () => clearInterval(interval);
  }, [lastTapTime, isHyperdriveActive, currentHyperdrive.activationThreshold]);

  return {
    fuelLevel,
    hyperdriveCharge,
    isHyperdriveActive,
    gear,
    handleTap,
    activateHyperdrive,
    currentHyperdrive, // Экспортируем текущий гипердвигатель для отображения информации
    // Функция для определения цвета заряда аккумулятора
    getHyperdriveChargeColor: (charge: number) => {
      // Используем порог активации конкретной модели для определения готовности
      if (charge >= currentHyperdrive.activationThreshold) return 'rgb(0, 255, 136)'; // Готов к активации - зеленый
      if (charge >= 75) return 'rgb(150, 255, 136)';
      if (charge >= 50) return 'rgb(255, 255, 0)';
      if (charge >= 25) return 'rgb(255, 165, 0)';
      return 'rgb(255, 0, 0)'; // Минимальный заряд - красный
    }
  };
}; 