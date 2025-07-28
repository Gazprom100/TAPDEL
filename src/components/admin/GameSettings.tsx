import React, { useState, useEffect } from 'react';

interface GameConfig {
  // Основные настройки игры
  baseTokensPerTap: number;
  energyMax: number;
  energyRegenRate: number;
  
  // Настройки компонентов
  components: {
    engine: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    gearbox: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    battery: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    hyperdrive: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    powerGrid: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
  };
  
  // Настройки лидерборда
  leaderboard: {
    updateInterval: number;
    maxEntries: number;
    resetInterval: string; // 'daily', 'weekly', 'monthly', 'never'
  };
  
  // Настройки экономики
  economy: {
    withdrawalMinAmount: number;
    withdrawalFee: number;
    depositMinAmount: number;
    dailyWithdrawalLimit: number;
  };
  
  // Настройки событий
  events: {
    dailyBonus: {
      enabled: boolean;
      amount: number;
      streakBonus: number;
    };
    referralBonus: {
      enabled: boolean;
      amount: number;
      referrerBonus: number;
    };
  };
}

export const GameSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'components' | 'economy' | 'events'>('basic');
  const [config, setConfig] = useState<GameConfig>({
    baseTokensPerTap: 1,
    energyMax: 1000,
    energyRegenRate: 1,
    components: {
      engine: {
        maxLevel: 25,
        costs: [100, 200, 400, 800, 1600],
        bonuses: [2, 4, 8, 16, 32]
      },
      gearbox: {
        maxLevel: 25,
        costs: [150, 300, 600, 1200, 2400],
        bonuses: [3, 6, 12, 24, 48]
      },
      battery: {
        maxLevel: 25,
        costs: [200, 400, 800, 1600, 3200],
        bonuses: [100, 200, 400, 800, 1600]
      },
      hyperdrive: {
        maxLevel: 20,
        costs: [1000, 2000, 4000, 8000, 16000],
        bonuses: [10, 20, 40, 80, 160]
      },
      powerGrid: {
        maxLevel: 15,
        costs: [500, 1000, 2000, 4000, 8000],
        bonuses: [5, 10, 20, 40, 80]
      }
    },
    leaderboard: {
      updateInterval: 60,
      maxEntries: 100,
      resetInterval: 'weekly'
    },
    economy: {
      withdrawalMinAmount: 100,
      withdrawalFee: 0.01,
      depositMinAmount: 10,
      dailyWithdrawalLimit: 10000
    },
    events: {
      dailyBonus: {
        enabled: true,
        amount: 100,
        streakBonus: 1.5
      },
      referralBonus: {
        enabled: true,
        amount: 500,
        referrerBonus: 100
      }
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Загрузка конфигурации с сервера
  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/game-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
      } else {
        setError('Ошибка загрузки конфигурации: ' + data.error);
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигурации игры:', error);
      setError('Ошибка загрузки конфигурации');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение конфигурации
  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/admin/game-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Конфигурация игры успешно сохранена!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Ошибка сохранения: ' + data.error);
      }
    } catch (error) {
      console.error('Ошибка сохранения конфигурации:', error);
      setError('Ошибка сохранения конфигурации');
    } finally {
      setSaving(false);
    }
  };

  // Сброс к значениям по умолчанию
  const resetToDefaults = async () => {
    if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
      try {
        const response = await fetch('/api/admin/game-config/reset', {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          setConfig(data.config);
          setSuccessMessage('Настройки сброшены к значениям по умолчанию');
        } else {
          setError('Ошибка сброса настроек: ' + data.error);
        }
      } catch (error) {
        setError('Ошибка сброса настроек');
      }
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateConfig = (path: string[], value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      let current: any = newConfig;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <div className="mt-4 text-gray-400">Загрузка настроек игры...</div>
      </div>
    );
  }

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Настройки игры</h2>
          <p className="text-gray-400">Управление параметрами игрового процесса</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={resetToDefaults}
            className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Сбросить
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="admin-button px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4">
          <p className="text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Навигация по разделам */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('basic')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'basic' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎮 Основные
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'components' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚙️ Компоненты
          </button>
          <button
            onClick={() => setActiveTab('economy')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'economy' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💰 Экономика
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'events' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎁 События
          </button>
        </div>
      </div>

      {/* Основные настройки */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Базовые параметры игры</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Токенов за тап
                </label>
                <input
                  type="number"
                  value={config.baseTokensPerTap}
                  onChange={(e) => updateConfig(['baseTokensPerTap'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Максимальная энергия
                </label>
                <input
                  type="number"
                  value={config.energyMax}
                  onChange={(e) => updateConfig(['energyMax'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Скорость восстановления энергии
                </label>
                <input
                  type="number"
                  value={config.energyRegenRate}
                  onChange={(e) => updateConfig(['energyRegenRate'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Настройки лидерборда</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Интервал обновления (сек)
                </label>
                <input
                  type="number"
                  value={config.leaderboard.updateInterval}
                  onChange={(e) => updateConfig(['leaderboard', 'updateInterval'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Максимум записей
                </label>
                <input
                  type="number"
                  value={config.leaderboard.maxEntries}
                  onChange={(e) => updateConfig(['leaderboard', 'maxEntries'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Сброс лидерборда
                </label>
                <select
                  value={config.leaderboard.resetInterval}
                  onChange={(e) => updateConfig(['leaderboard', 'resetInterval'], e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="never">Никогда</option>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Настройки компонентов */}
      {activeTab === 'components' && (
        <div className="space-y-6">
          {Object.entries(config.components).map(([componentName, componentData]) => (
            <div key={componentName} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 capitalize">
                {componentName} (Макс. уровень: {componentData.maxLevel})
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Стоимости улучшений (первые 5 уровней)
                  </label>
                  <div className="space-y-2">
                    {componentData.costs.slice(0, 5).map((cost, index) => (
                      <input
                        key={index}
                        type="number"
                        value={cost}
                        onChange={(e) => {
                          const newCosts = [...componentData.costs];
                          newCosts[index] = Number(e.target.value);
                          updateConfig(['components', componentName, 'costs'], newCosts);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder={`Уровень ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Бонусы (первые 5 уровней)
                  </label>
                  <div className="space-y-2">
                    {componentData.bonuses.slice(0, 5).map((bonus, index) => (
                      <input
                        key={index}
                        type="number"
                        value={bonus}
                        onChange={(e) => {
                          const newBonuses = [...componentData.bonuses];
                          newBonuses[index] = Number(e.target.value);
                          updateConfig(['components', componentName, 'bonuses'], newBonuses);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder={`Бонус ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Настройки экономики */}
      {activeTab === 'economy' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Настройки экономики</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Минимальная сумма вывода
                </label>
                <input
                  type="number"
                  value={config.economy.withdrawalMinAmount}
                  onChange={(e) => updateConfig(['economy', 'withdrawalMinAmount'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Комиссия за вывод (%)
                </label>
                <input
                  type="number"
                  value={config.economy.withdrawalFee}
                  onChange={(e) => updateConfig(['economy', 'withdrawalFee'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Минимальная сумма депозита
                </label>
                <input
                  type="number"
                  value={config.economy.depositMinAmount}
                  onChange={(e) => updateConfig(['economy', 'depositMinAmount'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Дневной лимит вывода
                </label>
                <input
                  type="number"
                  value={config.economy.dailyWithdrawalLimit}
                  onChange={(e) => updateConfig(['economy', 'dailyWithdrawalLimit'], Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Настройки событий */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Ежедневный бонус</h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.events.dailyBonus.enabled}
                  onChange={(e) => updateConfig(['events', 'dailyBonus', 'enabled'], e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Включить ежедневный бонус</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Размер бонуса (токенов)
                  </label>
                  <input
                    type="number"
                    value={config.events.dailyBonus.amount}
                    onChange={(e) => updateConfig(['events', 'dailyBonus', 'amount'], Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    disabled={!config.events.dailyBonus.enabled}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Множитель за серию дней
                  </label>
                  <input
                    type="number"
                    value={config.events.dailyBonus.streakBonus}
                    onChange={(e) => updateConfig(['events', 'dailyBonus', 'streakBonus'], Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    step="0.1"
                    disabled={!config.events.dailyBonus.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Реферальная программа</h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.events.referralBonus.enabled}
                  onChange={(e) => updateConfig(['events', 'referralBonus', 'enabled'], e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300">Включить реферальную программу</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Бонус новому пользователю
                  </label>
                  <input
                    type="number"
                    value={config.events.referralBonus.amount}
                    onChange={(e) => updateConfig(['events', 'referralBonus', 'amount'], Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    disabled={!config.events.referralBonus.enabled}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Бонус пригласившему
                  </label>
                  <input
                    type="number"
                    value={config.events.referralBonus.referrerBonus}
                    onChange={(e) => updateConfig(['events', 'referralBonus', 'referrerBonus'], Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    disabled={!config.events.referralBonus.enabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 