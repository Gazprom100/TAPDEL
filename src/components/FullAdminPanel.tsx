import React, { useEffect, useState } from 'react';
import { GAME_MECHANICS, COMPONENTS } from '../types/game';
import '../styles/admin.css';
import { UserManagement } from './admin/UserManagement';
import { SystemMonitoring } from './admin/SystemMonitoring';

interface AdminStats {
  totalUsers: number;
  totalTokens: number;
  totalDeposits: number;
  sumDeposits: number;
  totalWithdrawals: number;
  sumWithdrawals: number;
  activeUsers: number;
}

interface TokenConfig {
  symbol: string;
  contractAddress: string;
  decimals: number;
}

interface GameSettings {
  token: TokenConfig;
  gameMechanics: {
    baseReward: number;
    maxFingers: number;
    rateWindow: number;
  };
  gearMultipliers: Record<string, number>;
  gearThresholds: Record<string, number>;
  energy: {
    recoveryRate: number;
    consumptionRate: Record<string, number>;
  };
  components: {
    engines: number[];
    gearboxes: number[];
    batteries: number[];
    hyperdrives: number[];
    powerGrids: number[];
  };
}

// Компонент для кругового прогресса
const CircularProgress: React.FC<{ value: number; max: number; size?: number; color?: string; label: string }> = ({ 
  value, max, size = 120, color = '#3B82F6', label 
}) => {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{percentage}%</div>
            <div className="text-xs text-gray-400">{value.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-300 mt-2">{label}</div>
    </div>
  );
};

