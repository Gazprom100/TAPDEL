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
    upgradePowerGrid,
    activeTokenSymbol,
    refreshActiveToken
  } = useGameStore();
  
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [purchaseAnimation, setPurchaseAnimation] = useState<string | null>(null);

  // Обновление активного токена при монтировании
  React.useEffect(() => {
    refreshActiveToken();
    
    // Периодическое обновление активного токена каждые 30 секунд
    const tokenInterval = setInterval(() => {
      refreshActiveToken();
    }, 30000);
    
    return () => {
      clearInterval(tokenInterval);
    };
  }, [refreshActiveToken]);

  // Функция для получения следующего доступного апгрейда
  const getNextUpgrade = useCallback((type: string, currentLevel: string) => {
    const getCurrentIndex = (array: any[], currentLevel: string) => {
      return array.findIndex(item => item.level === currentLevel);
    };

    let components: any[];
    switch (type) {
      case 'engine':
        components = COMPONENTS.ENGINES;
        break;
      case 'gearbox':
        components = COMPONENTS.GEARBOXES;
        break;
      case 'battery':
        components = COMPONENTS.BATTERIES;
        break;
      case 'hyperdrive':
        components = COMPONENTS.HYPERDRIVES;
        break;
      case 'powerGrid':
        components = COMPONENTS.POWER_GRIDS;
        break;
      default:
        return null;
    }

    const currentIndex = getCurrentIndex(components, currentLevel);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < components.length) {
      return components[nextIndex];
    }
    
    return null; // Максимальный уровень достигнут
  }, [engineLevel, gearboxLevel, batteryLevel, hyperdriveLevel, powerGridLevel]);

  // Функция для получения текущего компонента
  const getCurrentComponent = useCallback((type: string, currentLevel: string) => {
    let components: any[];
    switch (type) {
      case 'engine':
        components = COMPONENTS.ENGINES;
        break;
      case 'gearbox':
        components = COMPONENTS.GEARBOXES;
        break;
      case 'battery':
        components = COMPONENTS.BATTERIES;
        break;
      case 'hyperdrive':
        components = COMPONENTS.HYPERDRIVES;
        break;
      case 'powerGrid':
        components = COMPONENTS.POWER_GRIDS;
        break;
      default:
        return null;
    }

    return components.find(item => item.level === currentLevel) || null;
  }, [engineLevel, gearboxLevel, batteryLevel, hyperdriveLevel, powerGridLevel]);

  const handleUpgrade = async (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid'
  ) => {
    const nextUpgrade = getNextUpgrade(type, 
      type === 'engine' ? engineLevel :
      type === 'gearbox' ? gearboxLevel :
      type === 'battery' ? batteryLevel :
      type === 'hyperdrive' ? hyperdriveLevel :
      powerGridLevel
    );
    
    if (!nextUpgrade) {
      alert('Достигнут максимальный уровень!');
      return;
    }

    const totalBalance = tokens;
    const cost = nextUpgrade.cost;
    
    console.log(`🛒 Попытка апгрейда ${type} до ${nextUpgrade.level}:`, {
      cost,
      currentBalance: totalBalance,
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

    try {
      console.log(`🛒 Начинаем апгрейд ${type} до ${nextUpgrade.level} за ${cost} DEL`);
      setPurchaseInProgress(true);
      
      // Сначала тратим токены и проверяем успех
      console.log(`💸 Вызываем spendTokens(${cost}, { type: "${type}", level: "${nextUpgrade.level}" })`);
      const success = await spendTokens(cost, { type, level: nextUpgrade.level });
      console.log(`💸 spendTokens результат:`, success);
      
      if (success) {
        console.log(`✅ Токены потрачены успешно, применяем апгрейд ${type} до ${nextUpgrade.level}`);
        setPurchaseAnimation(nextUpgrade.level);
        
        // Применяем апгрейд
        switch (type) {
          case 'engine':
            upgradeEngine(nextUpgrade.level);
            break;
          case 'gearbox':
            upgradeGearbox(nextUpgrade.level);
            break;
          case 'battery':
            upgradeBattery(nextUpgrade.level);
            break;
          case 'hyperdrive':
            upgradeHyperdrive(nextUpgrade.level);
            break;
          case 'powerGrid':
            upgradePowerGrid(nextUpgrade.level);
            break;
        }
        
        console.log(`🎉 Апгрейд ${type} до ${nextUpgrade.level} завершен!`);
        
        // Сбрасываем анимацию через 2 секунды
        setTimeout(() => {
          setPurchaseAnimation(null);
        }, 2000);
        
      } else {
        console.error(`❌ Ошибка при трате токенов для ${type} ${nextUpgrade.level}`);
        alert('Ошибка при покупке. Попробуйте еще раз.');
      }
      
    } catch (error) {
      console.error(`❌ Ошибка апгрейда ${type}:`, error);
      alert('Произошла ошибка при апгрейде. Попробуйте еще раз.');
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const renderCategory = (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid',
    title: string,
    currentLevel: string,
    icon: string
  ) => {
    const currentComponent = getCurrentComponent(type, currentLevel);
    const nextUpgrade = getNextUpgrade(type, currentLevel);
    const isMaxLevel = !nextUpgrade;
    const canUpgrade = nextUpgrade && tokens >= nextUpgrade.cost && !purchaseInProgress;
    const isAnimating = purchaseAnimation === nextUpgrade?.level;

    return (
      <div
        className={`p-4 sm:p-6 rounded-lg border transition-all ${
          isMaxLevel 
            ? 'border-[#00ff88] bg-[#00ff88]/20 shadow-[0_0_15px_rgba(0,255,136,0.5)]'
            : canUpgrade
            ? 'border-gray-600 hover:border-[#00ff88]/50 hover:shadow-[0_0_10px_rgba(0,255,136,0.3)]'
            : 'border-gray-700 opacity-75'
        } ${isAnimating ? 'animate-pulse shadow-[0_0_30px_rgba(0,255,136,0.8)]' : ''}`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#00ff88]">{title}</h3>
                <div className="text-sm opacity-70">
                  Текущий уровень: {currentLevel}
                  {isMaxLevel && <span className="text-[#00ff88] ml-2">✓ Максимум</span>}
                </div>
              </div>
            </div>
            
            {currentComponent && (
              <div className="space-y-1 text-sm opacity-70">
                {type === 'engine' && (
                  <>
                    <div>Мощность: {currentComponent.power} | КПД: {currentComponent.fuelEfficiency}%</div>
                    <div>Макс. температура: {currentComponent.maxTemp}°C</div>
                  </>
                )}
                {type === 'gearbox' && (
                  <>
                    <div>Передача: {currentComponent.gear} | Время: {currentComponent.switchTime}мс</div>
                    <div>Порог перегрева: {currentComponent.overheatThreshold}°C</div>
                  </>
                )}
                {type === 'battery' && (
                  <>
                    <div>Емкость: {currentComponent.capacity}% | Заряд: {currentComponent.chargeRate}%/сек</div>
                    <div>Макс. температура: {currentComponent.maxTemp}°C</div>
                  </>
                )}
                {type === 'hyperdrive' && (
                  <>
                    <div>Множитель: ×{currentComponent.speedMultiplier} | Расход: {currentComponent.energyConsumption}%/сек</div>
                    <div>Порог активации: {currentComponent.activationThreshold}%</div>
                  </>
                )}
                {type === 'powerGrid' && (
                  <div>Макс. нагрузка: {currentComponent.maxLoad}% | КПД: {currentComponent.efficiency}%</div>
                )}
              </div>
            )}
            
            {nextUpgrade && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600">
                <div className="text-sm font-medium mb-2">Следующий уровень: {nextUpgrade.level}</div>
                <div className="text-xs opacity-70 space-y-1">
                  {type === 'engine' && (
                    <>
                      <div>Мощность: {nextUpgrade.power} (+{nextUpgrade.power - currentComponent.power})</div>
                      <div>КПД: {nextUpgrade.fuelEfficiency}% | Макс. температура: {nextUpgrade.maxTemp}°C</div>
                    </>
                  )}
                  {type === 'gearbox' && (
                    <>
                      <div>Передача: {nextUpgrade.gear} | Время: {nextUpgrade.switchTime}мс</div>
                      <div>Порог перегрева: {nextUpgrade.overheatThreshold}°C</div>
                    </>
                  )}
                  {type === 'battery' && (
                    <>
                      <div>Емкость: {nextUpgrade.capacity}% (+{nextUpgrade.capacity - currentComponent.capacity})</div>
                      <div>Заряд: {nextUpgrade.chargeRate}%/сек | Макс. температура: {nextUpgrade.maxTemp}°C</div>
                    </>
                  )}
                  {type === 'hyperdrive' && (
                    <>
                      <div>Множитель: ×{nextUpgrade.speedMultiplier} | Расход: {nextUpgrade.energyConsumption}%/сек</div>
                      <div>Порог активации: {nextUpgrade.activationThreshold}%</div>
                    </>
                  )}
                  {type === 'powerGrid' && (
                    <div>Макс. нагрузка: {nextUpgrade.maxLoad}% (+{nextUpgrade.maxLoad - currentComponent.maxLoad}) | КПД: {nextUpgrade.efficiency}%</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleUpgrade(type)}
            disabled={isMaxLevel || !canUpgrade}
            className={`px-6 py-3 rounded transition-all text-sm font-medium whitespace-nowrap ${
              isMaxLevel
                ? 'bg-[#00ff88]/20 text-[#00ff88] cursor-not-allowed'
                : canUpgrade
                ? 'bg-[#00ff88] text-black hover:bg-[#00ff88]/80'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            style={{
              minHeight: '48px',
              minWidth: '120px'
            }}
          >
            {isMaxLevel ? 'Максимум' : `${nextUpgrade?.cost || 0} ${activeTokenSymbol || 'DEL'}`}
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
      <div className="space-y-6">
        {/* Двигатели */}
        {renderCategory('engine', 'Двигатели', engineLevel, '🚀')}
        
        {/* Коробки передач */}
        {renderCategory('gearbox', 'Коробки передач', gearboxLevel, '⚙️')}
        
        {/* Батареи */}
        {renderCategory('battery', 'Батареи', batteryLevel, '🔋')}
        
        {/* Гипердвигатели */}
        {renderCategory('hyperdrive', 'Гипердвигатели', hyperdriveLevel, '⚡')}
        
        {/* Энергосети */}
        {renderCategory('powerGrid', 'Энергосети', powerGridLevel, '🔌')}
      </div>
    </div>
  );
}; 