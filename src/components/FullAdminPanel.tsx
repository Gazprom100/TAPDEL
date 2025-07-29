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
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400">Загрузка админ панели...</div>
        </div>
      </div>
    );
  }

  if (error) {
  return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">Ошибка</div>
          <div className="text-gray-400">{error}</div>
            <button 
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Попробовать снова
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="admin-container min-h-screen bg-gray-900 text-white">
      {/* Заголовок */}
      <div className="admin-header bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Админ панель TAPDEL</h1>
            <p className="text-gray-400">Управление игровой платформой</p>
        </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadStats}
              className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Обновить
            </button>
            <div className="text-sm text-gray-400">
              {new Date().toLocaleString('ru-RU')}
                    </div>
                    </div>
                    </div>
                    </div>

      {/* Навигация */}
      <div className="admin-navigation bg-gray-800 border-b border-gray-700 px-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Обзор
                      </button>
                        <button
            onClick={() => setActiveTab('users')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'users' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Пользователи
                        </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Система
                          </button>
                          <button
            onClick={() => setActiveTab('economy')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'economy' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Экономика
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Токены
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Настройки
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'wallet'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Баланс кошельков
          </button>
          <button
            onClick={() => setActiveTab('userBalances')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'userBalances'
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Балансы пользователей
                          </button>
        </nav>
                      </div>

      {/* Контент */}
      <div className="admin-content admin-scrollable p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Обзор системы</h2>
            
            {/* Ключевые метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                        <div>
                    <p className="text-sm font-medium text-gray-400">Пользователи</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(stats.totalUsers)}</p>
                    </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">👥</span>
                    </div>
                        </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Активных: {formatNumber(stats.activeUsers)}</p>
                        </div>
                      </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Токены в игре</p>
                    <p className="text-2xl font-bold text-yellow-400">{formatNumber(stats.totalTokens)} BOOST</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🎮</span>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">В обращении</p>
                </div>
              </div>
            
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                        <div>
                    <p className="text-sm font-medium text-gray-400">Депозиты</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.sumDeposits)}</p>
                        </div>
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">📈</span>
                      </div>
                    </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Транзакций: {formatNumber(stats.totalDeposits)}</p>
                        </div>
                        </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Выводы</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.sumWithdrawals)}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">📉</span>
              </div>
                        </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400">Транзакций: {formatNumber(stats.totalWithdrawals)}</p>
                      </div>
                    </div>
                  </div>
            
            {/* Быстрые действия */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left"
                >
                  <div className="font-medium">Управление пользователями</div>
                  <div className="text-sm text-blue-200">Просмотр и редактирование пользователей</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('system')}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left"
                >
                  <div className="font-medium">Мониторинг системы</div>
                  <div className="text-sm text-green-200">Статус сервисов и метрики</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('economy')}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-left"
                >
                  <div className="font-medium">Управление экономикой</div>
                  <div className="text-sm text-purple-200">Аналитика и настройки</div>
                </button>

                <button
                  onClick={() => setActiveTab('tokens')}
                  className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-left"
                >
                  <div className="font-medium">Управление токенами</div>
                  <div className="text-sm text-yellow-200">Смена активного токена</div>
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