import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameMechanics } from '../hooks/useGameMechanics';
import { COMPONENTS } from '../types/game';

export const Shop: React.FC = () => {
  const { tokens, spendTokens } = useGameStore();
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const {
    engine,
    gearbox,
    battery,
    hyperdrive,
    powerGrid,
    upgradeEngine,
    upgradeGearbox,
    upgradeBattery,
    upgradeHyperdrive,
    upgradePowerGrid
  } = useGameMechanics();

  const handlePurchase = async (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid',
    level: string,
    cost: number
  ) => {
    if (tokens < cost || purchaseInProgress) return;

    try {
      setPurchaseInProgress(true);
      const success = await spendTokens(cost);
      
      if (success) {
        switch (type) {
          case 'engine':
            upgradeEngine(level as any);
            break;
          case 'gearbox':
            upgradeGearbox(level as any);
            break;
          case 'battery':
            upgradeBattery(level as any);
            break;
          case 'hyperdrive':
            upgradeHyperdrive(level as any);
            break;
          case 'powerGrid':
            upgradePowerGrid(level as any);
            break;
        }
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  return (
    <div className="p-4 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[#00ff88]">Магазин улучшений</h2>
        <div className="text-xl">
          Токены: <span className="text-[#00ff88]">{tokens}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Двигатели */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Двигатели</h3>
          <div className="space-y-2">
            {COMPONENTS.ENGINES.map((item) => (
              <div
                key={item.level}
                className={`p-4 rounded-lg border transition-all ${
                  item.level === engine.level
                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                    : 'border-gray-600 hover:border-[#00ff88]/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.level}</div>
                    <div className="text-sm opacity-70">
                      Мощность: {item.power} | КПД: {item.fuelEfficiency}%
                    </div>
                    <div className="text-sm opacity-70">
                      Макс. температура: {item.maxTemp}°C
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase('engine', item.level, item.cost)}
                    disabled={tokens < item.cost || item.level === engine.level || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === engine.level || purchaseInProgress
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                    }`}
                  >
                    {item.cost} токенов
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Коробки передач */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Коробки передач</h3>
          <div className="space-y-2">
            {COMPONENTS.GEARBOXES.map((item) => (
              <div
                key={item.level}
                className={`p-4 rounded-lg border transition-all ${
                  item.level === gearbox.level
                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                    : 'border-gray-600 hover:border-[#00ff88]/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.level}</div>
                    <div className="text-sm opacity-70">
                      Передача: {item.gear} | Время переключения: {item.switchTime}мс
                    </div>
                    <div className="text-sm opacity-70">
                      Порог перегрева: {item.overheatThreshold}°C
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase('gearbox', item.level, item.cost)}
                    disabled={tokens < item.cost || item.level === gearbox.level || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === gearbox.level || purchaseInProgress
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                    }`}
                  >
                    {item.cost} токенов
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Аккумуляторы */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Аккумуляторы</h3>
          <div className="space-y-2">
            {COMPONENTS.BATTERIES.map((item) => (
              <div
                key={item.level}
                className={`p-4 rounded-lg border transition-all ${
                  item.level === battery.level
                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                    : 'border-gray-600 hover:border-[#00ff88]/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.level}</div>
                    <div className="text-sm opacity-70">
                      Емкость: {item.capacity}% | Скорость заряда: {item.chargeRate}%/сек
                    </div>
                    <div className="text-sm opacity-70">
                      Макс. температура: {item.maxTemp}°C
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase('battery', item.level, item.cost)}
                    disabled={tokens < item.cost || item.level === battery.level || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === battery.level || purchaseInProgress
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                    }`}
                  >
                    {item.cost} токенов
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Гипердвигатели */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Гипердвигатели</h3>
          <div className="space-y-2">
            {COMPONENTS.HYPERDRIVES.map((item) => (
              <div
                key={item.level}
                className={`p-4 rounded-lg border transition-all ${
                  item.level === hyperdrive.level
                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                    : 'border-gray-600 hover:border-[#00ff88]/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.level}</div>
                    <div className="text-sm opacity-70">
                      Множитель: ×{item.speedMultiplier} | Расход: {item.energyConsumption}%/сек
                    </div>
                    <div className="text-sm opacity-70">
                      Порог активации: {item.activationThreshold}%
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase('hyperdrive', item.level, item.cost)}
                    disabled={tokens < item.cost || item.level === hyperdrive.level || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === hyperdrive.level || purchaseInProgress
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                    }`}
                  >
                    {item.cost} токенов
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Электросеть */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Электросеть</h3>
          <div className="space-y-2">
            {COMPONENTS.POWER_GRIDS.map((item) => (
              <div
                key={item.level}
                className={`p-4 rounded-lg border transition-all ${
                  item.level === powerGrid.level
                    ? 'border-[#00ff88] bg-[#00ff88]/20'
                    : 'border-gray-600 hover:border-[#00ff88]/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.level}</div>
                    <div className="text-sm opacity-70">
                      Макс. нагрузка: {item.maxLoad}% | КПД: {item.efficiency}%
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase('powerGrid', item.level, item.cost)}
                    disabled={tokens < item.cost || item.level === powerGrid.level || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === powerGrid.level || purchaseInProgress
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                    }`}
                  >
                    {item.cost} токенов
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 