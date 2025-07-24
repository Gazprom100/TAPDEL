import React, { useEffect, useState } from 'react';
import { GAME_MECHANICS, COMPONENTS } from '../types/game';

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

export const FullAdminPanel: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'users' | 'transactions'>('overview');

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">TAPDEL Админпанель</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded ${activeTab === 'overview' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Обзор
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded ${activeTab === 'settings' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Настройки
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded ${activeTab === 'transactions' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Транзакции
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Общая статистика</h2>
            
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded">
                  <div className="text-gray-400 text-sm">Всего пользователей</div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <div className="text-gray-400 text-sm">Всего токенов</div>
                  <div className="text-2xl font-bold">{Math.floor(stats.totalTokens)} DEL</div>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <div className="text-gray-400 text-sm">Активных пользователей</div>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded">
                  <div className="text-gray-400 text-sm">Депозитов</div>
                  <div className="text-2xl font-bold">{stats.totalDeposits}</div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 p-6 rounded">
              <h3 className="text-lg font-bold mb-4">Быстрые действия</h3>
              <div className="flex space-x-4">
                <button
                  onClick={resetLeaderboard}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Сбросить лидерборд
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Настройки игры
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Настройки игры</h2>
            
            <div className="bg-gray-800 p-6 rounded">
              <h3 className="text-lg font-bold mb-4">Основные настройки</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Базовое вознаграждение</label>
                  <input
                    type="number"
                    value={baseReward}
                    onChange={(e) => setBaseReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Символ токена</label>
                  <input
                    type="text"
                    value={token.symbol}
                    onChange={(e) => setToken({...token, symbol: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-bold mb-3">Множители передач</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(GAME_MECHANICS.GEAR.MULTIPLIERS).map(([gear, multiplier]) => (
                    <div key={gear}>
                      <label className="block text-sm font-medium mb-1">{gear}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={gearMultipliers[gear] || multiplier}
                        onChange={(e) => setGearMultipliers({
                          ...gearMultipliers,
                          [gear]: Number(e.target.value)
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-bold mb-3">Стоимость компонентов</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-2">Двигатели</h5>
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
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder={`Уровень ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Коробки передач</h5>
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
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                          placeholder={`Уровень ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                  {saving ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Управление пользователями</h2>
            <div className="bg-gray-800 p-6 rounded">
              <p className="text-gray-400">Функции управления пользователями будут добавлены позже.</p>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Транзакции</h2>
            <div className="bg-gray-800 p-6 rounded">
              <p className="text-gray-400">Функции просмотра транзакций будут добавлены позже.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 