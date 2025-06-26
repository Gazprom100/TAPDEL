import React, { useState, useCallback } from 'react';
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
  const [purchaseAnimation, setPurchaseAnimation] = useState<string | null>(null);

  // Функция для определения доступности компонента
  const isItemAvailable = useCallback((type: string, itemLevel: string) => {
    const getCurrentIndex = (array: any[], currentLevel: string) => {
      return array.findIndex(item => item.level === currentLevel);
    };

    switch (type) {
      case 'engine':
        const engineIndex = getCurrentIndex(COMPONENTS.ENGINES, engineLevel);
        const targetEngineIndex = getCurrentIndex(COMPONENTS.ENGINES, itemLevel);
        return targetEngineIndex > engineIndex;
      case 'gearbox':
        const gearboxIndex = getCurrentIndex(COMPONENTS.GEARBOXES, gearboxLevel);
        const targetGearboxIndex = getCurrentIndex(COMPONENTS.GEARBOXES, itemLevel);
        return targetGearboxIndex > gearboxIndex;
      case 'battery':
        const batteryIndex = getCurrentIndex(COMPONENTS.BATTERIES, batteryLevel);
        const targetBatteryIndex = getCurrentIndex(COMPONENTS.BATTERIES, itemLevel);
        return targetBatteryIndex > batteryIndex;
      case 'hyperdrive':
        const hyperdriveIndex = getCurrentIndex(COMPONENTS.HYPERDRIVES, hyperdriveLevel);
        const targetHyperdriveIndex = getCurrentIndex(COMPONENTS.HYPERDRIVES, itemLevel);
        return targetHyperdriveIndex > hyperdriveIndex;
      case 'powerGrid':
        const powerGridIndex = getCurrentIndex(COMPONENTS.POWER_GRIDS, powerGridLevel);
        const targetPowerGridIndex = getCurrentIndex(COMPONENTS.POWER_GRIDS, itemLevel);
        return targetPowerGridIndex > powerGridIndex;
      default:
        return false;
    }
  }, [engineLevel, gearboxLevel, batteryLevel, hyperdriveLevel, powerGridLevel]);

  const handlePurchase = async (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid',
    level: string,
    cost: number
  ) => {
    if (tokens < cost || purchaseInProgress || !isItemAvailable(type, level)) return;

    try {
      setPurchaseInProgress(true);
      const success = await spendTokens(cost);
      
      if (success) {
        setPurchaseAnimation(level);
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
        setTimeout(() => setPurchaseAnimation(null), 1000);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const renderItem = (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid',
    item: any,
    currentLevel: string
  ) => {
    const isOwned = item.level === currentLevel;
    const isAvailable = isItemAvailable(type, item.level);
    const canBuy = tokens >= item.cost && isAvailable;
    const isAnimating = purchaseAnimation === item.level;

    return (
      <div
        key={item.level}
        className={`p-4 rounded-lg border transition-all ${
          isOwned 
            ? 'border-[#00ff88] bg-[#00ff88]/20 shadow-[0_0_15px_rgba(0,255,136,0.5)]'
            : !isAvailable
            ? 'border-gray-800 bg-gray-900/50 opacity-50'
            : canBuy
            ? 'border-gray-600 hover:border-[#00ff88]/50 hover:shadow-[0_0_10px_rgba(0,255,136,0.3)]'
            : 'border-gray-700 opacity-75'
        } ${isAnimating ? 'animate-pulse shadow-[0_0_30px_rgba(0,255,136,0.8)]' : ''}`}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold flex items-center gap-2">
              {item.level}
              {isOwned && (
                <span className="text-[#00ff88] text-sm">
                  ✓ Установлено
                </span>
              )}
            </div>
            {type === 'engine' && (
              <>
                <div className="text-sm opacity-70">
                  Мощность: {item.power} | КПД: {item.fuelEfficiency}%
                </div>
                <div className="text-sm opacity-70">
                  Макс. температура: {item.maxTemp}°C
                </div>
              </>
            )}
            {type === 'gearbox' && (
              <>
                <div className="text-sm opacity-70">
                  Передача: {item.gear} | Время переключения: {item.switchTime}мс
                </div>
                <div className="text-sm opacity-70">
                  Порог перегрева: {item.overheatThreshold}°C
                </div>
              </>
            )}
            {type === 'battery' && (
              <>
                <div className="text-sm opacity-70">
                  Емкость: {item.capacity}% | Скорость заряда: {item.chargeRate}%/сек
                </div>
                <div className="text-sm opacity-70">
                  Макс. температура: {item.maxTemp}°C
                </div>
              </>
            )}
            {type === 'hyperdrive' && (
              <>
                <div className="text-sm opacity-70">
                  Множитель: ×{item.speedMultiplier} | Расход: {item.energyConsumption}%/сек
                </div>
                <div className="text-sm opacity-70">
                  Порог активации: {item.activationThreshold}%
                </div>
              </>
            )}
            {type === 'powerGrid' && (
              <div className="text-sm opacity-70">
                Макс. нагрузка: {item.maxLoad}% | КПД: {item.efficiency}%
              </div>
            )}
          </div>
          <button
            onClick={() => handlePurchase(type, item.level, item.cost)}
            disabled={!canBuy || isOwned || purchaseInProgress}
            className={`px-4 py-2 rounded transition-all ${
              isOwned
                ? 'bg-[#00ff88]/20 text-[#00ff88] cursor-not-allowed'
                : !isAvailable
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : canBuy
                ? 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isOwned ? 'Установлено' : `${item.cost} токенов`}
          </button>
        </div>
      </div>
    );
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
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Двигатели</h3>
          <div className="space-y-2">
            {COMPONENTS.ENGINES.map((item) => renderItem('engine', item, engineLevel))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Коробки передач</h3>
          <div className="space-y-2">
            {COMPONENTS.GEARBOXES.map((item) => renderItem('gearbox', item, gearboxLevel))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Аккумуляторы</h3>
          <div className="space-y-2">
            {COMPONENTS.BATTERIES.map((item) => renderItem('battery', item, batteryLevel))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Гипердвигатели</h3>
          <div className="space-y-2">
            {COMPONENTS.HYPERDRIVES.map((item) => renderItem('hyperdrive', item, hyperdriveLevel))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#00ff88]">Электросеть</h3>
          <div className="space-y-2">
            {COMPONENTS.POWER_GRIDS.map((item) => renderItem('powerGrid', item, powerGridLevel))}
          </div>
        </div>
      </div>
    </div>
  );
}; 