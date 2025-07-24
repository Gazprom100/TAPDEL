import React, { useState, useEffect } from 'react';
import { GAME_MECHANICS } from '../../types/game';

interface EconomyMetrics {
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  averageDeposit: number;
  averageWithdrawal: number;
  dailyVolume: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface GameMechanics {
  baseReward: number;
  energyRecoveryRate: number;
  energyConsumptionRate: number;
  gearMultipliers: Record<string, number>;
  componentCosts: {
    engines: number[];
    gearboxes: number[];
    batteries: number[];
    hyperdrives: number[];
    powerGrids: number[];
  };
  withdrawalLimits: {
    min: number;
    max: number;
    daily: number;
  };
  depositBonuses: {
    enabled: boolean;
    percentage: number;
    minAmount: number;
  };
}

interface EconomicTrend {
  date: string;
  deposits: number;
  withdrawals: number;
  netFlow: number;
  activeUsers: number;
}

export const EconomyManagement: React.FC = () => {
  const [metrics, setMetrics] = useState<EconomyMetrics>({
    totalInflow: 150000,
    totalOutflow: 120000,
    netBalance: 30000,
    averageDeposit: 2500,
    averageWithdrawal: 1800,
    dailyVolume: 8500,
    weeklyGrowth: 12.5,
    monthlyGrowth: 8.3
  });

  const [mechanics, setMechanics] = useState<GameMechanics>({
    baseReward: 1,
    energyRecoveryRate: 0.033,
    energyConsumptionRate: 0.1,
    gearMultipliers: GAME_MECHANICS.GEAR.MULTIPLIERS,
    componentCosts: {
      engines: [100, 250, 500, 1000, 2000],
      gearboxes: [150, 300, 600, 1200, 2400],
      batteries: [200, 400, 800, 1600, 3200],
      hyperdrives: [500, 1000, 2000, 4000, 8000],
      powerGrids: [300, 600, 1200, 2400, 4800]
    },
    withdrawalLimits: {
      min: 100,
      max: 10000,
      daily: 50000
    },
    depositBonuses: {
      enabled: true,
      percentage: 5,
      minAmount: 1000
    }
  });

  const [trends, setTrends] = useState<EconomicTrend[]>([]);
  const [autoAdjustments, setAutoAdjustments] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Генерация данных трендов
  useEffect(() => {
    const generateTrends = () => {
      const data: EconomicTrend[] = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          deposits: Math.floor(Math.random() * 5000) + 2000,
          withdrawals: Math.floor(Math.random() * 4000) + 1500,
          netFlow: Math.floor(Math.random() * 2000) - 1000,
          activeUsers: Math.floor(Math.random() * 500) + 200
        });
      }
      setTrends(data);
    };
    generateTrends();
  }, []);

  const handleSaveMechanics = async () => {
    setSaving(true);
    try {
      // Здесь будет API вызов для сохранения настроек
      console.log('Сохранение игровых механик:', mechanics);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация API
      alert('Настройки экономики сохранены успешно!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAdjustment = async () => {
    if (!confirm('Включить автоматические корректировки экономики?')) return;
    
    setAutoAdjustments(true);
    // Здесь будет логика автоматических корректировок
    console.log('Автоматические корректировки включены');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DEL`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? '📈' : '📉';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Управление экономикой</h2>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Общий приток</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(metrics.totalInflow)}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Общий отток</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(metrics.totalOutflow)}</p>
            </div>
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Чистый баланс</p>
              <p className={`text-2xl font-bold ${metrics.netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(metrics.netBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">⚖️</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Дневной объем</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(metrics.dailyVolume)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Рост и тренды */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Рост экономики</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Недельный рост</span>
              <div className="flex items-center space-x-2">
                <span className={getGrowthColor(metrics.weeklyGrowth)}>
                  {getGrowthIcon(metrics.weeklyGrowth)} {metrics.weeklyGrowth}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Месячный рост</span>
              <div className="flex items-center space-x-2">
                <span className={getGrowthColor(metrics.monthlyGrowth)}>
                  {getGrowthIcon(metrics.monthlyGrowth)} {metrics.monthlyGrowth}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Средний депозит</span>
              <span className="text-white font-medium">{formatCurrency(metrics.averageDeposit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Средний вывод</span>
              <span className="text-white font-medium">{formatCurrency(metrics.averageWithdrawal)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Автоматические корректировки</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Статус</span>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${autoAdjustments ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">{autoAdjustments ? 'Активны' : 'Неактивны'}</span>
              </div>
            </div>
            <button
              onClick={handleAutoAdjustment}
              className="admin-button w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {autoAdjustments ? 'Отключить' : 'Включить'} автокорректировки
            </button>
            <p className="text-xs text-gray-400">
              Автоматические корректировки балансируют экономику на основе метрик
            </p>
          </div>
        </div>
      </div>

      {/* Настройки игровых механик */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Настройки игровых механик</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold text-white mb-4">Основные параметры</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Базовое вознаграждение</label>
                <input
                  type="number"
                  step="0.1"
                  value={mechanics.baseReward}
                  onChange={(e) => setMechanics(prev => ({ ...prev, baseReward: Number(e.target.value) }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Скорость восстановления энергии</label>
                <input
                  type="number"
                  step="0.001"
                  value={mechanics.energyRecoveryRate}
                  onChange={(e) => setMechanics(prev => ({ ...prev, energyRecoveryRate: Number(e.target.value) }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Расход энергии</label>
                <input
                  type="number"
                  step="0.01"
                  value={mechanics.energyConsumptionRate}
                  onChange={(e) => setMechanics(prev => ({ ...prev, energyConsumptionRate: Number(e.target.value) }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-white mb-4">Лимиты выводов</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Минимальный вывод</label>
                <input
                  type="number"
                  value={mechanics.withdrawalLimits.min}
                  onChange={(e) => setMechanics(prev => ({ 
                    ...prev, 
                    withdrawalLimits: { ...prev.withdrawalLimits, min: Number(e.target.value) }
                  }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Максимальный вывод</label>
                <input
                  type="number"
                  value={mechanics.withdrawalLimits.max}
                  onChange={(e) => setMechanics(prev => ({ 
                    ...prev, 
                    withdrawalLimits: { ...prev.withdrawalLimits, max: Number(e.target.value) }
                  }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Дневной лимит</label>
                <input
                  type="number"
                  value={mechanics.withdrawalLimits.daily}
                  onChange={(e) => setMechanics(prev => ({ 
                    ...prev, 
                    withdrawalLimits: { ...prev.withdrawalLimits, daily: Number(e.target.value) }
                  }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Множители передач */}
        <div className="mt-8">
          <h4 className="text-md font-semibold text-white mb-4">Множители передач</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(mechanics.gearMultipliers).map(([gear, multiplier]) => (
              <div key={gear} className="bg-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Передача {gear}</label>
                <input
                  type="number"
                  step="0.1"
                  value={multiplier}
                  onChange={(e) => setMechanics(prev => ({
                    ...prev,
                    gearMultipliers: { ...prev.gearMultipliers, [gear]: Number(e.target.value) }
                  }))}
                  className="admin-input w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Бонусы за депозиты */}
        <div className="mt-8">
          <h4 className="text-md font-semibold text-white mb-4">Бонусы за депозиты</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={mechanics.depositBonuses.enabled}
                onChange={(e) => setMechanics(prev => ({
                  ...prev,
                  depositBonuses: { ...prev.depositBonuses, enabled: e.target.checked }
                }))}
                className="admin-input rounded border-gray-600 bg-gray-700"
              />
              <label className="text-sm font-medium text-gray-300">Включить бонусы</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Процент бонуса</label>
              <input
                type="number"
                value={mechanics.depositBonuses.percentage}
                onChange={(e) => setMechanics(prev => ({
                  ...prev,
                  depositBonuses: { ...prev.depositBonuses, percentage: Number(e.target.value) }
                }))}
                className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Минимальная сумма</label>
              <input
                type="number"
                value={mechanics.depositBonuses.minAmount}
                onChange={(e) => setMechanics(prev => ({
                  ...prev,
                  depositBonuses: { ...prev.depositBonuses, minAmount: Number(e.target.value) }
                }))}
                className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSaveMechanics}
            disabled={saving}
            className="admin-button px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Сохранение...' : '💾 Сохранить настройки экономики'}
          </button>
        </div>
      </div>

      {/* График трендов */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Тренды экономики (30 дней)</h3>
        <div className="h-64 flex items-end space-x-1">
          {trends.slice(-7).map((trend, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t mb-1" 
                   style={{ height: `${(trend.deposits / 5000) * 100}%` }}></div>
              <div className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t mb-1" 
                   style={{ height: `${(trend.withdrawals / 5000) * 100}%` }}></div>
              <div className="text-xs text-gray-400">{new Date(trend.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-sm text-gray-400">Депозиты</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-sm text-gray-400">Выводы</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 