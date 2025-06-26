import { useCallback, useEffect, useState } from 'react';
import { COMPONENTS, GAME_MECHANICS } from '../types/game';
import { useGameStore } from '../store/gameStore';

export const useGameMechanics = () => {
  const {
    engineLevel,
    gearboxLevel,
    batteryLevel,
    hyperdriveLevel,
    powerGridLevel,
    setFuelLevel,
    setTemperature,
    setPowerLevel,
    setIsOverheated,
    setCoolingTimer,
    setHyperdriveActive
  } = useGameStore();

  const [lastTapTimestamp, setLastTapTimestamp] = useState(0);
  const [tapRate, setTapRate] = useState(0);
  const [currentGear, setCurrentGear] = useState('N');
  const [engineTemp, setEngineTemp] = useState(GAME_MECHANICS.TEMPERATURE.MIN);
  const [gearboxTemp, setGearboxTemp] = useState(GAME_MECHANICS.TEMPERATURE.MIN);
  const [batteryTemp, setBatteryTemp] = useState(GAME_MECHANICS.TEMPERATURE.MIN);
  const [batteryCharge, setBatteryCharge] = useState(GAME_MECHANICS.ENERGY.MAX_LEVEL);
  const [powerGridLoad, setPowerGridLoad] = useState(0);
  const [hyperdriveCharge, setHyperdriveCharge] = useState(0);
  const [isHyperdriveActive, setIsHyperdriveActive] = useState(false);

  // Получаем текущие компоненты
  const currentEngine = COMPONENTS.ENGINES.find(e => e.level === engineLevel)!;
  const currentGearbox = COMPONENTS.GEARBOXES.find(g => g.level === gearboxLevel)!;
  const currentBattery = COMPONENTS.BATTERIES.find(b => b.level === batteryLevel)!;
  const currentHyperdrive = COMPONENTS.HYPERDRIVES.find(h => h.level === hyperdriveLevel)!;
  const currentPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === powerGridLevel)!;

  // Обновление состояния гипердвигателя
  const updateHyperdrive = useCallback(() => {
    if (hyperdriveCharge >= currentHyperdrive.activationThreshold && !isHyperdriveActive) {
      setIsHyperdriveActive(true);
      setHyperdriveActive(true);
    } else if (hyperdriveCharge < currentHyperdrive.activationThreshold && isHyperdriveActive) {
      setIsHyperdriveActive(false);
      setHyperdriveActive(false);
    }

    // Потребление энергии при активном гипердвигателе
    if (isHyperdriveActive) {
      setHyperdriveCharge(prev => Math.max(0, prev - currentHyperdrive.energyConsumption));
    }
  }, [hyperdriveCharge, currentHyperdrive, isHyperdriveActive, setHyperdriveActive]);

  // Обновление температуры компонентов
  const updateTemperatures = useCallback(() => {
    // Двигатель
    if (engineTemp > GAME_MECHANICS.TEMPERATURE.WARNING_THRESHOLD) {
      setEngineTemp(prev => Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prev - GAME_MECHANICS.TEMPERATURE.COOLING_RATE));
    }

    // Коробка передач
    if (gearboxTemp > GAME_MECHANICS.TEMPERATURE.WARNING_THRESHOLD) {
      setGearboxTemp(prev => Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prev - GAME_MECHANICS.TEMPERATURE.COOLING_RATE));
    }

    // Батарея
    if (batteryTemp > GAME_MECHANICS.TEMPERATURE.WARNING_THRESHOLD) {
      setBatteryTemp(prev => Math.max(GAME_MECHANICS.TEMPERATURE.MIN, prev - GAME_MECHANICS.TEMPERATURE.COOLING_RATE));
    }

    // Проверка перегрева
    const isOverheated = 
      engineTemp >= currentEngine.maxTemp ||
      gearboxTemp >= currentGearbox.switchTime ||
      batteryTemp >= currentBattery.maxTemp;

    setIsOverheated(isOverheated);
    if (isOverheated) {
      setCoolingTimer(Date.now());
    }
  }, [engineTemp, gearboxTemp, batteryTemp, currentEngine, currentGearbox, currentBattery, setIsOverheated, setCoolingTimer]);

  // Обновление заряда батареи
  const updateBatteryCharge = useCallback(() => {
    if (batteryCharge < GAME_MECHANICS.ENERGY.MAX_LEVEL) {
      const chargeRate = currentBattery.chargeRate * (currentPowerGrid.efficiency / 100);
      setBatteryCharge(prev => Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, prev + chargeRate));
    }
  }, [batteryCharge, currentBattery, currentPowerGrid]);

  // Обновление нагрузки на энергосеть
  const updatePowerGridLoad = useCallback(() => {
    const baseLoad = currentEngine.power + currentGearbox.gear;
    const hyperdriveLoad = isHyperdriveActive ? currentHyperdrive.energyConsumption * 100 : 0;
    const totalLoad = baseLoad + hyperdriveLoad;
    
    setPowerGridLoad(Math.min(currentPowerGrid.maxLoad, totalLoad));
  }, [currentEngine, currentGearbox, currentHyperdrive, isHyperdriveActive, currentPowerGrid]);

  // Основной цикл обновления
  useEffect(() => {
    const updateInterval = setInterval(() => {
      updateHyperdrive();
      updateTemperatures();
      updateBatteryCharge();
      updatePowerGridLoad();
    }, GAME_MECHANICS.ENERGY.RECOVERY_INTERVAL);

    return () => clearInterval(updateInterval);
  }, [updateHyperdrive, updateTemperatures, updateBatteryCharge, updatePowerGridLoad]);

  // Обработка тапа
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapTimestamp;
    
    // Обновляем частоту тапов
    if (timeDiff > 0) {
      setTapRate(1000 / timeDiff);
    }
    setLastTapTimestamp(now);

    // Обновляем передачу
    const newGear = calculateGear(tapRate);
    setCurrentGear(newGear);

    // Обновляем температуру компонентов
    const heatIncrease = GAME_MECHANICS.GEAR.MULTIPLIERS[newGear as keyof typeof GAME_MECHANICS.GEAR.MULTIPLIERS];
    setEngineTemp(prev => Math.min(currentEngine.maxTemp, prev + heatIncrease));
    setGearboxTemp(prev => Math.min(currentGearbox.switchTime, prev + heatIncrease));
    setBatteryTemp(prev => Math.min(currentBattery.maxTemp, prev + heatIncrease));

    // Заряжаем гипердвигатель
    if (!isHyperdriveActive) {
      const chargeGain = heatIncrease * (currentPowerGrid.efficiency / 100);
      setHyperdriveCharge(prev => Math.min(GAME_MECHANICS.ENERGY.MAX_LEVEL, prev + chargeGain));
    }
  }, [lastTapTimestamp, tapRate, currentEngine, currentGearbox, currentBattery, currentPowerGrid, isHyperdriveActive]);

  // Расчет передачи
  const calculateGear = useCallback((currentTapRate: number) => {
    if (currentTapRate >= GAME_MECHANICS.GEAR.THRESHOLDS.M) return 'M';
    if (currentTapRate >= GAME_MECHANICS.GEAR.THRESHOLDS['4']) return '4';
    if (currentTapRate >= GAME_MECHANICS.GEAR.THRESHOLDS['3']) return '3';
    if (currentTapRate >= GAME_MECHANICS.GEAR.THRESHOLDS['2']) return '2';
    if (currentTapRate >= GAME_MECHANICS.GEAR.THRESHOLDS['1']) return '1';
    return 'N';
  }, []);

  return {
    handleTap,
    currentGear,
    engineTemp,
    gearboxTemp,
    batteryTemp,
    batteryCharge,
    powerGridLoad,
    hyperdriveCharge,
    isHyperdriveActive
  };
}; 