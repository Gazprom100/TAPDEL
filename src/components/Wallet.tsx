import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { decimalApi, type DepositStatus, type WithdrawalStatus } from '../services/decimalApi';

interface WalletProps {
  isOpen: boolean;
  onClose: () => void;
}

const Wallet: React.FC<WalletProps> = ({ isOpen, onClose }) => {
  const { profile, delBalance, updateDelBalance, refreshDelBalance } = useGameStore();
  const [activeTab, setActiveTab] = useState<'balance' | 'deposit' | 'withdraw' | 'history'>('balance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Депозит
  const [depositAmount, setDepositAmount] = useState('');
  const [currentDeposit, setCurrentDeposit] = useState<DepositStatus | null>(null);
  
  // Вывод
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  
  // История
  const [deposits, setDeposits] = useState<DepositStatus[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalStatus[]>([]);

  useEffect(() => {
    if (isOpen && profile?.userId) {
      refreshBalance();
      loadHistory();
    }
  }, [isOpen, profile?.userId]);

  const refreshBalance = async () => {
    await refreshDelBalance();
  };

  const loadHistory = async () => {
    if (!profile?.userId) return;
    
    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        decimalApi.getUserDeposits(profile.userId),
        decimalApi.getUserWithdrawals(profile.userId)
      ]);
      
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const handleCreateDeposit = async () => {
    if (!profile?.userId || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (amount < 0.001) {
      setError('Минимальная сумма депозита: 0.001 DEL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const deposit = await decimalApi.createDeposit({
        userId: profile.userId,
        baseAmount: amount
      });
      
      setCurrentDeposit({
        depositId: deposit.depositId,
        userId: profile.userId,
        amountRequested: deposit.amountRequested,
        uniqueAmount: deposit.uniqueAmount,
        matched: false,
        confirmations: 0,
        txHash: null,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        expiresAt: deposit.expires
      });
      
      setDepositAmount('');
      setActiveTab('deposit');
      
      // Начинаем отслеживать статус депозита
      startDepositTracking(deposit.depositId);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка создания депозита');
    } finally {
      setLoading(false);
    }
  };

  const startDepositTracking = (depositId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await decimalApi.getDepositStatus(depositId);
        setCurrentDeposit(status);
        
        if (status.status === 'confirmed') {
          clearInterval(interval);
          await refreshBalance();
          await loadHistory();
        }
      } catch (error) {
        console.error('Ошибка отслеживания депозита:', error);
      }
    }, 10000); // Проверяем каждые 10 секунд

    // Очищаем интервал через 30 минут
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const handleCreateWithdrawal = async () => {
    if (!profile?.userId || !withdrawAmount || !withdrawAddress) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount < 0.001) {
      setError('Минимальная сумма вывода: 0.001 DEL');
      return;
    }

    if (amount > delBalance) {
      setError('Недостаточно средств');
      return;
    }

    if (!withdrawAddress.match(/^(xdc|0x)[0-9a-fA-F]{40}$/)) {
      setError('Неверный формат адреса');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await decimalApi.createWithdrawal({
        userId: profile.userId,
        toAddress: withdrawAddress,
        amount: amount
      });
      
      setWithdrawAmount('');
      setWithdrawAddress('');
      setActiveTab('history');
      
      await refreshBalance();
      await loadHistory();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка создания вывода');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Ожидание';
      case 'pending': return 'Подтверждение';
      case 'confirmed': return 'Подтвержден';
      case 'queued': return 'В очереди';
      case 'sent': return 'Отправлен';
      case 'failed': return 'Ошибка';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': 
      case 'sent': 
        return 'text-green-400';
      case 'pending': 
      case 'queued': 
        return 'text-yellow-400';
      case 'failed': 
        return 'text-red-400';
      default: 
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-blue-900/30 to-purple-900/30 rounded-xl border border-cyan-500/30 max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b border-cyan-500/20">
          <h2 className="text-2xl font-bold text-cyan-400">DEL Кошелек</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b border-cyan-500/20">
          {[
            { id: 'balance', label: 'Баланс' },
            { id: 'deposit', label: 'Депозит' },
            { id: 'withdraw', label: 'Вывод' },
            { id: 'history', label: 'История' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 p-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Баланс */}
          {activeTab === 'balance' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-2">
                  {delBalance.toFixed(6)} DEL
                </div>
                <button
                  onClick={refreshBalance}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  🔄 Обновить
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-medium hover:bg-green-500/30 transition-colors"
                >
                  💰 Депозит
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 font-medium hover:bg-purple-500/30 transition-colors"
                >
                  💸 Вывод
                </button>
              </div>
            </div>
          )}

          {/* Депозит */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              {!currentDeposit ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Сумма DEL
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.001"
                      min="0.001"
                      step="0.001"
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateDeposit}
                    disabled={loading || !depositAmount}
                    className="w-full p-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                  >
                    {loading ? 'Создание...' : 'Создать депозит'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-cyan-400 mb-3">
                      Инструкция для депозита
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">Отправьте точно:</span>
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-400 font-mono">
                            {currentDeposit.uniqueAmount.toFixed(6)} DEL
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentDeposit.uniqueAmount.toString())}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">На адрес:</span>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-mono text-xs break-all">
                            xdc4A7c...Bf23
                          </span>
                          <button
                            onClick={() => copyToClipboard('xdc4A7c...Bf23')}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Статус:</span>
                      <span className={getStatusColor(currentDeposit.status)}>
                        {getStatusText(currentDeposit.status)}
                      </span>
                    </div>
                    
                    {currentDeposit.matched && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Подтверждения:</span>
                        <span className="text-white">
                          {currentDeposit.confirmations}/6
                        </span>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Истекает: {formatDate(currentDeposit.expiresAt)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setCurrentDeposit(null)}
                    className="w-full p-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Новый депозит
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Вывод */}
          {activeTab === 'withdraw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Сумма DEL
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.001"
                  min="0.001"
                  step="0.001"
                  max={delBalance}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Доступно: {delBalance.toFixed(6)} DEL
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Адрес получателя
                </label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="xdc... или 0x..."
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <button
                onClick={handleCreateWithdrawal}
                disabled={loading || !withdrawAmount || !withdrawAddress}
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                {loading ? 'Создание...' : 'Создать вывод'}
              </button>
            </div>
          )}

          {/* История */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <button
                onClick={loadHistory}
                className="w-full p-2 text-sm text-cyan-400 hover:text-cyan-300"
              >
                🔄 Обновить историю
              </button>
              
              {/* Депозиты */}
              {deposits.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Депозиты</h3>
                  <div className="space-y-2">
                    {deposits.slice(0, 5).map((deposit) => (
                      <div key={deposit.depositId} className="p-3 bg-gray-800 rounded-lg text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-green-400">+{deposit.amountRequested} DEL</span>
                          <span className={getStatusColor(deposit.status)}>
                            {getStatusText(deposit.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(deposit.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Выводы */}
              {withdrawals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Выводы</h3>
                  <div className="space-y-2">
                    {withdrawals.slice(0, 5).map((withdrawal) => (
                      <div key={withdrawal.withdrawalId} className="p-3 bg-gray-800 rounded-lg text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-red-400">-{withdrawal.amount} DEL</span>
                          <span className={getStatusColor(withdrawal.status)}>
                            {getStatusText(withdrawal.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {withdrawal.toAddress}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(withdrawal.requestedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {deposits.length === 0 && withdrawals.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  История операций пуста
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet; 