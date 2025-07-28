import React, { useState, useEffect } from 'react';

interface UserBalance {
  symbol: string;
  balance: number;
  highScore: number;
  lastUpdated: string;
}

interface UserBalanceData {
  userId: string;
  username: string;
  telegramUsername?: string;
  balances: UserBalance[];
}

interface AllUserBalancesResponse {
  data: UserBalanceData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const UserBalances: React.FC = () => {
  const [userBalances, setUserBalances] = useState<UserBalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Загрузка всех балансов пользователей
  const loadAllUserBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (selectedToken) {
        params.append('tokenSymbol', selectedToken);
      }
      
      const response = await fetch(`/api/admin/all-user-balances?${params}`);
      const data: AllUserBalancesResponse = await response.json();
      
      if (data.data) {
        setUserBalances(data.data);
        setTotalPages(data.pagination.pages);
        setTotalUsers(data.pagination.total);
      } else {
        setError('Ошибка загрузки балансов пользователей');
      }
    } catch (error) {
      console.error('Ошибка загрузки балансов пользователей:', error);
      setError('Ошибка загрузки балансов пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Поиск конкретного пользователя
  const searchUser = async () => {
    if (!searchUserId.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/user-balances/${searchUserId}`);
      const data = await response.json();
      
      if (data.success) {
        // Преобразуем данные в формат для отображения
        const userData: UserBalanceData = {
          userId: data.user.userId,
          username: data.user.username,
          telegramUsername: data.user.telegramUsername,
          balances: data.totalBalances
        };
        
        setUserBalances([userData]);
        setTotalPages(1);
        setTotalUsers(1);
      } else {
        setError('Пользователь не найден');
      }
    } catch (error) {
      console.error('Ошибка поиска пользователя:', error);
      setError('Ошибка поиска пользователя');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUserBalances();
  }, [currentPage, selectedToken]);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('ru-RU').format(balance);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getTotalBalance = (balances: UserBalance[]) => {
    return balances.reduce((total, balance) => total + balance.balance, 0);
  };

  const getTokenCount = (balances: UserBalance[]) => {
    return balances.length;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <div className="mt-4 text-gray-400">Загрузка балансов пользователей...</div>
      </div>
    );
  }

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Балансы пользователей</h2>
          <p className="text-gray-400">История балансов по всем токенам</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={loadAllUserBalances}
            className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Поиск и фильтры */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Поиск пользователя</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="Введите ID пользователя"
                className="admin-input flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={searchUser}
                className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                🔍 Найти
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Фильтр по токену</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Все токены</option>
              <option value="DEL">DEL</option>
              <option value="BOOST">BOOST</option>
              <option value="MAKAROVSKY">MAKAROVSKY</option>
              <option value="BTT">BTT</option>
              <option value="SBT">SBT</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchUserId('');
                setSelectedToken('');
                setCurrentPage(1);
                loadAllUserBalances();
              }}
              className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              🔄 Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Всего пользователей</p>
              <p className="text-2xl font-bold text-white">{totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Страница</p>
              <p className="text-2xl font-bold text-white">{currentPage} из {totalPages}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📄</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Показано</p>
              <p className="text-2xl font-bold text-white">{userBalances.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Список пользователей с балансами */}
      <div className="space-y-4">
        {userBalances.map((user) => (
          <div key={user.userId} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                <div className="text-sm text-gray-400">
                  ID: {user.userId}
                  {user.telegramUsername && (
                    <span className="ml-2">@{user.telegramUsername}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Токенов: {getTokenCount(user.balances)}</div>
                <div className="text-lg font-bold text-white">
                  Общий баланс: {formatBalance(getTotalBalance(user.balances))}
                </div>
              </div>
            </div>

            {/* Балансы по токенам */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.balances.map((balance) => (
                <div
                  key={balance.symbol}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-white">{balance.symbol}</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(balance.lastUpdated)}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-400">
                      Баланс: <span className="text-white">{formatBalance(balance.balance)}</span>
                    </div>
                    <div className="text-gray-400">
                      Рейтинг: <span className="text-white">{formatBalance(balance.highScore)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {user.balances.length === 0 && (
              <div className="text-gray-400 text-center py-4">
                Нет данных о балансах
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="admin-button px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded text-sm"
          >
            ← Назад
          </button>
          
          <span className="px-4 py-2 text-gray-400">
            {currentPage} из {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="admin-button px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded text-sm"
          >
            Вперед →
          </button>
        </div>
      )}

      {userBalances.length === 0 && !loading && (
        <div className="text-gray-400 text-center py-8">
          Нет данных о балансах пользователей
        </div>
      )}
    </div>
  );
}; 