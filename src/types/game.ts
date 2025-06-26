import { Gear } from './index';

export type EngineMark = 'Mk I' | 'Mk II' | 'Mk III' | 'Mk IV' | 'Mk V' | 'Mk VI' | 'Mk VII' | 'Mk VIII' | 'Mk IX' | 'Mk X';
export type GearboxLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';
export type BatteryLevel = 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' | 'B7' | 'B8' | 'B9' | 'B10';
export type HyperdriveLevel = 'H1' | 'H2' | 'H3' | 'H4' | 'H5';
export type PowerGridLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

// Интерфейсы компонентов
export interface Engine {
  level: EngineMark;
  power: number;
  fuelEfficiency: number;
  maxTemp: number;
  cost: number;
}

export interface Gearbox {
  level: GearboxLevel;
  gear: number;
  switchTime: number;
  cost: number;
}

export interface Battery {
  level: BatteryLevel;
  capacity: number;
  chargeRate: number;
  maxTemp: number;
  cost: number;
}

export interface Hyperdrive {
  level: HyperdriveLevel;
  speedMultiplier: number;
  energyConsumption: number;
  activationThreshold: number;
  capacity: number;  // Максимальная ёмкость энергии
  chargeRate: number; // Скорость зарядки
  cost: number;
}

export interface PowerGrid {
  level: PowerGridLevel;
  efficiency: number;
  maxLoad: number;
  cost: number;
}

// Игровые состояния
export interface GameState {
  tokens: number;
  highScore: number;
  engineLevel: EngineMark;
  gearboxLevel: GearboxLevel;
  batteryLevel: BatteryLevel;
  hyperdriveLevel: HyperdriveLevel;
  powerGridLevel: PowerGridLevel;
  enginePower: number;
  currentGear: Gear;
  temperature: number;
  fuelLevel: number;
  powerLevel: number;
  isOverheated: boolean;
  coolingTimer: number;
  lastTapTimestamp: number;
  tapRate: number;
  hyperdriveActive: boolean;
}

// Константы механики
export const GAME_MECHANICS = {
  TAP: {
    BASE_REWARD: 1,
    MAX_FINGERS: 5,
    RATE_WINDOW: 1000, // мс для подсчета частоты тапов
  },
  GEAR: {
    MULTIPLIERS: {
      'N': 0,    // Нейтраль не дает токенов
      '1': 1,    // Базовый множитель
      '2': 1.5,  // +50% токенов
      '3': 2,    // в 2 раза больше токенов
      '4': 3,    // в 3 раза больше токенов
      'M': 5     // в 5 раз больше токенов
    },
    THRESHOLDS: {
      '1': 1,  // тапов в секунду
      '2': 5,
      '3': 10,
      '4': 15,
      'M': 20
    }
  },
  ENERGY: {
    CONSUMPTION_RATE: {
      'N': 0.05,  // % в секунду (увеличено в 5 раз для 1-минутного расхода)
      '1': 0.1,   // было 0.02
      '2': 0.2,   // было 0.04
      '3': 0.4,   // было 0.08
      '4': 0.8,   // было 0.16
      'M': 1.65   // было 0.33
    },
    MIN_LEVEL: 0,
    MAX_LEVEL: 100,
    RECOVERY_INTERVAL: 50, // мс
    HYPERDRIVE_CHARGE_RATIO: 0.5 // 10% топлива = 5% заряда (коэффициент 0.5)
  },
  TEMPERATURE: {
    MIN: 20,
    MAX: 100,
    COOLING_RATE: 1,
    WARNING_THRESHOLD: 80
  },
  HYPERDRIVE: {
    CHARGE_RATE: 2,
    CHARGE_INTERVAL: 50,
    CONSUMPTION_INTERVAL: 100,
    WARNING_THRESHOLD: 1.5
  }
};

