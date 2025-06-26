import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { COMPONENTS } from '../types/game';

export const Shop: React.FC = () => {
  const { 
    tokens, 
    spendTokens,
    engineLevel,
    gearboxLevel,
    batteryLevel,
    hyperdriveLevel,
    powerGridLevel,
    upgradeEngine,
    upgradeGearbox,
    upgradeBattery,
    upgradeHyperdrive,
    upgradePowerGrid
  } = useGameStore();
  
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

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
                  item.level === engineLevel
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
                    disabled={tokens < item.cost || item.level === engineLevel || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === engineLevel || purchaseInProgress
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
                  item.level === gearboxLevel
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
                    disabled={tokens < item.cost || item.level === gearboxLevel || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === gearboxLevel || purchaseInProgress
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
                  item.level === batteryLevel
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
                    disabled={tokens < item.cost || item.level === batteryLevel || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === batteryLevel || purchaseInProgress
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
                  item.level === hyperdriveLevel
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
                    disabled={tokens < item.cost || item.level === hyperdriveLevel || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === hyperdriveLevel || purchaseInProgress
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
                  item.level === powerGridLevel
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
                    disabled={tokens < item.cost || item.level === powerGridLevel || purchaseInProgress}
                    className={`px-4 py-2 rounded transition-all ${
                      tokens < item.cost || item.level === powerGridLevel || purchaseInProgress
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