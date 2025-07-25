import React, { useState, useEffect } from 'react';

interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  isActive: boolean;
}

interface TokenHistory {
  id: string;
  symbol: string;
  address: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export const TokenManagement: React.FC = () => {
  const [tokens, setTokens] = useState<TokenConfig[]>([
    {
      symbol: 'BOOST',
      address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
      decimals: 18,
      name: 'BOOST Token',
      isActive: true
    },
    {
      symbol: 'DEL',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      name: 'Decimal Token',
      isActive: false
    },
    {
      symbol: 'USDT',
      address: '0x1234567890123456789012345678901234567890',
      decimals: 6,
      name: 'Tether USD',
      isActive: false
    }
  ]);

  const [tokenHistory, setTokenHistory] = useState<TokenHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newToken, setNewToken] = useState({
    symbol: '',
    address: '',
    decimals: 18,
    name: ''
  });

  // Загрузка токенов и истории
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const response = await fetch('/api/admin/tokens');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTokens(data.tokens);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки токенов:', error);
      }
    };

    const loadTokenHistory = async () => {
      try {
        const response = await fetch('/api/admin/tokens/history');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTokenHistory(data.history);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки истории токенов:', error);
      }
    };

    loadTokens();
    loadTokenHistory();
  }, []);

  const handleActivateToken = async (symbol: string) => {
    if (!confirm(`Активировать токен ${symbol}? Это изменит токен во всей системе.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/tokens/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Обновляем локальное состояние
          setTokens(prev => prev.map(token => ({
            ...token,
            isActive: token.symbol === symbol
          })));

          // Перезагружаем страницу для применения изменений
          setTimeout(() => {
            window.location.reload();
          }, 2000);

          alert(`✅ Токен ${symbol} активирован! Страница перезагрузится через 2 секунды.`);
        } else {
          alert(`❌ Ошибка: ${data.error}`);
        }
      } else {
        alert('❌ Ошибка активации токена');
      }
    } catch (error) {
      console.error('Ошибка активации токена:', error);
      alert('❌ Ошибка активации токена');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async () => {
    if (!newToken.symbol || !newToken.address || !newToken.name) {
      alert('Заполните все поля');
      return;
    }

    if (!newToken.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Неверный формат адреса контракта');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/tokens/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newToken)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Перезагружаем токены
          const tokensResponse = await fetch('/api/admin/tokens');
          if (tokensResponse.ok) {
            const tokensData = await tokensResponse.json();
            if (tokensData.success) {
              setTokens(tokensData.tokens);
            }
          }

          setShowAddToken(false);
          setNewToken({ symbol: '', address: '', decimals: 18, name: '' });

          alert('✅ Токен добавлен!');
        } else {
          alert(`❌ Ошибка: ${data.error}`);
        }
      } else {
        alert('❌ Ошибка добавления токена');
      }
    } catch (error) {
      console.error('Ошибка добавления токена:', error);
      alert('❌ Ошибка добавления токена');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveToken = async (symbol: string) => {
    if (!confirm(`Удалить токен ${symbol}?`)) {
      return;
    }

    setTokens(prev => prev.filter(token => token.symbol !== symbol));
    alert('✅ Токен удален!');
  };

  const getActiveToken = () => tokens.find(token => token.isActive);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление токенами</h2>
        <button
          onClick={() => setShowAddToken(true)}
          className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
        >
          ➕ Добавить токен
        </button>
      </div>

      {/* Текущий активный токен */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Активный токен</h3>
        {getActiveToken() ? (
          <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-green-400">{getActiveToken()?.symbol}</div>
              <div className="text-sm text-gray-400">{getActiveToken()?.name}</div>
              <div className="text-xs text-gray-500 font-mono">{getActiveToken()?.address}</div>
            </div>
            <div className="text-green-400 text-sm">✅ Активен</div>
          </div>
        ) : (
          <div className="text-red-400">❌ Нет активного токена</div>
        )}
      </div>

      {/* Список всех токенов */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Доступные токены</h3>
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.symbol}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                token.isActive 
                  ? 'bg-green-900/20 border-green-600' 
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`text-lg font-bold ${
                    token.isActive ? 'text-green-400' : 'text-white'
                  }`}>
                    {token.symbol}
                  </div>
                  {token.isActive && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                      АКТИВЕН
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">{token.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">{token.address}</div>
                <div className="text-xs text-gray-500 mt-1">Decimals: {token.decimals}</div>
              </div>
              
              <div className="flex space-x-2">
                {!token.isActive && (
                  <button
                    onClick={() => handleActivateToken(token.symbol)}
                    disabled={loading}
                    className="admin-button px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                  >
                    {loading ? '🔄' : '✅'} Активировать
                  </button>
                )}
                {!token.isActive && (
                  <button
                    onClick={() => handleRemoveToken(token.symbol)}
                    className="admin-button px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    🗑️ Удалить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* История изменений */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">История изменений</h3>
        <div className="space-y-2">
          {tokenHistory.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div>
                <div className="font-medium text-white">{entry.symbol}</div>
                <div className="text-sm text-gray-400">{entry.reason}</div>
                <div className="text-xs text-gray-500">
                  {new Date(entry.changedAt).toLocaleString('ru-RU')} • {entry.changedBy}
                </div>
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {entry.address.substring(0, 10)}...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно добавления токена */}
      {showAddToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Добавить новый токен</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Символ токена</label>
                <input
                  type="text"
                  value={newToken.symbol}
                  onChange={(e) => setNewToken(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BOOST"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Название токена</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BOOST Token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Адрес контракта</label>
                <input
                  type="text"
                  value={newToken.address}
                  onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Decimals</label>
                <input
                  type="number"
                  value={newToken.decimals}
                  onChange={(e) => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) }))}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="18"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleAddToken}
                  disabled={loading}
                  className="admin-button flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                  {loading ? 'Добавление...' : '✅ Добавить'}
                </button>
                <button
                  onClick={() => setShowAddToken(false)}
                  className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  ✕ Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 