import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { Gear } from '../types';
import {
  Engine,
  Gearbox,
  Battery,
  Hyperdrive,
  PowerGrid,
  GameState,
  GAME_MECHANICS,
  COMPONENTS,
  EngineMark,
  GearboxLevel,
  BatteryLevel,
  HyperdriveLevel,
  PowerGridLevel
} from '../types/game';

const gearToNumber = (gear: Gear): number => {
  if (gear === 'N') return 0;
  if (gear === 'M') return 5;
  return parseInt(gear);
};

const numberToGear = (num: number): Gear => {
  if (num === 0) return 'N';
  if (num === 5) return 'M';
  return num.toString() as Gear;
};

export const useGameMechanics = () => {
  // Состояния компонентов
  const [engine, setEngine] = useState<Engine>({
    ...COMPONENTS.ENGINES[0],
    currentTemp: 20
  } as Engine);
  
  const [gearbox, setGearbox] = useState<Gearbox>({
    ...COMPONENTS.GEARBOXES[0],
    currentTemp: 20
  } as Gearbox);
  
  const [battery, setBattery] = useState<Battery>({
    ...COMPONENTS.BATTERIES[0],
    currentCharge: 100,
    currentTemp: 20
  } as Battery);
  
  const [hyperdrive, setHyperdrive] = useState<Hyperdrive>({
    ...COMPONENTS.HYPERDRIVES[0],
    isActive: false
  } as Hyperdrive);
  
  const [powerGrid, setPowerGrid] = useState<PowerGrid>({
    ...COMPONENTS.POWER_GRIDS[0],
    currentLoad: 0
  } as PowerGrid);

  // Игровое состояние
  const [gameState, setGameState] = useState<GameState>({
    tokens: 0,
    highScore: 0,
    engineLevel: 'Mk I',
    gearboxLevel: 'L1',
    batteryLevel: 'B1',
    hyperdriveLevel: 'H1',
    powerGridLevel: 'P1',
    enginePower: 0,
    currentGear: 'N',
    temperature: 25,
    fuelLevel: 100,
    powerLevel: 0,
    isOverheated: false,
    coolingTimer: 0,
    lastTapTimestamp: 0,
    tapRate: 0,
    hyperdriveActive: false
  });

  const { addTokens } = useGameStore();

  // Обработка нажатия
  const handleTap = useCallback(() => {
    if (gameState.isOverheated) return;
    if (battery.currentCharge <= 0) return;

    const now = Date.now();
    const timeDiff = now - gameState.lastTapTimestamp;
    
    // Расчет частоты нажатий
    const newTapRate = timeDiff > 0 ? 1000 / timeDiff : 0;
    
    // Обновление мощности двигателя
    const powerIncrement = GAME_MECHANICS.POWER.INCREMENT * 
      (hyperdrive.isActive ? hyperdrive.speedMultiplier : 1);
    
    const newEnginePower = Math.min(
      GAME_MECHANICS.POWER.MAX_LEVEL,
      gameState.enginePower + powerIncrement
    );

    // Расчет нагрева
    const engineHeat = newEnginePower > 8 && newTapRate < 4 ? 
      GAME_MECHANICS.OVERHEAT.ENGINE_RATE : 0;
      
    const gearboxHeat = Math.abs(gearToNumber(gameState.currentGear) - gearbox.gear) > 1 ? 
      GAME_MECHANICS.OVERHEAT.GEARBOX_INSTANT : 0;
      
    const batteryHeat = hyperdrive.isActive && newTapRate <= 2 ? 
      GAME_MECHANICS.OVERHEAT.BATTERY_RATE : 0;

    // Обновление температур
    const newEngineTemp = engine.currentTemp + engineHeat;
    const newGearboxTemp = gearbox.currentTemp + gearboxHeat;
    const newBatteryTemp = battery.currentTemp + batteryHeat;

    // Проверка перегрева
    const isOverheated = 
      newEngineTemp >= GAME_MECHANICS.TEMPERATURE.ENGINE_CRITICAL ||
      newGearboxTemp >= GAME_MECHANICS.TEMPERATURE.GEARBOX_CRITICAL ||
      newBatteryTemp >= GAME_MECHANICS.TEMPERATURE.BATTERY_CRITICAL;

    // Расчет токенов
    const baseTokens = newEnginePower * gearToNumber(gameState.currentGear);
    const efficiencyMultiplier = powerGrid.efficiency / 100;
    const hyperdriveMultiplier = hyperdrive.isActive ? hyperdrive.speedMultiplier : 1;
    const tokensToAdd = baseTokens * efficiencyMultiplier * hyperdriveMultiplier;

    // Обновление состояний
    setEngine(prev => ({ ...prev, currentTemp: newEngineTemp }));
    setGearbox(prev => ({ ...prev, currentTemp: newGearboxTemp }));
    setBattery(prev => ({
      ...prev,
      currentTemp: newBatteryTemp,
      currentCharge: Math.max(0, prev.currentCharge - 
        (hyperdrive.isActive ? hyperdrive.energyConsumption : GAME_MECHANICS.FUEL.CONSUMPTION))
    }));
    
    setGameState(prev => ({
      ...prev,
      tapRate: newTapRate,
      lastTapTimestamp: now,
      enginePower: isOverheated ? 0 : newEnginePower,
      temperature: Math.max(newEngineTemp, newGearboxTemp, newBatteryTemp),
      fuelLevel: Math.max(0, prev.fuelLevel - GAME_MECHANICS.FUEL.CONSUMPTION),
      currentGear: isOverheated ? 'N' : prev.currentGear,
      isOverheated,
      coolingTimer: isOverheated ? 
        GAME_MECHANICS.TEMPERATURE.COOLING_BASE + 
        Math.max(newEngineTemp, newGearboxTemp, newBatteryTemp) * 
        GAME_MECHANICS.TEMPERATURE.COOLING_PER_DEGREE : 0
    }));

    if (!isOverheated) {
      addTokens(tokensToAdd);
    }
  }, [
    gameState,
    engine,
    gearbox,
    battery,
    hyperdrive,
    powerGrid,
    addTokens
  ]);

  // Восстановление энергии и охлаждение
  useEffect(() => {
    const regenerationInterval = setInterval(() => {
      if (!gameState.isOverheated) {
        const now = Date.now();
        const idleTime = now - gameState.lastTapTimestamp;
        
        // Восстановление энергии батареи
        setBattery(prev => {
          if (!hyperdrive.isActive && prev.currentCharge < prev.capacity) {
            const baseRegen = GAME_MECHANICS.FUEL.BASE_REGEN;
            const maxRegen = GAME_MECHANICS.FUEL.MAX_REGEN;
            const regenMultiplier = Math.min(1, idleTime / 10000); // 10 секунд для максимума
            const regenAmount = baseRegen + (maxRegen - baseRegen) * regenMultiplier;
            
            return {
              ...prev,
              currentCharge: Math.min(prev.capacity, prev.currentCharge + regenAmount)
            };
          }
          return prev;
        });

        // Естественное охлаждение
        setEngine(prev => ({
          ...prev,
          currentTemp: Math.max(20, prev.currentTemp - 1)
        }));
        
        setGearbox(prev => ({
          ...prev,
          currentTemp: Math.max(20, prev.currentTemp - 1)
        }));
        
        setBattery(prev => ({
          ...prev,
          currentTemp: Math.max(20, prev.currentTemp - 1)
        }));
      }
    }, 1000);

    return () => clearInterval(regenerationInterval);
  }, [gameState.isOverheated, gameState.lastTapTimestamp, hyperdrive.isActive]);

  // Управление гипердвигателем
  const toggleHyperdrive = useCallback(() => {
    if (battery.currentCharge >= hyperdrive.activationThreshold) {
      setHyperdrive(prev => ({ ...prev, isActive: !prev.isActive }));
    }
  }, [battery.currentCharge, hyperdrive.activationThreshold]);

  // Улучшение компонентов
  const upgradeEngine = useCallback((newLevel: EngineMark) => {
    const newEngine = COMPONENTS.ENGINES.find(e => e.level === newLevel);
    if (newEngine) {
      setEngine({ ...newEngine, currentTemp: engine.currentTemp } as Engine);
    }
  }, [engine.currentTemp]);

  const upgradeGearbox = useCallback((newLevel: GearboxLevel) => {
    const newGearbox = COMPONENTS.GEARBOXES.find(g => g.level === newLevel);
    if (newGearbox) {
      setGearbox({ ...newGearbox, currentTemp: gearbox.currentTemp } as Gearbox);
    }
  }, [gearbox.currentTemp]);

  const upgradeBattery = useCallback((newLevel: BatteryLevel) => {
    const newBattery = COMPONENTS.BATTERIES.find(b => b.level === newLevel);
    if (newBattery) {
      setBattery({ 
        ...newBattery, 
        currentCharge: battery.currentCharge,
        currentTemp: battery.currentTemp 
      } as Battery);
    }
  }, [battery.currentCharge, battery.currentTemp]);

  const upgradeHyperdrive = useCallback((newLevel: HyperdriveLevel) => {
    const newHyperdrive = COMPONENTS.HYPERDRIVES.find(h => h.level === newLevel);
    if (newHyperdrive) {
      setHyperdrive({ ...newHyperdrive, isActive: false } as Hyperdrive);
    }
  }, []);

  const upgradePowerGrid = useCallback((newLevel: PowerGridLevel) => {
    const newPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === newLevel);
    if (newPowerGrid) {
      setPowerGrid({ ...newPowerGrid, currentLoad: powerGrid.currentLoad } as PowerGrid);
    }
  }, [powerGrid.currentLoad]);

  return {
    // Состояния
    engine,
    gearbox,
    battery,
    hyperdrive,
    powerGrid,
    gameState,
    
    // Действия
    handleTap,
    toggleHyperdrive,
    
    // Улучшения
    upgradeEngine,
    upgradeGearbox,
    upgradeBattery,
    upgradeHyperdrive,
    upgradePowerGrid
  };
}; 