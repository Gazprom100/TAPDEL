import React, { useState, useEffect } from 'react'
import { Profile } from './components/Profile'
import { EnergyIndicator } from './components/EnergyIndicator'
import { FullAdminPanel } from './components/FullAdminPanel'
import { useGameStore } from './store/gameStore'
import { useGameMechanics } from './hooks/useGameMechanics'
import { useFullscreen } from './hooks/useFullscreen'
import { COMPONENTS } from './types/game'
import './styles/effects.css'

const App: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Инициализация полноэкранного режима Telegram WebApp
  useFullscreen();
  
  // Простая система роутинга для админпанели
  const isAdminRoute = window.location.pathname === '/admin';
  
  // Если это админский роут, показываем админпанель
  if (isAdminRoute) {
    return <FullAdminPanel />;
  }
  
  const { 
    tokens, 
    engineLevel,
    gearboxLevel,
    batteryLevel,
    powerGridLevel,
    initializeUser,
    activeTokenSymbol,
    refreshActiveToken
  } = useGameStore();

  useEffect(() => {
    if (!activeTokenSymbol) {
      refreshActiveToken();
    }
  }, [activeTokenSymbol, refreshActiveToken]);
  
  const {
    fuelLevel,
    hyperdriveCharge,
    isHyperdriveActive,
    gear,
    handleTap,
    activateHyperdrive,
    currentHyperdrive,
    getHyperdriveChargeColor
  } = useGameMechanics();

  // Получаем текущие компоненты для отображения
  const currentEngine = COMPONENTS.ENGINES.find(e => e.level === engineLevel)!;
  const currentGearbox = COMPONENTS.GEARBOXES.find(g => g.level === gearboxLevel)!;
  const currentBattery = COMPONENTS.BATTERIES.find(b => b.level === batteryLevel)!;
  const currentPowerGrid = COMPONENTS.POWER_GRIDS.find(p => p.level === powerGridLevel)!;

  // Функция для определения цвета тахометра
  const getTachometerColor = (currentGear: string, level: number) => {
    const zones = {
      'N': { color: 'rgba(100, 100, 100, 0.8)', threshold: 0 },
      '1': { color: 'rgba(0, 255, 136, 0.8)', threshold: 20 },
      '2': { color: 'rgba(255, 255, 0, 0.8)', threshold: 40 },
      '3': { color: 'rgba(255, 165, 0, 0.8)', threshold: 60 },
      '4': { color: 'rgba(255, 100, 0, 0.8)', threshold: 80 },
      'M': { color: 'rgba(255, 0, 0, 0.8)', threshold: 90 }
    };

    if (currentGear === 'N') return level > 0 ? zones['N'].color : 'rgba(100, 100, 100, 0.2)';
    if (currentGear === '1') return level <= 20 ? zones['1'].color : 'rgba(0, 255, 136, 0.2)';
    if (currentGear === '2') return level <= 40 ? (level <= 20 ? zones['1'].color : zones['2'].color) : 'rgba(255, 255, 0, 0.2)';
    if (currentGear === '3') return level <= 60 ? (level <= 20 ? zones['1'].color : level <= 40 ? zones['2'].color : zones['3'].color) : 'rgba(255, 165, 0, 0.2)';
    if (currentGear === '4') return level <= 80 ? (level <= 20 ? zones['1'].color : level <= 40 ? zones['2'].color : level <= 60 ? zones['3'].color : zones['4'].color) : 'rgba(255, 100, 0, 0.2)';
    if (currentGear === 'M') {
      if (level <= 20) return zones['1'].color;
      if (level <= 40) return zones['2'].color;
      if (level <= 60) return zones['3'].color;
      if (level <= 80) return zones['4'].color;
      return zones['M'].color;
    }
    
    return 'rgba(100, 100, 100, 0.2)';
  };

  // Функция для определения цвета аккумулятора (инвертированная логика)
  const getBatteryColor = (chargeLevel: number, activationThreshold: number) => {
    // Зеленый когда заряд достаточен для активации
    if (chargeLevel >= activationThreshold) return 'rgba(0, 255, 136, 0.8)';
    // Градиент от красного к желтому в зависимости от уровня заряда
    if (chargeLevel >= 80) return 'rgba(0, 255, 136, 0.8)'; // Зеленый
    if (chargeLevel >= 60) return 'rgba(255, 255, 0, 0.8)'; // Желтый
    if (chargeLevel >= 40) return 'rgba(255, 165, 0, 0.8)'; // Оранжевый
    if (chargeLevel >= 20) return 'rgba(255, 100, 0, 0.8)'; // Красно-оранжевый
    return 'rgba(255, 0, 0, 0.8)'; // Красный
  };

  // Рассчитываем активность тапов для отображения на шкале
  const tapActivity = gear === 'N' ? 0 : 
                     gear === '1' ? 20 :
                     gear === '2' ? 40 :
                     gear === '3' ? 60 :
                     gear === '4' ? 80 : 100;

  // Инициализация пользователя при загрузке приложения
  useEffect(() => {
    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА для остановки бесконечной миграции
    const problematicOldUserId = localStorage.getItem('oldUserId');
    if (problematicOldUserId === 'demo-user-atatvzu2f') {
      console.log('🧹 Принудительно очищаем проблемный oldUserId:', problematicOldUserId);
      localStorage.removeItem('oldUserId');
    }
    
    // Также очищаем если userId все еще demo-user-atatvzu2f
    const currentUserId = localStorage.getItem('userId');
    if (currentUserId === 'demo-user-atatvzu2f') {
      console.log('🧹 Очищаем проблемный userId:', currentUserId);
      localStorage.removeItem('userId');
    }

    console.log('🚀 App.tsx useEffect - начало инициализации');
    
    let userId = localStorage.getItem('userId');
    console.log('💾 localStorage userId:', userId);
    
    // ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА TELEGRAM ДАННЫХ НА КАЖДОМ ЗАПУСКЕ
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    console.log('📱 Текущие Telegram данные:', telegramUser);
    
    // РАСШИРЕННАЯ ДИАГНОСТИКА
    console.log('🔍 Диагностика Telegram WebApp:');
    console.log('  - window.Telegram:', !!window.Telegram);
    console.log('  - window.Telegram.WebApp:', !!window.Telegram?.WebApp);
    console.log('  - initDataUnsafe:', !!window.Telegram?.WebApp?.initDataUnsafe);
    console.log('  - user object:', !!window.Telegram?.WebApp?.initDataUnsafe?.user);
    console.log('  - user.id:', window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
    console.log('  - platform:', (window.Telegram?.WebApp as any)?.platform || 'unknown');
    console.log('  - version:', (window.Telegram?.WebApp as any)?.version || 'unknown');
    console.log('  - user agent:', navigator.userAgent);
    
    if (telegramUser?.id) {
      const correctUserId = `telegram-${telegramUser.id}`;
      console.log('🎯 Корректный userId из Telegram:', correctUserId);
      
      // Если userId отличается от правильного, обновляем
      if (userId !== correctUserId) {
        console.log('🔄 Обновляем userId для синхронизации между устройствами');
        console.log(`  Старый userId: ${userId}`);
        console.log(`  Новый userId: ${correctUserId}`);
        
        // Сохраняем старый userId для миграции, если он существует и не пустой
        if (userId && userId !== correctUserId) {
          const existingOldUserId = localStorage.getItem('oldUserId');
          if (!existingOldUserId || existingOldUserId !== userId) {
            localStorage.setItem('oldUserId', userId);
            console.log('💾 Сохранен oldUserId для миграции:', userId);
          }
        }
        
        userId = correctUserId;
        localStorage.setItem('userId', userId);
        
        // Сохраняем актуальные Telegram данные
        const userData = {
          userId: userId,
          username: telegramUser.username || `${telegramUser.first_name} ${telegramUser.last_name}`.trim(),
          telegramFirstName: telegramUser.first_name || '',
          telegramLastName: telegramUser.last_name || '',
          telegramUsername: telegramUser.username || '',
          telegramId: telegramUser.id
        };
        localStorage.setItem('telegramUserData', JSON.stringify(userData));
        console.log('✅ Обновлены Telegram данные для синхронизации:', userData);
      } else {
        console.log('✅ userId уже корректный, синхронизация не требуется');
      }
    } else {
      console.warn('⚠️ Telegram данные недоступны! Возможные причины:');
      console.warn('  1. Приложение запущено не через Telegram');
      console.warn('  2. Telegram WebApp API недоступен на этом устройстве');
      console.warn('  3. Проблемы с инициализацией WebApp');
    }
    
    if (!userId) {
      console.log('🔍 userId не найден, получаем данные из Telegram...');
      
      // Логируем доступность Telegram WebApp
      console.log('📱 window.Telegram:', !!window.Telegram);
      console.log('📱 window.Telegram.WebApp:', !!window.Telegram?.WebApp);
      console.log('📱 window.Telegram.WebApp.initDataUnsafe:', !!window.Telegram?.WebApp?.initDataUnsafe);
      console.log('📱 window.Telegram.WebApp.initDataUnsafe.user:', window.Telegram?.WebApp?.initDataUnsafe?.user);
      
      if (telegramUser?.id) {
        // Используем реальный Telegram ID
        userId = `telegram-${telegramUser.id}`;
        
        // Сохраняем дополнительные данные пользователя
        const userData = {
          userId: userId,
          username: telegramUser.username || `${telegramUser.first_name} ${telegramUser.last_name}`.trim(),
          telegramFirstName: telegramUser.first_name || '',
          telegramLastName: telegramUser.last_name || '',
          telegramUsername: telegramUser.username || '',
          telegramId: telegramUser.id
        };
        
        // Сохраняем в localStorage
        localStorage.setItem('userId', userId);
        localStorage.setItem('telegramUserData', JSON.stringify(userData));
        
        console.log('📱 Получены реальные Telegram данные:', userData);
        console.log('✅ Сохранено в localStorage как telegramUserData');
      } else {
        // Проверяем есть ли сохраненные Telegram данные
        const storedTelegramData = localStorage.getItem('telegramUserData');
        if (storedTelegramData) {
          try {
            const parsedData = JSON.parse(storedTelegramData);
            if (parsedData.telegramId) {
              userId = `telegram-${parsedData.telegramId}`;
              console.log('📱 Используем сохраненный Telegram ID:', userId);
            }
          } catch (error) {
            console.warn('⚠️ Ошибка парсинга сохраненных Telegram данных:', error);
          }
        }
        
        // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Если все еще нет Telegram данных, показываем ошибку
        if (!userId) {
          console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Приложение должно запускаться только через Telegram!');
          // Создаем временный userId для тестирования, но предупреждаем
          const browserFingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            new Date().toDateString()
          ].join('|');
          
          let hash = 0;
          for (let i = 0; i < browserFingerprint.length; i++) {
            const char = browserFingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          
          userId = `web-user-${Math.abs(hash)}`;
          console.warn('⚠️ Создан временный веб ID для тестирования:', userId);
          console.warn('⚠️ ВНИМАНИЕ: Данные не будут синхронизироваться между устройствами!');
        }
      }
      
      localStorage.setItem('userId', userId);
      console.log('💾 Установлен userId:', userId);
    } else {
      console.log('✅ userId найден в localStorage:', userId);
      
      // Проверим есть ли telegramUserData
      const storedTelegramData = localStorage.getItem('telegramUserData');
      console.log('📱 telegramUserData в localStorage:', storedTelegramData);
    }
    
    console.log('🔄 Вызываем initializeUser с userId:', userId);
    
    // Инициализируем пользователя
    initializeUser(userId).then(() => {
      console.log('✅ initializeUser завершён успешно');
      
      // Запускаем автосинхронизацию лидерборда каждые 30 секунд
      const startAutoSync = useGameStore.getState().startAutoSync;
      if (startAutoSync) {
        console.log('🚀 Запуск автосинхронизации лидерборда каждые 30 сек');
        startAutoSync();
      }
    }).catch(error => {
      console.error('❌ Ошибка initializeUser:', error);
    });

    // Останавливаем автосинхронизацию при закрытии компонента
    return () => {
      const stopAutoSync = useGameStore.getState().stopAutoSync;
      if (stopAutoSync) {
        console.log('🛑 Остановка автосинхронизации лидерборда');
        stopAutoSync();
      }
    };
  }, [initializeUser]);

  // Принудительная синхронизация при фокусе на окне (смена устройств)
  useEffect(() => {
    const handleWindowFocus = async () => {
      console.log('👁️ Окно получило фокус - принудительная синхронизация');
      const { syncGameState, refreshLeaderboard } = useGameStore.getState();
      try {
        await syncGameState();
        await refreshLeaderboard();
        console.log('✅ Принудительная синхронизация при фокусе завершена');
      } catch (error) {
        console.error('❌ Ошибка принудительной синхронизации при фокусе:', error);
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ Страница стала видимой - принудительная синхронизация');
        const { syncGameState, refreshLeaderboard } = useGameStore.getState();
        try {
          await syncGameState();
          await refreshLeaderboard();
          console.log('✅ Принудительная синхронизация при показе страницы завершена');
        } catch (error) {
          console.error('❌ Ошибка принудительной синхронизации при показе страницы:', error);
        }
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div 
      className={`cyber-container gear-${gear} ${isHyperdriveActive ? 'hyperdrive-active' : ''}`}
      style={{
        height: '100vh',
        minHeight: '-webkit-fill-available',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
      onClick={!isProfileOpen ? handleTap : undefined}
      onTouchStart={!isProfileOpen ? handleTap : undefined}
    >
      {/* Фоновые эффекты */}
      <div className="cyber-background-effects">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="cyber-glitch" />
        <div className="cyber-vignette" />
      </div>

      {/* 1. Название на самом верху в центре - сдвигаем ниже кнопок Telegram */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{
        top: 'calc(var(--safe-top) + 100px)'
      }}>
        <div className="cyber-text text-2xl sm:text-3xl md:text-4xl font-bold text-center" style={{ 
          color: '#ffcc00',
          textShadow: '0 0 20px rgba(255, 204, 0, 0.5)'
        }}>
          CYBERFLEX
        </div>
      </div>

      {/* 2. Счетчик натапанных DEL - сдвигаем ниже названия */}
      <div className="absolute z-20" style={{
        top: 'calc(var(--safe-top) + 160px)',
        left: '70px',
        right: '70px',
        height: '30px'
      }}>
        <div className="cyber-panel h-full flex items-center justify-center" style={{
          boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)'
        }}>
          <div className="text-center">
            <div className="cyber-text text-lg sm:text-xl md:text-2xl font-bold" style={{
              textShadow: '0 0 5px rgba(0, 255, 136, 0.8)'
            }}>
              {Math.floor(tokens)} {activeTokenSymbol || '...'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Два блока с информацией о компонентах - сдвигаем ниже счетчика */}
      <div className="absolute z-20" style={{
        top: 'calc(var(--safe-top) + 210px)',
        left: '70px',
        right: '70px'
      }}>
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          {/* Левый блок */}
          <div className="flex-1 cyber-panel p-2 sm:p-2.5 md:p-3" style={{
            boxShadow: '0 0 5px rgba(0, 255, 136, 0.2)'
          }}>
            <div className="cyber-text mb-1 sm:mb-2" style={{ fontSize: '6px' }}>ДВИГАТЕЛЬ & КПП</div>
            <div className="cyber-text" style={{ fontSize: '5px' }}>
              {currentEngine.level} • {currentEngine.power}W • {currentEngine.fuelEfficiency}%
            </div>
            <div className="cyber-text" style={{ fontSize: '5px' }}>
              {currentGearbox.level} • {currentGearbox.gear}x • {currentGearbox.switchTime}ms
            </div>
          </div>
          
          {/* Правый блок */}
          <div className="flex-1 cyber-panel p-2 sm:p-2.5 md:p-3" style={{
            boxShadow: '0 0 5px rgba(0, 255, 136, 0.2)'
          }}>
            <div className="cyber-text mb-1 sm:mb-2" style={{ fontSize: '6px' }}>БАТАРЕЯ & СЕТЬ</div>
            <div className="cyber-text" style={{ fontSize: '5px' }}>
              {currentBattery.level} • {currentBattery.capacity}% • {currentBattery.chargeRate}%/s
            </div>
            <div className="cyber-text" style={{ fontSize: '5px' }}>
              {currentPowerGrid.level} • {currentPowerGrid.efficiency}% • {currentPowerGrid.maxLoad}W
            </div>
          </div>
        </div>
      </div>

      {/* 5. Левая шкала тахометра (активность тапанья) */}
      <div className="absolute left-1 sm:left-2 md:left-4 top-0 bottom-0 z-20 flex items-center">
        <div className="cyber-scale" style={{
          width: '34px',
          height: 'calc(100vh - 40px)',
          marginTop: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(to bottom, rgba(0, 255, 136, 0.1), rgba(0, 100, 50, 0.1))',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: `0 0 15px rgba(0, 255, 136, 0.3), inset 0 0 15px rgba(0, 255, 136, 0.1)`,
          overflow: 'hidden'
        }}>
          {/* Фоновое свечение тахометра */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${tapActivity}%`,
            background: `linear-gradient(to top, 
              ${getTachometerColor(gear, 20)}, 
              ${getTachometerColor(gear, tapActivity)})`,
            transition: 'height 0.2s ease-out',
            boxShadow: `0 0 8px ${getTachometerColor(gear, tapActivity)}`
          }} />
          
          {/* 100 градаций шкалы тахометра */}
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 1}%`,
                left: i % 10 === 0 ? '3px' : '6px',
                right: '3px',
                height: i % 10 === 0 ? '2px' : '1px',
                background: tapActivity >= (100 - i) ? 
                  getTachometerColor(gear, 100 - i) : 
                  'rgba(100, 100, 100, 0.2)',
                boxShadow: tapActivity >= (100 - i) ? 
                  `0 0 3px ${getTachometerColor(gear, 100 - i)}` : 'none'
              }}
            />
          ))}
          
          {/* Индикатор текущего уровня тахометра */}
          <div style={{
            position: 'absolute',
            bottom: `${tapActivity}%`,
            left: '-2px',
            right: '-2px',
            height: '3px',
            background: getTachometerColor(gear, tapActivity),
            boxShadow: `0 0 12px ${getTachometerColor(gear, tapActivity)}`,
            transition: 'bottom 0.2s ease-out',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      {/* 6. Правая шкала заряда батареи */}
      <div className="absolute right-1 sm:right-2 md:right-4 top-0 bottom-0 z-20 flex items-center">
        <div className="cyber-scale" style={{
          width: '34px',
          height: 'calc(100vh - 40px)',
          marginTop: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(to bottom, rgba(0, 255, 136, 0.1), rgba(255, 0, 0, 0.1))',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: `
            0 0 ${15 + hyperdriveCharge / 5}px ${getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold).replace('0.8', '0.4')},
            inset 0 0 15px rgba(0, 255, 136, 0.1)
          `,
          overflow: 'hidden'
        }}>
          {/* Фоновое свечение */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${hyperdriveCharge}%`,
            background: `linear-gradient(to top, 
              ${getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold)}, 
              ${getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold)})`,
            transition: 'height 0.3s ease-out',
            boxShadow: `0 0 ${8 + hyperdriveCharge / 10}px ${getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold)}`
          }} />
          
          {/* 100 градаций шкалы */}
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${i * 1}%`,
                left: i % 10 === 0 ? '3px' : '6px',
                right: '3px',
                height: i % 10 === 0 ? '2px' : '1px',
                background: hyperdriveCharge >= (100 - i) ? 
                  getBatteryColor(100 - i, currentHyperdrive.activationThreshold) : 
                  'rgba(100, 100, 100, 0.2)',
                boxShadow: hyperdriveCharge >= (100 - i) ? 
                  `0 0 3px ${getBatteryColor(100 - i, currentHyperdrive.activationThreshold)}` : 'none'
              }}
            />
          ))}
          
          {/* Индикатор текущего уровня */}
          <div style={{
            position: 'absolute',
            bottom: `${hyperdriveCharge}%`,
            left: '-2px',
            right: '-2px',
            height: '3px',
            background: getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold),
            boxShadow: `0 0 12px ${getBatteryColor(hyperdriveCharge, currentHyperdrive.activationThreshold)}`,
            transition: 'bottom 0.3s ease-out',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      {/* Центральная кнопка с топливом */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div 
          className="pointer-events-auto relative"
          onClick={(e) => {
            e.stopPropagation();
            handleTap();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleTap();
          }}
          style={{
            width: 'clamp(280px, 35vw, 400px)',
            height: 'clamp(280px, 35vw, 400px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
            border: '2px solid var(--glow-color)',
            boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)'
          }}
        >
          {/* Центральная область с топливом */}
          <div style={{
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: `radial-gradient(circle, 
              rgba(0, 0, 0, 0.95) 0%, 
              rgba(0, 50, 25, 0.9) 50%, 
              rgba(0, 100, 50, 0.3) 100%)`,
            border: '2px solid rgba(0, 255, 136, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `
              inset 0 0 30px rgba(0, 255, 136, 0.3),
              0 0 30px rgba(0, 255, 136, 0.4)
            `,
            position: 'relative'
          }}>
            {/* Основной текст - топливо */}
            <div className="cyber-text text-2xl sm:text-3xl md:text-4xl font-bold" style={{
              color: fuelLevel > 50 ? '#00ff88' : fuelLevel > 20 ? '#ffaa00' : '#ff4444',
              textShadow: `0 0 20px currentColor`,
              zIndex: 10,
              position: 'relative'
            }}>
              {Math.floor(fuelLevel)}%
        </div>

            <div className="cyber-text text-sm opacity-80" style={{
              color: '#00ff88',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
              zIndex: 10,
              position: 'relative',
              marginTop: '5px'
            }}>
              ТОПЛИВО
        </div>

            {/* Передача */}
            <div className="cyber-text text-sm opacity-80" style={{
              color: '#00ff88',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
              zIndex: 10,
              position: 'relative',
              marginTop: '5px'
            }}>
              GEAR {gear}
            </div>

            {/* Гипердвигатель индикатор */}
            {isHyperdriveActive && (
              <div 
                className="pulse-effect cyber-text text-xs" 
                style={{
                  color: '#ff0080',
                  textShadow: '0 0 15px rgba(255, 0, 128, 0.8)',
                  zIndex: 10,
                  position: 'relative',
                  marginTop: '3px'
                }}
              >
                HYPERDRIVE x{currentHyperdrive.speedMultiplier}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопки внизу по центру - учитываем safe-area */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2.5 z-20" style={{
        bottom: 'calc(var(--safe-bottom) + 20px)'
      }}>
        {/* Кнопка гипердвигателя */}
        <button
          onClick={activateHyperdrive}
          className={`cyber-button-small ${isHyperdriveActive ? 'active' : ''}`}
          disabled={isHyperdriveActive || hyperdriveCharge < currentHyperdrive.activationThreshold}
          style={{
            opacity: isHyperdriveActive ? 0.8 : (hyperdriveCharge >= currentHyperdrive.activationThreshold ? 1 : 0.6)
          }}
        >
          {isHyperdriveActive ? 'АКТИВЕН' : 'ЗАПУСК'}
        </button>

        {/* Кнопка профиля */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="cyber-button-small"
        >
          Профиль
        </button>
      </div>

      {/* Модальное окно профиля */}
      {isProfileOpen && (
        <Profile onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  )
}

export default App;