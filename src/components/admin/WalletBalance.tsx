import React, { useState, useEffect } from 'react';

interface WalletBalance {
  symbol: string;
  name: string;
  address: string;
  balance: number;
  decimals: number;
  lastUpdated: string;
  status: 'live' | 'error' | 'active';
  error?: string;
}

interface WalletBalanceData {
  balances: WalletBalance[];
  totalBalanceUSD: number;
  lastUpdated: string;
  walletAddress?: string;
  walletType?: string;
  network?: string;
  status?: string;
}

export const WalletBalance: React.FC = () => {
  const [walletData, setWalletData] = useState<WalletBalanceData>({
    balances: [],
    totalBalanceUSD: 0,
    lastUpdated: ''
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка баланса кошелька
  const loadWalletBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/wallet-balance');
      const data = await response.json();
      
      if (data.success) {
        setWalletData(data);
      } else {
        setError('Ошибка загрузки баланса кошелька: ' + data.error);
      }
    } catch (error) {
      console.error('Ошибка загрузки баланса кошелька:', error);
      setError('Ошибка загрузки баланса кошелька');
    } finally {
      setLoading(false);
    }
  };

  // Обновление баланса кошелька
  const refreshWalletBalance = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/admin/wallet-balance/refresh', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Перезагружаем данные после обновления
        await loadWalletBalance();
      } else {
        setError('Ошибка обновления баланса: ' + data.error);
      }
    } catch (error) {
      console.error('Ошибка обновления баланса кошелька:', error);
      setError('Ошибка обновления баланса кошелька');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWalletBalance();
  }, []);

  const formatBalance = (balance: number, decimals: number) => {
    if (balance === undefined || balance === null || isNaN(balance)) {
      return '0.00';
    }
    // Баланс уже должен быть в правильных единицах (backend уже обработал decimals)
    return balance.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-green-400';
      case 'active': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return '🔗';
      case 'active': return '✅';
      case 'error': return '❌';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <div className="mt-4 text-gray-400">Загрузка баланса кошелька...</div>
      </div>
    );
  }

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Баланс рабочего кошелька</h2>
          <p className="text-gray-400">Актуальные балансы по всем токенам (НАПРЯМУЮ ИЗ БЛОКЧЕЙНА)</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={loadWalletBalance}
            className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Обновить
          </button>
          <button
            onClick={refreshWalletBalance}
            disabled={refreshing}
            className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white"
          >
            {refreshing ? '🔄 Обновление...' : '🔄 Обновить с блокчейна'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Общий баланс</p>
              <p className="text-2xl font-bold text-white">
                ${(walletData.totalBalanceUSD || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Активных токенов</p>
              <p className="text-2xl font-bold text-white">
                {walletData.balances.filter(b => b.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Последнее обновление</p>
              <p className="text-lg font-bold text-white">
                {walletData.lastUpdated ? formatDate(walletData.lastUpdated) : 'Неизвестно'}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Список балансов по токенам */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Балансы по токенам</h3>
        
        {walletData.balances.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            Нет данных о балансах
          </div>
        ) : (
          <div className="space-y-4">
            {walletData.balances.map((balance) => (
              <div
                key={balance.symbol}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  balance.status === 'active' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-red-900/20 border-red-600'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`text-lg font-bold ${
                      balance.status === 'active' ? 'text-white' : 'text-red-400'
                    }`}>
                      {balance.symbol}
                    </div>
                    <span className={`text-sm ${getStatusColor(balance.status)}`}>
                      {getStatusIcon(balance.status)} {balance.status === 'active' ? 'Активен' : 'Ошибка'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{balance.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{balance.address}</div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {formatBalance(balance.balance, balance.decimals)} {balance.symbol}
                  </div>
                  <div className="text-sm text-gray-400">
                    Обновлено: {formatDate(balance.lastUpdated)}
                  </div>
                  {balance.error && (
                    <div className="text-xs text-red-400 mt-1">
                      Ошибка: {balance.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация о кошельке */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Информация о кошельке</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Адрес кошелька:</span>
            <div className="text-white font-mono break-all">
              {walletData.walletAddress || 'Не настроен'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Сеть:</span>
            <div className="text-white">{walletData.network || 'DecimalChain'}</div>
          </div>
          <div>
            <span className="text-gray-400">Тип кошелька:</span>
            <div className="text-white">{walletData.walletType || 'Рабочий (для выводов)'}</div>
          </div>
          <div>
            <span className="text-gray-400">Статус:</span>
            <div className="text-green-400">{walletData.status || 'Активен'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 