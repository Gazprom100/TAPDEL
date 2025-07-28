import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  averageSessionTime: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  churnRate: number;
}

interface UserActivity {
  date: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  averageSessionTime: number;
}

interface RevenueData {
  date: string;
  deposits: number;
  withdrawals: number;
  netRevenue: number;
  transactions: number;
}

interface RetentionData {
  cohort: string;
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

interface PredictionData {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export const AnalyticsReports: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 1250,
    activeUsers: 850,
    newUsers: 45,
    retentionRate: 78.5,
    averageSessionTime: 12.5,
    dailyRevenue: 8500,
    weeklyRevenue: 59500,
    monthlyRevenue: 255000,
    conversionRate: 15.2,
    churnRate: 2.1
  });

  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedReport, setSelectedReport] = useState<'overview' | 'users' | 'revenue' | 'retention' | 'predictions'>('overview');

  // Генерация данных активности пользователей
  useEffect(() => {
    const generateActivityData = () => {
      const data: UserActivity[] = [];
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          activeUsers: Math.floor(Math.random() * 200) + 700,
          newUsers: Math.floor(Math.random() * 20) + 30,
          sessions: Math.floor(Math.random() * 500) + 1000,
          averageSessionTime: Math.random() * 10 + 8
        });
      }
      setUserActivity(data);
    };

    const generateRevenueData = () => {
      const data: RevenueData[] = [];
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          deposits: Math.floor(Math.random() * 5000) + 3000,
          withdrawals: Math.floor(Math.random() * 4000) + 2000,
          netRevenue: Math.floor(Math.random() * 2000) + 1000,
          transactions: Math.floor(Math.random() * 50) + 20
        });
      }
      setRevenueData(data);
    };

    const generateRetentionData = () => {
      const data: RetentionData[] = [
        { cohort: 'Янв 2024', day1: 95, day7: 68, day30: 45, day90: 32 },
        { cohort: 'Фев 2024', day1: 92, day7: 71, day30: 48, day90: 35 },
        { cohort: 'Мар 2024', day1: 89, day7: 65, day30: 42, day90: 28 },
        { cohort: 'Апр 2024', day1: 94, day7: 69, day30: 46, day90: 33 },
        { cohort: 'Май 2024', day1: 91, day7: 67, day30: 44, day90: 30 }
      ];
      setRetentionData(data);
    };

    const generatePredictions = () => {
      const data: PredictionData[] = [
        {
          metric: 'Активные пользователи',
          currentValue: 850,
          predictedValue: 920,
          confidence: 85,
          trend: 'up'
        },
        {
          metric: 'Дневная выручка',
          currentValue: 8500,
          predictedValue: 9200,
          confidence: 78,
          trend: 'up'
        },
        {
          metric: 'Коэффициент удержания',
          currentValue: 78.5,
          predictedValue: 81.2,
          confidence: 92,
          trend: 'up'
        },
        {
          metric: 'Среднее время сессии',
          currentValue: 12.5,
          predictedValue: 11.8,
          confidence: 65,
          trend: 'down'
        }
      ];
      setPredictions(data);
    };

    generateActivityData();
    generateRevenueData();
    generateRetentionData();
    generatePredictions();
  }, [selectedPeriod]);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DEL`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'stable': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h2 className="text-2xl font-bold">Аналитика и отчеты</h2>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="admin-input px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
          </select>
          <button className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
            📥 Экспорт отчета
          </button>
        </div>
      </div>

      {/* Навигация по отчетам */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex space-x-4 overflow-x-auto">
          <button
            onClick={() => setSelectedReport('overview')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedReport === 'overview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📊 Обзор
          </button>
          <button
            onClick={() => setSelectedReport('users')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedReport === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            👥 Пользователи
          </button>
          <button
            onClick={() => setSelectedReport('revenue')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedReport === 'revenue' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💰 Выручка
          </button>
          <button
            onClick={() => setSelectedReport('retention')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedReport === 'retention' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📈 Удержание
          </button>
          <button
            onClick={() => setSelectedReport('predictions')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedReport === 'predictions' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔮 Прогнозы
          </button>
        </div>
      </div>

      {/* Обзор */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Ключевые метрики */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Всего пользователей</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(analytics.totalUsers)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Активные пользователи</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(analytics.activeUsers)}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🔥</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Коэффициент удержания</p>
                  <p className="text-2xl font-bold text-white">{formatPercentage(analytics.retentionRate)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Дневная выручка</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(analytics.dailyRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Активность пользователей</h3>
              <div className="h-64 flex items-end space-x-1">
                {userActivity.slice(-7).map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t mb-1" 
                         style={{ height: `${(data.activeUsers / 1000) * 100}%` }}></div>
                    <div className="text-xs text-gray-400">{new Date(data.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Выручка</h3>
              <div className="h-64 flex items-end space-x-1">
                {revenueData.slice(-7).map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t mb-1" 
                         style={{ height: `${(data.netRevenue / 5000) * 100}%` }}></div>
                    <div className="text-xs text-gray-400">{new Date(data.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Анализ пользователей */}
      {selectedReport === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Новые пользователи</h3>
              <div className="text-3xl font-bold text-white mb-2">{formatNumber(analytics.newUsers)}</div>
              <div className="text-sm text-gray-400">за последние 24 часа</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Среднее время сессии</h3>
              <div className="text-3xl font-bold text-white mb-2">{analytics.averageSessionTime} мин</div>
              <div className="text-sm text-gray-400">время в игре</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Коэффициент оттока</h3>
              <div className="text-3xl font-bold text-red-400 mb-2">{formatPercentage(analytics.churnRate)}</div>
              <div className="text-sm text-gray-400">пользователей ушло</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Детальная активность пользователей</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Активные</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Новые</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Сессии</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Время сессии</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {userActivity.slice(-10).map((data, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(data.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{formatNumber(data.activeUsers)}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatNumber(data.newUsers)}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatNumber(data.sessions)}</td>
                      <td className="px-4 py-3 text-sm text-white">{data.averageSessionTime.toFixed(1)} мин</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Анализ выручки */}
      {selectedReport === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Дневная выручка</h3>
              <div className="text-3xl font-bold text-white mb-2">{formatCurrency(analytics.dailyRevenue)}</div>
              <div className="text-sm text-gray-400">за последние 24 часа</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Недельная выручка</h3>
              <div className="text-3xl font-bold text-white mb-2">{formatCurrency(analytics.weeklyRevenue)}</div>
              <div className="text-sm text-gray-400">за последние 7 дней</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Месячная выручка</h3>
              <div className="text-3xl font-bold text-white mb-2">{formatCurrency(analytics.monthlyRevenue)}</div>
              <div className="text-sm text-gray-400">за последние 30 дней</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Детальная выручка</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Депозиты</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Выводы</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Чистая выручка</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Транзакции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {revenueData.slice(-10).map((data, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(data.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400 font-medium">{formatCurrency(data.deposits)}</td>
                      <td className="px-4 py-3 text-sm text-red-400">{formatCurrency(data.withdrawals)}</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{formatCurrency(data.netRevenue)}</td>
                      <td className="px-4 py-3 text-sm text-white">{data.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Анализ удержания */}
      {selectedReport === 'retention' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Коэффициент удержания по когортам</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Когорта</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">День 1</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">День 7</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">День 30</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">День 90</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {retentionData.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-white font-medium">{data.cohort}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatPercentage(data.day1)}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatPercentage(data.day7)}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatPercentage(data.day30)}</td>
                      <td className="px-4 py-3 text-sm text-white">{formatPercentage(data.day90)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Прогнозы */}
      {selectedReport === 'predictions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {predictions.map((prediction, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{prediction.metric}</h3>
                  <span className={`text-2xl ${getTrendColor(prediction.trend)}`}>
                    {getTrendIcon(prediction.trend)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Текущее значение</span>
                    <span className="text-sm text-white font-medium">
                      {prediction.metric.includes('время') ? `${prediction.currentValue} мин` :
                       prediction.metric.includes('пользователи') ? formatNumber(prediction.currentValue) :
                       prediction.metric.includes('выручка') ? formatCurrency(prediction.currentValue) :
                       formatPercentage(prediction.currentValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Прогноз</span>
                    <span className="text-sm text-white font-medium">
                      {prediction.metric.includes('время') ? `${prediction.predictedValue} мин` :
                       prediction.metric.includes('пользователи') ? formatNumber(prediction.predictedValue) :
                       prediction.metric.includes('выручка') ? formatCurrency(prediction.predictedValue) :
                       formatPercentage(prediction.predictedValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Уверенность</span>
                    <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                      {formatPercentage(prediction.confidence)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 