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
    const totalBalance = tokens;
    const isAvailable = isItemAvailable(type, level);
    
    console.log(`🛒 Попытка покупки ${type} ${level}:`, {
      cost,
      currentBalance: totalBalance,
      isAvailable,
      purchaseInProgress,
      hasEnoughMoney: totalBalance >= cost
    });
    
    if (totalBalance < cost) {
      console.warn(`❌ Недостаточно средств: нужно ${cost}, доступно ${totalBalance} DEL`);
      alert(`Недостаточно средств! Нужно ${cost} DEL, у вас ${totalBalance} DEL`);
      return;
    }
    
    if (purchaseInProgress) {
      console.warn(`❌ Покупка уже в процессе`);
      return;
    }
    
    if (!isAvailable) {
      console.warn(`❌ Товар недоступен: ${type} ${level}`);
      alert(`Товар недоступен: ${type} ${level}`);
      return;
    }

    try {
      console.log(`🛒 Начинаем покупку ${type} ${level} за ${cost} DEL`);
      setPurchaseInProgress(true);
      
      // Сначала тратим токены и проверяем успех
      console.log(`💸 Вызываем spendTokens(${cost}, { type: "${type}", level: "${level}" })`);
      const success = await spendTokens(cost, { type, level });
      console.log(`💸 spendTokens результат:`, success);
      
      if (success) {
        console.log(`✅ Токены потрачены успешно, применяем апгрейд ${type} до ${level}`);
        setPurchaseAnimation(level);
        
        // Применяем апгрейд ТОЛЬКО после успешной траты токенов
        switch (type) {
          case 'engine':
            await upgradeEngine(level as any);
            console.log(`🔧 Апгрейд двигателя до ${level} завершен`);
            break;
          case 'gearbox':
            await upgradeGearbox(level as any);
            console.log(`⚙️ Апгрейд коробки передач до ${level} завершен`);
            break;
          case 'battery':
            await upgradeBattery(level as any);
            console.log(`🔋 Апгрейд батареи до ${level} завершен`);
            break;
          case 'hyperdrive':
            await upgradeHyperdrive(level as any);
            console.log(`🚀 Апгрейд гипердвигателя до ${level} завершен`);
            break;
          case 'powerGrid':
            await upgradePowerGrid(level as any);
            console.log(`⚡ Апгрейд энергосети до ${level} завершен`);
            break;
        }
        
        // Анимация покупки
        setTimeout(() => setPurchaseAnimation(null), 1000);
        console.log(`🎉 Покупка ${type} ${level} полностью завершена`);
      } else {
        console.error(`❌ spendTokens вернул false для покупки ${type} ${level}`);
        alert(`Не удалось списать средства для покупки ${type} ${level}. Проверьте баланс и попробуйте снова.`);
      }
    } catch (error) {
      console.error('❌ Исключение при покупке:', error);
      alert(`Исключение при покупке: ${(error as Error).message}`);
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
        className={`p-3 sm:p-4 rounded-lg border transition-all ${
          isOwned 
            ? 'border-[#00ff88] bg-[#00ff88]/20 shadow-[0_0_15px_rgba(0,255,136,0.5)]'
            : !isAvailable
            ? 'border-gray-800 bg-gray-900/50 opacity-50'
            : canBuy
            ? 'border-gray-600 hover:border-[#00ff88]/50 hover:shadow-[0_0_10px_rgba(0,255,136,0.3)]'
            : 'border-gray-700 opacity-75'
        } ${isAnimating ? 'animate-pulse shadow-[0_0_30px_rgba(0,255,136,0.8)]' : ''}`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
              <span className="text-sm sm:text-base">{item.level}</span>
              {isOwned && (
                <span className="text-[#00ff88] text-xs sm:text-sm">
                  ✓ Установлено
                </span>
              )}
            </div>
            {type === 'engine' && (
              <div className="space-y-1">
                <div className="text-xs sm:text-sm opacity-70">
                  Мощность: {item.power} | КПД: {item.fuelEfficiency}%
                </div>
                <div className="text-xs sm:text-sm opacity-70">
                  Макс. температура: {item.maxTemp}°C
                </div>
              </div>
            )}
            {type === 'gearbox' && (
              <div className="space-y-1">
                <div className="text-xs sm:text-sm opacity-70">
                  Передача: {item.gear} | Время: {item.switchTime}мс
                </div>
                <div className="text-xs sm:text-sm opacity-70">
                  Порог перегрева: {item.overheatThreshold}°C
                </div>
              </div>
            )}
            {type === 'battery' && (
              <div className="space-y-1">
                <div className="text-xs sm:text-sm opacity-70">
                  Емкость: {item.capacity}% | Заряд: {item.chargeRate}%/сек
                </div>
                <div className="text-xs sm:text-sm opacity-70">
                  Макс. температура: {item.maxTemp}°C
                </div>
              </div>
            )}
            {type === 'hyperdrive' && (
              <div className="space-y-1">
                <div className="text-xs sm:text-sm opacity-70">
                  Множитель: ×{item.speedMultiplier} | Расход: {item.energyConsumption}%/сек
                </div>
                <div className="text-xs sm:text-sm opacity-70">
                  Порог активации: {item.activationThreshold}%
                </div>
              </div>
            )}
            {type === 'powerGrid' && (
              <div className="text-xs sm:text-sm opacity-70">
                Макс. нагрузка: {item.maxLoad}% | КПД: {item.efficiency}%
              </div>
            )}
          </div>
          <button
            onClick={() => handlePurchase(type, item.level, item.cost)}
            disabled={!canBuy || isOwned || purchaseInProgress}
            className={`px-3 sm:px-4 py-2 rounded transition-all text-xs sm:text-sm whitespace-nowrap ${
              isOwned
                ? 'bg-[#00ff88]/20 text-[#00ff88] cursor-not-allowed'
                : !isAvailable
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : canBuy
                ? 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              minHeight: '36px',
              minWidth: '80px'
            }}
          >
            {isOwned ? 'Установлено' : `${item.cost} DEL`}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="h-full overflow-y-auto overscroll-contain p-4" 
      style={{
      WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Двигатели */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[#00ff88]">Двигатели</h3>
        <div className="space-y-3 sm:space-y-4">
            {COMPONENTS.ENGINES.map((engine) => renderItem('engine', engine, engineLevel))}
          </div>
        </div>

        {/* Коробки передач */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[#00ff88]">Коробки передач</h3>
        <div className="space-y-3 sm:space-y-4">
            {COMPONENTS.GEARBOXES.map((gearbox) => renderItem('gearbox', gearbox, gearboxLevel))}
          </div>
        </div>

        {/* Батареи */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[#00ff88]">Батареи</h3>
        <div className="space-y-3 sm:space-y-4">
            {COMPONENTS.BATTERIES.map((battery) => renderItem('battery', battery, batteryLevel))}
          </div>
        </div>

        {/* Гипердвигатели */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[#00ff88]">Гипердвигатели</h3>
        <div className="space-y-3 sm:space-y-4">
            {COMPONENTS.HYPERDRIVES.map((hyperdrive) => renderItem('hyperdrive', hyperdrive, hyperdriveLevel))}
          </div>
        </div>

        {/* Энергосети */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-[#00ff88]">Энергосети</h3>
        <div className="space-y-3 sm:space-y-4">
            {COMPONENTS.POWER_GRIDS.map((powerGrid) => renderItem('powerGrid', powerGrid, powerGridLevel))}
          </div>
        </div>
      </div>
    </div>
  );
}; 