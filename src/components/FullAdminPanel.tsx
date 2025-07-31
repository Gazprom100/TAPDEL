import React, { useState, useEffect } from 'react';
import { UserManagement } from './admin/UserManagement';
import { SystemMonitoring } from './admin/SystemMonitoring';
import { EconomyManagement } from './admin/EconomyManagement';
import { TokenManagement } from './admin/TokenManagement';
import { GameSettings } from './admin/GameSettings';
import { WalletBalance } from './admin/WalletBalance';
import { UserBalances } from './admin/UserBalances';
import { adminApiService, AdminStats } from '../services/adminApi';

export const FullAdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'economy' | 'tokens' | 'settings' | 'wallet' | 'userBalances'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTokens: 0,
    totalDeposits: 0,
    sumDeposits: 0,
    totalWithdrawals: 0,
    sumWithdrawals: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка статистики
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await adminApiService.getStatistics();
      setStats(statsData);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setError('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем статистику при монтировании
  useEffect(() => {
    loadStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'DEL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const handleUserUpdate = (userId: string, updates: Partial<any>) => {
    // Обновляем локальную статистику при изменении пользователя
    loadStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400 font-medium">Загрузка админ панели...</div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2 font-medium">Ошибка</div>
          <div className="text-gray-400 font-medium">{error}</div>
            <button 
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          >
            Попробовать снова
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="admin-container min-h-screen bg-gray-900 text-white">
      {/* Заголовок с улучшенной адаптивностью */}
      <div className="admin-header bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">Админ панель TAPDEL</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 font-medium">Управление игровой платформой</p>
        </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <button
              onClick={loadStats}
              className="admin-button px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium text-sm sm:text-base transition-colors duration-200"
            >
              Обновить
            </button>
            <div className="text-xs sm:text-sm text-gray-400 font-medium">
              {new Date().toLocaleString('ru-RU')}
                    </div>
                    </div>
                    </div>
                    </div>

      {/* Навигация с улучшенной адаптивностью */}
      <div className="admin-navigation bg-gray-800 border-b border-gray-700 px-4 sm:px-6 overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Обзор
                      </button>
                        <button
            onClick={() => setActiveTab('users')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'users' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Пользователи
                        </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Система
                          </button>
                          <button
            onClick={() => setActiveTab('economy')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'economy' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Экономика
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Токены
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Настройки
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'wallet'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Баланс кошельков
          </button>
          <button
            onClick={() => setActiveTab('userBalances')}
            className={`admin-nav-item py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
              activeTab === 'userBalances'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Балансы пользователей
                          </button>
        </nav>
                      </div>

      {/* Контент с улучшенной адаптивностью */}
      <div className="admin-content admin-scrollable p-4 sm:p-6 overflow-x-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">Обзор системы</h2>
            
            {/* Ключевые метрики с улучшенной адаптивностью */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Пользователи</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">{formatNumber(stats.totalUsers)}</p>
                    </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg sm:text-xl">👥</span>
                    </div>
                        </div>
                <div className="mt-2">
                  <p className="text-xs sm:text-sm text-gray-400 font-medium">Активных: {formatNumber(stats.activeUsers)}</p>
                        </div>
                      </div>

              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Токены в игре</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400 leading-tight">{formatNumber(stats.totalTokens)} BOOST</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg sm:text-xl">🎮</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs sm:text-sm text-gray-400 font-medium">В обращении</p>
                </div>
              </div>
            
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Депозиты</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 leading-tight">{formatCurrency(stats.sumDeposits)}</p>
                        </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg sm:text-xl">📈</span>
                      </div>
                    </div>
                <div className="mt-2">
                  <p className="text-xs sm:text-sm text-gray-400 font-medium">Транзакций: {formatNumber(stats.totalDeposits)}</p>
                        </div>
                        </div>

              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Выводы</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400 leading-tight">{formatCurrency(stats.sumWithdrawals)}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg sm:text-xl">📉</span>
              </div>
                        </div>
                <div className="mt-2">
                  <p className="text-xs sm:text-sm text-gray-400 font-medium">Транзакций: {formatNumber(stats.totalWithdrawals)}</p>
                      </div>
                    </div>
                  </div>
            
            {/* Быстрые действия с улучшенной адаптивностью */}
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-3 sm:px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors duration-200"
                >
                  <div className="font-medium text-sm sm:text-base">Управление пользователями</div>
                  <div className="text-xs sm:text-sm text-blue-200 font-medium">Просмотр и редактирование пользователей</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('system')}
                  className="px-3 sm:px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors duration-200"
                >
                  <div className="font-medium text-sm sm:text-base">Мониторинг системы</div>
                  <div className="text-xs sm:text-sm text-green-200 font-medium">Статус сервисов и метрики</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('economy')}
                  className="px-3 sm:px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-left transition-colors duration-200"
                >
                  <div className="font-medium text-sm sm:text-base">Управление экономикой</div>
                  <div className="text-xs sm:text-sm text-purple-200 font-medium">Аналитика и настройки</div>
                </button>

                <button
                  onClick={() => setActiveTab('tokens')}
                  className="px-3 sm:px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-left transition-colors duration-200"
                >
                  <div className="font-medium text-sm sm:text-base">Управление токенами</div>
                  <div className="text-xs sm:text-sm text-yellow-200 font-medium">Смена активного токена</div>
                </button>
              </div>
                      </div>
                      
            {/* Статистика по времени */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Активность за 24 часа</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Новых пользователей:</span>
                    <span className="text-white font-medium">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Активных сессий:</span>
                    <span className="text-white font-medium">{formatNumber(stats.activeUsers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Транзакций:</span>
                    <span className="text-white font-medium">{formatNumber(stats.totalDeposits + stats.totalWithdrawals)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Финансовая сводка</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Общий приток:</span>
                    <span className="text-green-400 font-medium">{formatCurrency(stats.sumDeposits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Общий отток:</span>
                    <span className="text-red-400 font-medium">{formatCurrency(stats.sumWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Чистый баланс:</span>
                    <span className={`font-medium ${stats.sumDeposits - stats.sumWithdrawals >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(stats.sumDeposits - stats.sumWithdrawals)}
                    </span>
                  </div>
                </div>
              </div>
                </div>
              </div>
            )}

        {activeTab === 'users' && (
          <UserManagement onUserUpdate={handleUserUpdate} />
        )}

        {activeTab === 'system' && (
          <SystemMonitoring />
        )}

        {activeTab === 'economy' && (
          <EconomyManagement />
        )}

        {activeTab === 'tokens' && (
          <TokenManagement />
        )}

        {activeTab === 'settings' && (
          <GameSettings />
        )}

        {activeTab === 'wallet' && (
          <WalletBalance />
        )}

        {activeTab === 'userBalances' && (
          <UserBalances />
        )}
      </div>
    </div>
  );
}; 