// Компонент для карточки статистики
const StatCard: React.FC<{ title: string; value: string | number; change?: string; icon?: string; color?: string }> = ({ 
  title, value, change, icon, color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className="text-sm text-green-400 mt-1">{change}</p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
            <span className="text-white text-xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для графика активности
const ActivityChart: React.FC<{ data: number[]; labels: string[]; title: string }> = ({ data, labels, title }) => {
  const maxValue = Math.max(...data);
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="flex items-end space-x-2 h-32">
        {data.map((value, index) => {
          const height = (value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                style={{ height: `${height}%` }}
              />
              <div className="text-xs text-gray-400 mt-2">{labels[index]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FullAdminPanel: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'settings' | 'users' | 'transactions' | 'monitoring'>('dashboard');

  // Локальные копии для редактирования
  const [token, setToken] = useState<TokenConfig>({ symbol: 'DEL', contractAddress: '', decimals: 18 });
  const [baseReward, setBaseReward] = useState(1);
  const [gearMultipliers, setGearMultipliers] = useState<Record<string, number>>({});
  const [gearThresholds, setGearThresholds] = useState<Record<string, number>>({});
  const [energyRecovery, setEnergyRecovery] = useState(0.033);
  const [energyConsumption, setEnergyConsumption] = useState<Record<string, number>>({});
  const [engineCosts, setEngineCosts] = useState<number[]>([]);
  const [gearboxCosts, setGearboxCosts] = useState<number[]>([]);
  const [batteryCosts, setBatteryCosts] = useState<number[]>([]);
  const [hyperdriveCosts, setHyperdriveCosts] = useState<number[]>([]);
  const [powerGridCosts, setPowerGridCosts] = useState<number[]>([]);

  // Моковые данные для демонстрации
  const mockActivityData = [65, 78, 90, 85, 92, 88, 95];
  const mockActivityLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const mockGearData = [120, 85, 65, 45, 30, 15];
  const mockGearLabels = ['N', '1', '2', '3', '4', 'M'];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/statistics').then(res => res.json()),
      fetch('/api/admin/settings').then(res => res.json())
    ])
      .then(([statsData, settingsData]) => {
        setStats(statsData);
        setSettings(settingsData);
        
        // Инициализируем локальные копии
        setToken(settingsData.token);
        setBaseReward(settingsData.gameMechanics.baseReward);
        setGearMultipliers(settingsData.gearMultipliers);
        setGearThresholds(settingsData.gearThresholds);
        setEnergyRecovery(settingsData.energy.recoveryRate);
        setEnergyConsumption(settingsData.energy.consumptionRate);
        setEngineCosts(settingsData.components.engines);
        setGearboxCosts(settingsData.components.gearboxes);
        setBatteryCosts(settingsData.components.batteries);
        setHyperdriveCosts(settingsData.components.hyperdrives);
        setPowerGridCosts(settingsData.components.powerGrids);
        
        setLoading(false);
      })
      .catch(e => {
        setError('Ошибка загрузки данных');
        setLoading(false);
      });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = {
        token,
        gameMechanics: {
          baseReward,
          maxFingers: 5,
          rateWindow: 1000
        },
        gearMultipliers,
        gearThresholds,
        energy: {
          recoveryRate: energyRecovery,
          consumptionRate: energyConsumption
        },
        components: {
          engines: engineCosts,
          gearboxes: gearboxCosts,
          batteries: batteryCosts,
          hyperdrives: hyperdriveCosts,
          powerGrids: powerGridCosts
        }
      };

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        alert('Настройки сохранены успешно!');
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      setError('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const resetLeaderboard = async () => {
    if (!confirm('Вы уверены, что хотите сбросить лидерборд? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Лидерборд сброшен успешно!');
        // Перезагружаем статистику
        const statsData = await fetch('/api/admin/statistics').then(res => res.json());
        setStats(statsData);
      } else {
        throw new Error('Ошибка сброса');
      }
    } catch (error) {
      setError('Ошибка сброса лидерборда');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Загрузка админпанели...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4 text-red-500">Ошибка</div>
          <div className="text-gray-400">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="admin-header bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TAPDEL Dashboard</h1>
            <p className="text-gray-400 mt-1">Панель управления игровой системой</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Администратор</div>
              <div className="font-semibold">Evgeni_Krasnov</div>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="admin-navigation bg-gray-800 border-b border-gray-700 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'dashboard' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Дашборд
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'analytics' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            📈 Аналитика
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'settings' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            ⚙️ Настройки
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'users' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Пользователи
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'transactions' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            💰 Транзакции
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`admin-nav-item py-4 px-2 border-b-2 font-medium ${
              activeTab === 'monitoring' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Мониторинг
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content p-6">
        {activeTab === 'dashboard' && (
                      <div className="admin-scrollable space-y-6">
              {/* Top Stats Cards */}
              <div className="admin-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Всего пользователей" 
                value={stats?.totalUsers || 0} 
                change="+12% за неделю"
                icon="👥"
                color="blue"
              />
              <StatCard 
                title="Общий баланс DEL" 
                value={`${Math.floor((stats?.totalTokens || 0) / 1000)}K DEL`}
                change="+8% за день"
                icon="💰"
                color="green"
              />
              <StatCard 
                title="Активные пользователи" 
                value={stats?.activeUsers || 0}
                change="+5% за час"
                icon="🔥"
                color="purple"
              />
              <StatCard 
                title="Транзакций сегодня" 
                value={(stats?.totalDeposits || 0) + (stats?.totalWithdrawals || 0)}
                change="+15% за день"
                icon="📊"
                color="yellow"
              />
            </div>

            {/* Charts Row */}
            <div className="admin-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ActivityChart 
                data={mockActivityData} 
                labels={mockActivityLabels} 
                title="Активность за неделю"
              />
              <ActivityChart 
                data={mockGearData} 
                labels={mockGearLabels} 
                title="Использование передач"
              />
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Прогресс системы</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Выполнение плана</span>
                      <span>73%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '73%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Стабильность сервера</span>
                      <span>99.8%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.8%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Скорость ответа API</span>
                      <span>45ms</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="admin-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <CircularProgress 
                value={stats?.totalUsers || 0} 
                max={1000} 
                label="Пользователи"
                color="#3B82F6"
              />
              <CircularProgress 
                value={stats?.totalTokens || 0} 
                max={1000000} 
                label="DEL Токены"
                color="#10B981"
              />
              <CircularProgress 
                value={stats?.totalDeposits || 0} 
                max={100} 
                label="Депозиты"
                color="#8B5CF6"
              />
              <CircularProgress 
                value={stats?.totalWithdrawals || 0} 
                max={50} 
                label="Выводы"
                color="#F59E0B"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Быстрые действия</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={resetLeaderboard}
                  className="admin-button px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  🔄 Сбросить лидерборд
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="admin-button px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  ⚙️ Настройки игры
                </button>
                <button className="admin-button px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors">
                  📊 Экспорт данных
                </button>
                <button className="admin-button px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
                  🔔 Уведомления
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Аналитика и метрики</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Топ игроков</h3>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <div key={rank} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 1 ? 'bg-yellow-500' : 
                          rank === 2 ? 'bg-gray-400' : 
                          rank === 3 ? 'bg-orange-600' : 'bg-gray-600'
                        }`}>
                          {rank}
                        </div>
                        <div>
                          <div className="font-medium">Игрок {rank}</div>
                          <div className="text-sm text-gray-400">{10000 - rank * 1000} DEL</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Уровень {rank + 5}</div>
                        <div className="text-xs text-green-400">+{rank * 5}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Статистика передач</h3>
                <div className="space-y-4">
                  {Object.entries(GAME_MECHANICS.GEAR.MULTIPLIERS).map(([gear, multiplier]) => (
                    <div key={gear} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">
                          {gear}
                        </div>
                        <div>
                          <div className="font-medium">Передача {gear}</div>
                          <div className="text-sm text-gray-400">Множитель: {multiplier}x</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{Math.floor(Math.random() * 100)}%</div>
                        <div className="text-xs text-gray-400">использование</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Настройки игры</h2>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-6">Основные параметры</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Базовое вознаграждение</label>
                                      <input
                      type="number"
                      value={baseReward}
                      onChange={(e) => setBaseReward(Number(e.target.value))}
                      className="admin-input w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Символ токена</label>
                                      <input
                      type="text"
                      value={token.symbol}
                      onChange={(e) => setToken({...token, symbol: e.target.value})}
                      className="admin-input w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-md font-semibold text-white mb-4">Множители передач</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(GAME_MECHANICS.GEAR.MULTIPLIERS).map(([gear, multiplier]) => (
                    <div key={gear} className="bg-gray-700 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Передача {gear}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gearMultipliers[gear] || multiplier}
                        onChange={(e) => setGearMultipliers({
                          ...gearMultipliers,
                          [gear]: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-md font-semibold text-white mb-4">Стоимость компонентов</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-300 mb-3">Двигатели</h5>
                    <div className="space-y-2">
                      {engineCosts.map((cost, index) => (
                        <input
                          key={index}
                          type="number"
                          value={cost}
                          onChange={(e) => {
                            const newCosts = [...engineCosts];
                            newCosts[index] = Number(e.target.value);
                            setEngineCosts(newCosts);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Уровень ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-300 mb-3">Коробки передач</h5>
                    <div className="space-y-2">
                      {gearboxCosts.map((cost, index) => (
                        <input
                          key={index}
                          type="number"
                          value={cost}
                          onChange={(e) => {
                            const newCosts = [...gearboxCosts];
                            newCosts[index] = Number(e.target.value);
                            setGearboxCosts(newCosts);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Уровень ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="admin-button px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Сохранение...' : '💾 Сохранить настройки'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <UserManagement onUserUpdate={(userId, updates) => {
            console.log('Обновление пользователя:', userId, updates);
            // Здесь будет API вызов для обновления пользователя
          }} />
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Транзакции</h2>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400">Функции просмотра транзакций будут добавлены позже.</p>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <SystemMonitoring />
        )}
      </div>
    </div>
  );
}; 