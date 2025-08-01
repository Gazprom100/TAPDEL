import React, { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameConfigStore } from '../store/gameConfigStore';
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

  const { config } = useGameConfigStore();
  
  // FALLBACK: Если данные не загружены, используем дефолтные значения
  const safeTokens = tokens || 0;
  const safeActiveTokenSymbol = activeTokenSymbol || 'BOOST';
  
  // FALLBACK для уровней компонентов
  const safeEngineLevel = engineLevel || 'Mk I';
  const safeGearboxLevel = gearboxLevel || 'Gear 1';
  const safeBatteryLevel = batteryLevel || 'Cell 1';
  const safeHyperdriveLevel = hyperdriveLevel || 'Drive 1';
  const safePowerGridLevel = powerGridLevel || 'Grid 1';
  
  // Отладочная информация
  console.log('🔍 Shop Component Debug:', {
    tokens: tokens,
    safeTokens: safeTokens,
    activeTokenSymbol: activeTokenSymbol,
    safeActiveTokenSymbol: safeActiveTokenSymbol,
    config: config,
    hasConfig: !!config,
    hasComponents: !!config?.components,
    engineLevel: engineLevel,
    safeEngineLevel: safeEngineLevel,
    gearboxLevel: gearboxLevel,
    safeGearboxLevel: safeGearboxLevel,
    batteryLevel: batteryLevel,
    safeBatteryLevel: safeBatteryLevel,
    hyperdriveLevel: hyperdriveLevel,
    safeHyperdriveLevel: safeHyperdriveLevel,
    powerGridLevel: powerGridLevel,
    safePowerGridLevel: safePowerGridLevel
  });
  
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

  // Генерируем компоненты из настроек с проверкой на config
  const generateComponents = useCallback((componentType: string) => {
    console.log('🔍 Shop: generateComponents вызвана для:', componentType, {
      hasConfig: !!config,
      hasComponents: !!config?.components,
      componentType: componentType,
      configComponents: config?.components
    });
    
    if (!config || !config.components) {
      console.warn('⚠️ Config не загружен, используем дефолтные компоненты');
      // Возвращаем дефолтные компоненты вместо пустого массива
      const defaultComponents = [
        { level: 'Level 1', cost: 100, bonus: 1, power: 1, gear: 1, efficiency: 1, speedMultiplier: 1.1 },
        { level: 'Level 2', cost: 200, bonus: 2, power: 2, gear: 2, efficiency: 2, speedMultiplier: 1.2 },
        { level: 'Level 3', cost: 400, bonus: 4, power: 4, gear: 4, efficiency: 4, speedMultiplier: 1.3 }
      ];
      console.log('✅ Shop: Возвращаем дефолтные компоненты:', defaultComponents);
      return defaultComponents;
    }
    
    const configComponent = config.components[componentType as keyof typeof config.components];
    if (!configComponent) {
      console.warn(`⚠️ Компонент ${componentType} не найден в конфиге, используем дефолтные`);
      const defaultComponents = [
        { level: 'Level 1', cost: 100, bonus: 1, power: 1, gear: 1, efficiency: 1, speedMultiplier: 1.1 },
        { level: 'Level 2', cost: 200, bonus: 2, power: 2, gear: 2, efficiency: 2, speedMultiplier: 1.2 },
        { level: 'Level 3', cost: 400, bonus: 4, power: 4, gear: 4, efficiency: 4, speedMultiplier: 1.3 }
      ];
      console.log('✅ Shop: Возвращаем дефолтные компоненты для отсутствующего типа:', defaultComponents);
      return defaultComponents;
    }
    
    const components = [];
    for (let i = 0; i < configComponent.maxLevel; i++) {
      const cost = configComponent.costs[i] || (configComponent.costs[configComponent.costs.length - 1] || 100) * Math.pow(2, i - configComponent.costs.length + 1);
      const bonus = configComponent.bonuses[i] || (configComponent.bonuses[configComponent.bonuses.length - 1] || 1) * Math.pow(2, i - configComponent.bonuses.length + 1);
      
      components.push({
        level: `Level ${i + 1}`,
        cost,
        bonus,
        // Дополнительные поля для совместимости
        power: bonus,
        gear: bonus,
        efficiency: bonus,
        speedMultiplier: bonus / 10 + 1
      });
    }
    
    console.log('✅ Shop: Сгенерированы компоненты для', componentType, ':', components);
    return components;
  }, [config]);

  // Функция для получения следующего доступного апгрейда
  const getNextUpgrade = useCallback((type: string, currentLevel: string) => {
    console.log('🔍 Shop: getNextUpgrade вызвана для:', type, currentLevel);
    
    if (!config) {
      console.warn('⚠️ Shop: Config не загружен в getNextUpgrade');
      return null;
    }
    
    const getCurrentIndex = (array: any[], currentLevel: string) => {
      return array.findIndex(item => item.level === currentLevel);
    };

    let components: any[];
    try {
      switch (type) {
        case 'engine':
          components = generateComponents('engine');
          break;
        case 'gearbox':
          components = generateComponents('gearbox');
          break;
        case 'battery':
          components = generateComponents('battery');
          break;
        case 'hyperdrive':
          components = generateComponents('hyperdrive');
          break;
        case 'powerGrid':
          components = generateComponents('powerGrid');
          break;
        default:
          console.warn('⚠️ Shop: Неизвестный тип компонента:', type);
          return null;
      }
    } catch (error) {
      console.error('❌ Shop: Ошибка генерации компонентов для', type, ':', error);
      return null;
    }

    if (!components || components.length === 0) {
      console.warn('⚠️ Shop: Нет компонентов для', type);
      return null;
    }

    const currentIndex = getCurrentIndex(components, currentLevel);
    console.log('🔍 Shop: Индексы для', type, ':', { currentIndex, currentLevel, totalComponents: components.length });
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < components.length) {
      const nextUpgrade = components[nextIndex];
      console.log('✅ Shop: Найден следующий апгрейд для', type, ':', nextUpgrade);
      return nextUpgrade;
    }
    
    console.log('✅ Shop: Достигнут максимальный уровень для', type);
    return null; // Максимальный уровень достигнут
  }, [generateComponents, config]);

  // Функция для получения текущего компонента
  const getCurrentComponent = useCallback((type: string, currentLevel: string) => {
    console.log('🔍 Shop: getCurrentComponent вызвана для:', type, currentLevel);
    
    if (!config) {
      console.warn('⚠️ Shop: Config не загружен в getCurrentComponent');
      return null;
    }
    
    let components: any[];
    try {
      switch (type) {
        case 'engine':
          components = generateComponents('engine');
          break;
        case 'gearbox':
          components = generateComponents('gearbox');
          break;
        case 'battery':
          components = generateComponents('battery');
          break;
        case 'hyperdrive':
          components = generateComponents('hyperdrive');
          break;
        case 'powerGrid':
          components = generateComponents('powerGrid');
          break;
        default:
          console.warn('⚠️ Shop: Неизвестный тип компонента:', type);
          return null;
      }
    } catch (error) {
      console.error('❌ Shop: Ошибка генерации компонентов для', type, ':', error);
      return null;
    }

    if (!components || components.length === 0) {
      console.warn('⚠️ Shop: Нет компонентов для', type);
      return null;
    }

    const currentComponent = components.find(item => item.level === currentLevel);
    console.log('🔍 Shop: Текущий компонент для', type, ':', currentComponent);
    return currentComponent || components[0]; // Fallback на первый компонент
  }, [generateComponents, config]);

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

    const totalBalance = safeTokens;
    const cost = nextUpgrade.cost;
    
    console.log(`🛒 Попытка апгрейда ${type} до ${nextUpgrade.level}:`, {
      cost,
      currentBalance: totalBalance,
      purchaseInProgress,
      hasEnoughMoney: totalBalance >= cost
    });
    
    if (totalBalance < cost) {
      console.warn(`❌ Недостаточно средств: нужно ${cost}, доступно ${totalBalance} ${safeActiveTokenSymbol}`);
      alert(`Недостаточно средств! Нужно ${cost} ${safeActiveTokenSymbol}, у вас ${totalBalance} ${safeActiveTokenSymbol}`);
      return;
    }
    
    if (purchaseInProgress) {
      console.warn(`❌ Покупка уже в процессе`);
      return;
    }

    try {
      console.log(`🛒 Начинаем апгрейд ${type} до ${nextUpgrade.level} за ${cost} ${safeActiveTokenSymbol}`);
      setPurchaseInProgress(true);
      
      // Сначала тратим токены и проверяем успех с таймаутом
      console.log(`💸 Вызываем spendTokens(${cost}, { type: "${type}", level: "${nextUpgrade.level}" })`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут покупки')), 10000)
      );
      
      const success = await Promise.race([
        spendTokens(cost, { type, level: nextUpgrade.level }),
        timeoutPromise
      ]);
      
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

  // Показываем загрузку если config не загружен
  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="cyber-spinner mb-4"></div>
          <div className="text-sm opacity-70">Загрузка магазина...</div>
        </div>
      </div>
    );
  }

  const renderCategory = (
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid',
    title: string,
    currentLevel: string,
    icon: string
  ) => {
    console.log('🔍 Shop: renderCategory вызвана для:', type, {
      title,
      currentLevel,
      icon,
      safeTokens,
      purchaseInProgress
    });
    
    const currentComponent = getCurrentComponent(type, currentLevel);
    const nextUpgrade = getNextUpgrade(type, currentLevel);
    const isMaxLevel = !nextUpgrade;
    const canUpgrade = nextUpgrade && safeTokens >= nextUpgrade.cost && !purchaseInProgress;
    const isAnimating = purchaseAnimation === nextUpgrade?.level;

    console.log('🔍 Shop: renderCategory данные для', type, {
      currentComponent,
      nextUpgrade,
      isMaxLevel,
      canUpgrade,
      isAnimating
    });

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
                <div className="space-y-1 text-xs opacity-70">
                  {type === 'engine' && (
                    <>
                      <div>Мощность: {nextUpgrade.power} | КПД: {nextUpgrade.fuelEfficiency}%</div>
                      <div>Макс. температура: {nextUpgrade.maxTemp}°C</div>
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
                      <div>Емкость: {nextUpgrade.capacity}% | Заряд: {nextUpgrade.chargeRate}%/сек</div>
                      <div>Макс. температура: {nextUpgrade.maxTemp}°C</div>
                    </>
                  )}
                  {type === 'hyperdrive' && (
                    <>
                      <div>Множитель: ×{nextUpgrade.speedMultiplier} | Расход: {nextUpgrade.energyConsumption}%/сек</div>
                      <div>Порог активации: {nextUpgrade.activationThreshold}%</div>
                    </>
                  )}
                  {type === 'powerGrid' && (
                    <div>Макс. нагрузка: {nextUpgrade.maxLoad}% | КПД: {nextUpgrade.efficiency}%</div>
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
            {isMaxLevel ? 'Максимум' : `${nextUpgrade?.cost || 0} ${safeActiveTokenSymbol}`}
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
        {(() => {
          console.log('🔍 Shop: Рендерим двигатели, engineLevel:', engineLevel, 'safeEngineLevel:', safeEngineLevel);
          return renderCategory('engine', 'Двигатели', safeEngineLevel, '🚀');
        })()}
        
        {/* Коробки передач */}
        {(() => {
          console.log('🔍 Shop: Рендерим коробки передач, gearboxLevel:', gearboxLevel, 'safeGearboxLevel:', safeGearboxLevel);
          return renderCategory('gearbox', 'Коробки передач', safeGearboxLevel, '⚙️');
        })()}
        
        {/* Батареи */}
        {(() => {
          console.log('🔍 Shop: Рендерим батареи, batteryLevel:', batteryLevel, 'safeBatteryLevel:', safeBatteryLevel);
          return renderCategory('battery', 'Батареи', safeBatteryLevel, '🔋');
        })()}
        
        {/* Гипердвигатели */}
        {(() => {
          console.log('🔍 Shop: Рендерим гипердвигатели, hyperdriveLevel:', hyperdriveLevel, 'safeHyperdriveLevel:', safeHyperdriveLevel);
          return renderCategory('hyperdrive', 'Гипердвигатели', safeHyperdriveLevel, '⚡');
        })()}
        
        {/* Энергосети */}
        {(() => {
          console.log('🔍 Shop: Рендерим энергосети, powerGridLevel:', powerGridLevel, 'safePowerGridLevel:', safePowerGridLevel);
          return renderCategory('powerGrid', 'Энергосети', safePowerGridLevel, '🔌');
        })()}
      </div>
    </div>
  );
}; 