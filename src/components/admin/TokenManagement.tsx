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
  const [tokens, setTokens] = useState<TokenConfig[]>([]);
  const [tokenHistory, setTokenHistory] = useState<TokenHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddToken, setShowAddToken] = useState(false);
  const [newToken, setNewToken] = useState({
    symbol: '',
    address: '',
    decimals: 18,
    name: ''
  });

  // Загрузка токенов и истории
  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/tokens');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTokens(data.tokens);
        } else {
          setError(data.error || 'Ошибка загрузки токенов');
        }
      } else {
        setError('Ошибка загрузки токенов');
      }
    } catch (error) {
      console.error('Ошибка загрузки токенов:', error);
      setError('Ошибка загрузки токенов');
    } finally {
      setLoading(false);
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

  useEffect(() => {
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

          // Очищаем кеш токенов
          await fetch('/api/admin/tokens/clear-cache', { method: 'POST' });

          alert(`✅ Токен ${symbol} активирован!`);
          
          // Перезагружаем токены
          await loadTokens();
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
          await loadTokens();
          await loadTokenHistory();

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400">Загрузка токенов...</div>
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
            onClick={loadTokens}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление токенами</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              loadTokens();
              loadTokenHistory();
            }}
            className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Обновить
          </button>
          <button
            onClick={() => setShowAddToken(true)}
            className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
          >
            ➕ Добавить токен
          </button>
        </div>
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
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                  >
                    {loading ? '🔄' : '✅'} Активировать
                  </button>
                )}
                {!token.isActive && (
                  <button
                    onClick={() => handleRemoveToken(token.symbol)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BOOST"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Название токена</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BOOST Token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Адрес контракта</label>
                <input
                  type="text"
                  value={newToken.address}
                  onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Decimals</label>
                <input
                  type="number"
                  value={newToken.decimals}
                  onChange={(e) => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="18"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleAddToken}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                  {loading ? 'Добавление...' : '✅ Добавить'}
                </button>
                <button
                  onClick={() => setShowAddToken(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
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