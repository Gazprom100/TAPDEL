import React, { useState, useEffect } from 'react';
import { adminApiService } from '../../services/adminApi';

interface EconomyMetrics {
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  averageDeposit: number;
  averageWithdrawal: number;
  totalTokens: number;
  activeUsers: number;
}

interface AnalyticsReport {
  newUsers?: number;
  activeUsers?: number;
  retentionRate?: number;
  deposits?: number;
  withdrawals?: number;
  successRate?: number;
  totalInflow?: number;
  totalOutflow?: number;
  netRevenue?: number;
}

export const EconomyManagement: React.FC = () => {
  const [metrics, setMetrics] = useState<EconomyMetrics>({
    totalInflow: 0,
    totalOutflow: 0,
    netBalance: 0,
    averageDeposit: 0,
    averageWithdrawal: 0,
    totalTokens: 0,
    activeUsers: 0
  });
  
  const [userReport, setUserReport] = useState<AnalyticsReport>({});
  const [transactionReport, setTransactionReport] = useState<AnalyticsReport>({});
  const [revenueReport, setRevenueReport] = useState<AnalyticsReport>({});
  
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка экономических данных
  const loadEconomyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем все данные параллельно
      const [metricsData, userReportData, transactionReportData, revenueReportData] = await Promise.all([
        adminApiService.getEconomyMetrics(),
        adminApiService.getAnalyticsReports('users', selectedPeriod),
        adminApiService.getAnalyticsReports('transactions', selectedPeriod),
        adminApiService.getAnalyticsReports('revenue', selectedPeriod)
      ]);
      
      setMetrics(metricsData);
      setUserReport(userReportData);
      setTransactionReport(transactionReportData);
      setRevenueReport(revenueReportData);
    } catch (error) {
      console.error('Ошибка загрузки экономических данных:', error);
      setError('Ошибка загрузки экономических данных');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при изменении периода
  useEffect(() => {
    loadEconomyData();
  }, [selectedPeriod]);

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

  const getPercentageColor = (value: number) => {
    if (value >= 0) return 'text-green-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400">Загрузка экономических данных...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">Ошибка</div>
          <div className="text-gray-400">{error}</div>
          <button 
            onClick={loadEconomyData}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Управление экономикой</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">За 24 часа</option>
            <option value="7d">За 7 дней</option>
            <option value="30d">За 30 дней</option>
          </select>
          <button
            onClick={loadEconomyData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Общий приток</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(metrics.totalInflow)}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📈</span>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400">Средний депозит: {formatCurrency(metrics.averageDeposit)}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Общий отток</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(metrics.totalOutflow)}</p>
            </div>
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📉</span>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400">Средний вывод: {formatCurrency(metrics.averageWithdrawal)}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Чистый баланс</p>
              <p className={`text-2xl font-bold ${getPercentageColor(metrics.netBalance)}`}>
                {formatCurrency(metrics.netBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400">Активных пользователей: {formatNumber(metrics.activeUsers)}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Токены в игре</p>
              <p className="text-2xl font-bold text-yellow-400">{formatNumber(metrics.totalTokens)} BOOST</p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🎮</span>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400">В обращении</p>
          </div>
        </div>
      </div>

      {/* Аналитические отчеты */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Отчет по пользователям */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Пользователи</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Новых пользователей:</span>
              <span className="text-white font-medium">{userReport.newUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Активных пользователей:</span>
              <span className="text-white font-medium">{userReport.activeUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Удержание:</span>
              <span className="text-white font-medium">
                {userReport.retentionRate ? userReport.retentionRate.toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Отчет по транзакциям */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Транзакции</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Депозитов:</span>
              <span className="text-green-400 font-medium">{transactionReport.deposits || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Выводов:</span>
              <span className="text-red-400 font-medium">{transactionReport.withdrawals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Успешность:</span>
              <span className="text-white font-medium">
                {transactionReport.successRate ? transactionReport.successRate.toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Отчет по доходам */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Доходы</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Приток:</span>
              <span className="text-green-400 font-medium">
                {revenueReport.totalInflow ? formatCurrency(revenueReport.totalInflow) : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Отток:</span>
              <span className="text-red-400 font-medium">
                {revenueReport.totalOutflow ? formatCurrency(revenueReport.totalOutflow) : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Чистая прибыль:</span>
              <span className={`font-medium ${getPercentageColor(revenueReport.netRevenue || 0)}`}>
                {revenueReport.netRevenue ? formatCurrency(revenueReport.netRevenue) : formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Графики и диаграммы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График движения средств */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Движение средств</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Приток</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ 
                      width: `${metrics.totalInflow > 0 ? Math.min((metrics.totalInflow / (metrics.totalInflow + metrics.totalOutflow)) * 100, 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-white text-sm">{formatCurrency(metrics.totalInflow)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Отток</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ 
                      width: `${metrics.totalOutflow > 0 ? Math.min((metrics.totalOutflow / (metrics.totalInflow + metrics.totalOutflow)) * 100, 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-white text-sm">{formatCurrency(metrics.totalOutflow)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика токенов */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Распределение токенов</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">В игре:</span>
              <span className="text-yellow-400 font-medium">{formatNumber(metrics.totalTokens)} BOOST</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Активных игроков:</span>
              <span className="text-white font-medium">{formatNumber(metrics.activeUsers)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Средний баланс:</span>
              <span className="text-white font-medium">
                {metrics.activeUsers > 0 ? formatNumber(metrics.totalTokens / metrics.activeUsers) : 0} BOOST
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              if (confirm('Сбросить лидерборд? Это действие нельзя отменить.')) {
                adminApiService.resetLeaderboard()
                  .then(() => alert('Лидерборд сброшен'))
                  .catch(error => {
                    console.error('Ошибка сброса лидерборда:', error);
                    alert('Ошибка сброса лидерборда');
                  });
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
          >
            Сбросить лидерборд
          </button>
          
          <button
            onClick={() => {
              // Экспорт данных
              const data = {
                metrics,
                userReport,
                transactionReport,
                revenueReport,
                exportDate: new Date().toISOString()
              };
              
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `economy-report-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Экспорт отчета
          </button>
          
          <button
            onClick={loadEconomyData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
          >
            Обновить данные
          </button>
        </div>
      </div>
    </div>
  );
}; 