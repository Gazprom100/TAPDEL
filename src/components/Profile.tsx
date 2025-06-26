import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Shop } from './Shop';

type Tab = 'balance' | 'shop' | 'transactions' | 'leaderboard';

export const Profile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('shop');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  
  const {
    tokens,
    transactions,
    leaderboard,
    withdrawTokens,
    depositTokens
  } = useGameStore();

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (amount > 0) {
      const success = await withdrawTokens(amount);
      if (success) {
        setWithdrawAmount('');
      }
    }
  };

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (amount > 0) {
      const success = await depositTokens(amount);
      if (success) {
        setDepositAmount('');
      }
    }
  };

  return (
    <div className="cyber-modal" onClick={onClose}>
      <div 
        className="cyber-panel w-[90vw] max-w-4xl max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="cyber-text text-2xl">Профиль</h2>
          <button 
            onClick={onClose}
            className="cyber-button"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          {(['balance', 'shop', 'transactions', 'leaderboard'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cyber-button ${
                activeTab === tab ? 'bg-[var(--glow-color)] text-black' : ''
              }`}
            >
              {tab === 'balance' && 'Баланс'}
              {tab === 'shop' && 'Магазин'}
              {tab === 'transactions' && 'Транзакции'}
              {tab === 'leaderboard' && 'Таблица лидеров'}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'balance' && (
            <div className="space-y-6">
              <div className="cyber-text text-xl">Баланс: {tokens} токенов</div>
              
              <div className="cyber-panel space-y-4">
                <div className="cyber-text">Вывод токенов</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="cyber-input flex-1"
                    placeholder="Количество"
                  />
                  <button
                    onClick={handleWithdraw}
                    className="cyber-button"
                  >
                    Вывести
                  </button>
                </div>
              </div>

              <div className="cyber-panel space-y-4">
                <div className="cyber-text">Ввод токенов</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="cyber-input flex-1"
                    placeholder="Количество"
                  />
                  <button
                    onClick={handleDeposit}
                    className="cyber-button"
                  >
                    Внести
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shop' && <Shop />}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="cyber-card flex justify-between items-center"
                >
                  <div>
                    <div className="cyber-text">
                      {tx.type === 'withdraw' ? 'Вывод' : 
                       tx.type === 'deposit' ? 'Ввод' : 
                       tx.type === 'purchase' ? 'Покупка' : 'Операция'}
                    </div>
                    <div className="text-sm opacity-70">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="cyber-text">
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center opacity-50">
                  Нет транзакций
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className="cyber-card flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="cyber-text text-xl">#{index + 1}</div>
                    <div>
                      <div className="cyber-text">{entry.username}</div>
                      <div className="text-sm opacity-70">Уровень: {entry.level}</div>
                    </div>
                  </div>
                  <div className="cyber-text">{entry.tokens} токенов</div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="text-center opacity-50">
                  Таблица лидеров пуста
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 