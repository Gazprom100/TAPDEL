import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ShopItem } from '../types';

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'gear-2',
    name: 'Передача 2',
    description: 'Разблокирует вторую передачу',
    price: 1000,
    type: 'gear',
    value: '2'
  },
  {
    id: 'gear-3',
    name: 'Передача 3',
    description: 'Разблокирует третью передачу',
    price: 2500,
    type: 'gear',
    value: '3'
  },
  {
    id: 'energy-100',
    name: 'Энергоблок +100',
    description: 'Увеличивает максимальную энергию на 100',
    price: 1500,
    type: 'energy',
    value: 100
  },
  {
    id: 'recovery-boost',
    name: 'Ускоритель восстановления',
    description: 'Увеличивает скорость восстановления энергии',
    price: 2000,
    type: 'boost',
    value: 1.5
  },
];

type Tab = 'balance' | 'shop' | 'transactions' | 'leaderboard';

export const Profile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  
  const {
    profile,
    tokens,
    transactions,
    leaderboard,
    withdrawTokens,
    depositTokens,
    upgradeMaxEnergy,
    upgradeMaxGear,
    upgradeEnergyRecovery
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

  const handlePurchase = (item: ShopItem) => {
    if (tokens < item.price) return;

    switch (item.type) {
      case 'gear':
        upgradeMaxGear(item.value as any);
        break;
      case 'energy':
        upgradeMaxEnergy(item.value as number);
        break;
      case 'boost':
        upgradeEnergyRecovery(item.value as number);
        break;
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'balance':
        return (
          <div className="space-y-4">
            <div className="cyber-text text-xl">Баланс: {tokens} токенов</div>
            
            <div className="space-y-2">
              <div className="cyber-text">Вывод токенов</div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-black border border-[var(--glow-color)] p-2 rounded text-[var(--glow-color)]"
                placeholder="Количество"
              />
              <button
                onClick={handleWithdraw}
                className="bg-black border border-[var(--glow-color)] p-2 rounded text-[var(--glow-color)] hover:bg-[var(--glow-color)] hover:text-black"
              >
                Вывести
              </button>
            </div>

            <div className="space-y-2">
              <div className="cyber-text">Ввод токенов</div>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="bg-black border border-[var(--glow-color)] p-2 rounded text-[var(--glow-color)]"
                placeholder="Количество"
              />
              <button
                onClick={handleDeposit}
                className="bg-black border border-[var(--glow-color)] p-2 rounded text-[var(--glow-color)] hover:bg-[var(--glow-color)] hover:text-black"
              >
                Внести
              </button>
            </div>
          </div>
        );

      case 'shop':
        return (
          <div className="grid grid-cols-2 gap-4">
            {SHOP_ITEMS.map((item) => (
              <div
                key={item.id}
                className="border border-[var(--glow-color)] p-4 rounded space-y-2"
              >
                <div className="cyber-text">{item.name}</div>
                <div className="text-sm opacity-70">{item.description}</div>
                <div className="cyber-text">{item.price} токенов</div>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={tokens < item.price}
                  className={`w-full p-2 rounded ${
                    tokens >= item.price
                      ? 'bg-[var(--glow-color)] text-black'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  Купить
                </button>
              </div>
            ))}
          </div>
        );

      case 'transactions':
        return (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="border border-[var(--glow-color)] p-2 rounded flex justify-between"
              >
                <div>
                  <div className="cyber-text">
                    {tx.type === 'withdraw' ? 'Вывод' : tx.type === 'deposit' ? 'Ввод' : 'Покупка'}
                  </div>
                  <div className="text-sm opacity-70">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="cyber-text">
                  {tx.type === 'withdraw' ? '-' : '+'}
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        );

      case 'leaderboard':
        return (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className="border border-[var(--glow-color)] p-2 rounded flex justify-between"
              >
                <div>
                  <div className="cyber-text">#{index + 1} {entry.username}</div>
                  <div className="text-sm opacity-70">Уровень: {entry.level}</div>
                </div>
                <div className="cyber-text">{entry.tokens} токенов</div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="cyber-container w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="cyber-text text-2xl">Профиль</div>
          <button
            onClick={onClose}
            className="cyber-text hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['balance', 'shop', 'transactions', 'leaderboard'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-2 rounded text-center ${
                activeTab === tab
                  ? 'bg-[var(--glow-color)] text-black'
                  : 'border border-[var(--glow-color)] text-[var(--glow-color)]'
              }`}
            >
              {tab === 'balance' ? 'Баланс' :
               tab === 'shop' ? 'Магазин' :
               tab === 'transactions' ? 'История' :
               'Рейтинг'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}; 