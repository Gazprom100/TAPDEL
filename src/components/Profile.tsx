import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Shop } from './Shop';

type Tab = 'balance' | 'shop' | 'transactions' | 'leaderboard';

export const Profile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('shop');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  
  const {
    tokens,
    transactions,
    leaderboard,
    withdrawTokens,
    depositTokens,
    refreshLeaderboard,
    profile
  } = useGameStore();

  // Периодическое обновление таблицы лидеров
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateLeaderboard = async () => {
      if (activeTab === 'leaderboard') {
        setIsLeaderboardLoading(true);
        try {
          console.log('🔄 Profile: Обновление лидерборда...');
          await refreshLeaderboard();
        } catch (error) {
          console.error('❌ Profile: Ошибка обновления лидерборда:', error);
        } finally {
          setIsLeaderboardLoading(false);
        }
      }
    };

    if (activeTab === 'leaderboard') {
      updateLeaderboard();
      interval = setInterval(updateLeaderboard, 30000); // Обновляем каждые 30 секунд
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab, refreshLeaderboard]);

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
    <div 
      className="cyber-modal" 
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
    >
      <div 
        className="cyber-panel w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[70vw] max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden m-2"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '95vh'
        }}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6 p-2 sm:p-0 flex-shrink-0">
          <h2 className="cyber-text text-lg sm:text-xl md:text-2xl">Профиль</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className="cyber-button text-lg sm:text-xl p-2"
            style={{
              minWidth: '40px',
              minHeight: '40px',
              pointerEvents: 'auto'
            }}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto flex-shrink-0">
          {(['balance', 'shop', 'transactions', 'leaderboard'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className={`cyber-button text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 py-2 ${
                activeTab === tab ? 'bg-[var(--glow-color)] text-black' : ''
              }`}
              style={{
                minHeight: '36px',
                pointerEvents: 'auto',
                zIndex: 10
              }}
            >
              {tab === 'balance' && 'Баланс'}
              {tab === 'shop' && 'Магазин'}
              {tab === 'transactions' && 'Транзакции'}
              {tab === 'leaderboard' && 'Лидеры'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'balance' && (
            <div 
              className="h-full overflow-y-auto" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="space-y-4 sm:space-y-6 p-4">
                <div className="cyber-text text-lg sm:text-xl">Баланс: {Math.floor(tokens)} токенов</div>
                
                <div className="cyber-panel space-y-3 sm:space-y-4 p-3 sm:p-4">
                  <div className="cyber-text text-sm sm:text-base">Вывод токенов</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-input flex-1 text-sm sm:text-base"
                      placeholder="Количество"
                      style={{
                        minHeight: '40px',
                        pointerEvents: 'auto'
                      }}
                    />
                    <button
                      onClick={handleWithdraw}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-button text-sm sm:text-base px-4 py-2"
                      style={{
                        minHeight: '40px',
                        minWidth: '80px',
                        pointerEvents: 'auto'
                      }}
                    >
                      Вывести
                    </button>
                  </div>
                </div>

                <div className="cyber-panel space-y-3 sm:space-y-4 p-3 sm:p-4">
                  <div className="cyber-text text-sm sm:text-base">Ввод токенов</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-input flex-1 text-sm sm:text-base"
                      placeholder="Количество"
                      style={{
                        minHeight: '40px',
                        pointerEvents: 'auto'
                      }}
                    />
                    <button
                      onClick={handleDeposit}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-button text-sm sm:text-base px-4 py-2"
                      style={{
                        minHeight: '40px',
                        minWidth: '80px',
                        pointerEvents: 'auto'
                      }}
                    >
                      Внести
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div 
              className="h-full"
              style={{
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Shop />
            </div>
          )}

          {activeTab === 'transactions' && (
            <div 
              className="h-full overflow-y-auto" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="space-y-3 sm:space-y-4 p-4">
                {transactions && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="cyber-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 sm:p-4"
                    >
                      <div className="flex-1">
                        <div className="cyber-text text-sm sm:text-base">
                          {tx.type === 'withdraw' ? 'Вывод' : 
                           tx.type === 'deposit' ? 'Ввод' : 
                           tx.type === 'purchase' ? (
                             tx.itemInfo ? (
                               `Покупка ${
                                 tx.itemInfo.type === 'engine' ? 'двигателя' :
                                 tx.itemInfo.type === 'gearbox' ? 'коробки передач' :
                                 tx.itemInfo.type === 'battery' ? 'батареи' :
                                 tx.itemInfo.type === 'hyperdrive' ? 'гипердвигателя' :
                                 tx.itemInfo.type === 'powerGrid' ? 'энергосети' : ''
                               } ${tx.itemInfo.level}`
                             ) : 'Покупка'
                           ) : 'Операция'}
                        </div>
                        <div className="text-xs sm:text-sm opacity-70">
                          {new Date(tx.timestamp).toLocaleString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className={`cyber-text text-sm sm:text-base font-bold ${
                        tx.amount > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} токенов
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center opacity-50 py-8 text-sm sm:text-base">
                    История транзакций пуста
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div 
              className="h-full overflow-y-auto" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="space-y-3 sm:space-y-4 p-4">
                {isLeaderboardLoading ? (
                  <div className="text-center py-8">
                    <div className="cyber-spinner"></div>
                    <div className="mt-4 text-sm sm:text-base opacity-70">Загрузка таблицы лидеров...</div>
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`cyber-card flex justify-between items-center p-3 sm:p-4 ${
                        entry.userId === profile?.userId 
                          ? 'border-[#00ff88] bg-gradient-to-r from-[#00ff88]/20 via-[#00ff88]/10 to-[#00ff88]/20 shadow-lg shadow-[#00ff88]/30 ring-2 ring-[#00ff88]/50' 
                          : ''
                      }`}
                      style={entry.userId === profile?.userId ? {
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 20px rgba(0, 255, 136, 0.1)',
                        animation: 'pulse 2s infinite'
                      } : {}}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className={`cyber-text text-lg sm:text-xl font-bold ${
                          entry.userId === profile?.userId ? 'text-[#00ff88]' : ''
                        }`} style={{
                          minWidth: '32px'
                        }}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`cyber-text text-sm sm:text-base truncate ${
                            entry.userId === profile?.userId ? 'text-[#00ff88] font-bold' : ''
                          }`}>
                            {entry.username}
                            {entry.userId === profile?.userId && (
                              <span className="ml-2 px-2 py-1 text-xs bg-[#00ff88] text-black rounded-full font-bold animate-pulse">
                                ВЫ
                              </span>
                            )}
                          </div>
                          <div className={`text-xs sm:text-sm ${
                            entry.userId === profile?.userId ? 'text-[#00ff88]/80' : 'opacity-70'
                          }`}>
                            Уровень: {entry.level} • Токены: {Math.floor(entry.tokens)}
                          </div>
                        </div>
                      </div>
                      <div className={`cyber-text text-sm sm:text-base font-bold whitespace-nowrap ml-2 ${
                        entry.userId === profile?.userId ? 'text-[#00ff88]' : ''
                      }`}>
                        {Math.floor(entry.tokens)} DEL
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center opacity-50 py-8 text-sm sm:text-base">
                    Таблица лидеров пуста
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 