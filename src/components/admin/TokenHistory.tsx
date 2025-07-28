import React, { useState, useEffect } from 'react';

interface TokenBalance {
  userId: string;
  tokenSymbol: string;
  balance: number;
  highScore: number;
  lastUpdated: string;
  isActive: boolean;
}

interface TokenStatistics {
  _id: string;
  totalUsers: number;
  totalBalance: number;
  totalHighScore: number;
  activeUsers: number;
}

export const TokenHistory: React.FC = () => {
  const [statistics, setStatistics] = useState<TokenStatistics[]>([]);
  const [userBalances, setUserBalances] = useState<TokenBalance[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');

  // Загрузка статистики токенов
  useEffect(() => {
    loadTokenStatistics();
  }, []);

  const loadTokenStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/token-statistics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.statistics);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики токенов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBalances = async (userId: string) => {
    if (!userId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/token-balances/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserBalances(data.balances);
          setSelectedUserId(userId);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки балансов пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getActiveToken = () => {
    return statistics.find(stat => stat.activeUsers > 0)?._id || 'Нет активного токена';
  };

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">История токенов</h2>
        <button
          onClick={loadTokenStatistics}
          disabled={loading}
          className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm"
        >
          {loading ? '🔄' : '🔄'} Обновить
        </button>
      </div>

      {/* Статистика по токенам */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Статистика по токенам</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statistics.map((stat) => (
            <div key={stat._id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold text-white">{stat._id}</div>
                {stat.activeUsers > 0 && (
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                    АКТИВЕН
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-400">
                  Пользователей: <span className="text-white">{formatNumber(stat.totalUsers)}</span>
                </div>
                <div className="text-gray-400">
                  Активных: <span className="text-white">{formatNumber(stat.activeUsers)}</span>
                </div>
                <div className="text-gray-400">
                  Общий баланс: <span className="text-white">{formatNumber(stat.totalBalance)}</span>
                </div>
                <div className="text-gray-400">
                  Общий рейтинг: <span className="text-white">{formatNumber(stat.totalHighScore)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {statistics.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            Нет данных о токенах
          </div>
        )}
      </div>

      {/* Поиск пользователя */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">История балансов пользователя</h3>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            placeholder="Введите ID пользователя"
            className="admin-input flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => loadUserBalances(searchUserId)}
            disabled={loading || !searchUserId.trim()}
            className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm"
          >
            {loading ? '🔍' : '🔍'} Найти
          </button>
        </div>

        {selectedUserId && (
          <div className="text-sm text-gray-400 mb-4">
            Пользователь: <span className="text-white">{selectedUserId}</span>
          </div>
        )}

        {/* История балансов пользователя */}
        {userBalances.length > 0 && (
          <div className="space-y-3">
            {userBalances.map((balance, index) => (
              <div
                key={`${balance.userId}-${balance.tokenSymbol}-${index}`}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  balance.isActive 
                    ? 'bg-green-900/20 border-green-600' 
                    : 'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`text-lg font-bold ${
                      balance.isActive ? 'text-green-400' : 'text-white'
                    }`}>
                      {balance.tokenSymbol}
                    </div>
                    {balance.isActive && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                        АКТИВЕН
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Баланс: <span className="text-white">{formatNumber(balance.balance)}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Рейтинг: <span className="text-white">{formatNumber(balance.highScore)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Обновлено: {formatDate(balance.lastUpdated)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUserId && userBalances.length === 0 && !loading && (
          <div className="text-gray-400 text-center py-8">
            История балансов не найдена для пользователя {selectedUserId}
          </div>
        )}
      </div>

      {/* Информация об активном токене */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Текущий активный токен</h3>
        <div className="text-xl font-bold text-green-400">
          {getActiveToken()}
        </div>
        <div className="text-sm text-gray-400 mt-2">
          Все новые операции будут выполняться с этим токеном
        </div>
      </div>
    </div>
  );
}; 