// Таблицы характеристик компонентов
export const COMPONENTS = {
  ENGINES: [
    { level: 'Mk I', power: 1, fuelEfficiency: 100, maxTemp: 60, cost: 100 },
    { level: 'Mk II', power: 2, fuelEfficiency: 95, maxTemp: 65, cost: 250 },
    { level: 'Mk III', power: 3, fuelEfficiency: 90, maxTemp: 70, cost: 500 },
    { level: 'Mk IV', power: 4, fuelEfficiency: 85, maxTemp: 75, cost: 1000 },
    { level: 'Mk V', power: 5, fuelEfficiency: 80, maxTemp: 80, cost: 2000 },
    { level: 'Mk VI', power: 6, fuelEfficiency: 75, maxTemp: 85, cost: 4000 },
    { level: 'Mk VII', power: 7, fuelEfficiency: 70, maxTemp: 90, cost: 8000 },
    { level: 'Mk VIII', power: 8, fuelEfficiency: 65, maxTemp: 95, cost: 16000 },
    { level: 'Mk IX', power: 9, fuelEfficiency: 60, maxTemp: 100, cost: 32000 },
    { level: 'Mk X', power: 10, fuelEfficiency: 55, maxTemp: 110, cost: 64000 }
  ],
  GEARBOXES: [
    { level: 'L1', gear: 1, overheatThreshold: 60, switchTime: 500, cost: 50 },
    { level: 'L2', gear: 2, overheatThreshold: 65, switchTime: 480, cost: 100 },
    { level: 'L3', gear: 3, overheatThreshold: 70, switchTime: 460, cost: 200 },
    { level: 'L4', gear: 4, overheatThreshold: 75, switchTime: 440, cost: 400 },
    { level: 'L5', gear: 5, overheatThreshold: 80, switchTime: 420, cost: 800 },
    { level: 'L6', gear: 6, overheatThreshold: 85, switchTime: 400, cost: 1600 },
    { level: 'L7', gear: 7, overheatThreshold: 90, switchTime: 380, cost: 3200 },
    { level: 'L8', gear: 8, overheatThreshold: 95, switchTime: 360, cost: 6400 },
    { level: 'L9', gear: 9, overheatThreshold: 100, switchTime: 340, cost: 12800 },
    { level: 'L10', gear: 10, overheatThreshold: 110, switchTime: 320, cost: 25600 }
  ],
  BATTERIES: [
    { level: 'B1', capacity: 10, chargeRate: 0.05, maxTemp: 50, cost: 100 },
    { level: 'B2', capacity: 20, chargeRate: 0.06, maxTemp: 55, cost: 200 },
    { level: 'B3', capacity: 30, chargeRate: 0.07, maxTemp: 60, cost: 400 },
    { level: 'B4', capacity: 40, chargeRate: 0.08, maxTemp: 65, cost: 800 },
    { level: 'B5', capacity: 50, chargeRate: 0.09, maxTemp: 70, cost: 1600 },
    { level: 'B6', capacity: 60, chargeRate: 0.10, maxTemp: 75, cost: 3200 },
    { level: 'B7', capacity: 70, chargeRate: 0.11, maxTemp: 80, cost: 6400 },
    { level: 'B8', capacity: 80, chargeRate: 0.12, maxTemp: 85, cost: 12800 },
    { level: 'B9', capacity: 90, chargeRate: 0.13, maxTemp: 90, cost: 25600 },
    { level: 'B10', capacity: 100, chargeRate: 0.15, maxTemp: 100, cost: 51200 }
  ],
  HYPERDRIVES: [
    { level: 'H1', speedMultiplier: 1.2, energyConsumption: 0.2, activationThreshold: 60, cost: 5000 },
    { level: 'H2', speedMultiplier: 1.4, energyConsumption: 0.3, activationThreshold: 65, cost: 10000 },
    { level: 'H3', speedMultiplier: 1.6, energyConsumption: 0.4, activationThreshold: 70, cost: 20000 },
    { level: 'H4', speedMultiplier: 1.8, energyConsumption: 0.5, activationThreshold: 75, cost: 40000 },
    { level: 'H5', speedMultiplier: 2.0, energyConsumption: 0.6, activationThreshold: 80, cost: 80000 }
  ],
  POWER_GRIDS: [
    { level: 'P1', maxLoad: 25, efficiency: 80, cost: 500 },
    { level: 'P2', maxLoad: 50, efficiency: 85, cost: 1000 },
    { level: 'P3', maxLoad: 75, efficiency: 90, cost: 2000 },
    { level: 'P4', maxLoad: 100, efficiency: 95, cost: 4000 },
    { level: 'P5', maxLoad: 125, efficiency: 98, cost: 8000 }
  ]
}; 