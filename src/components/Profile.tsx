import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Shop } from './Shop';
import { AdminPanel } from './AdminPanel';

type Tab = 'balance' | 'shop' | 'transactions' | 'leaderboard';

export const Profile: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    tokens,
    transactions,
    leaderboard,
    refreshLeaderboard,
    profile,
    refreshBoostBalance
  } = useGameStore();
  
  // Отладочная информация для проверки профиля
  console.log('🔍 Profile Component Debug:', { 
    profile,
    username: profile?.username,
    telegramUsername: profile?.telegramUsername,
    userId: profile?.userId,
    isEvgeni: profile?.username === 'Evgeni_Krasnov' || profile?.telegramUsername === 'Evgeni_Krasnov',
    // Временно показываем кнопку для всех для отладки
    showAdminButton: true
  });
  
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositDetails, setShowDepositDetails] = useState<{
    depositId: string;
    uniqueAmount: number;
    address: string;
    expires: string;
    amountRequested: number;
  } | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [lastTransactionsUpdate, setLastTransactionsUpdate] = useState(0);
  
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

    const loadTransactionsData = async () => {
      if (activeTab === 'transactions' && profile?.userId) {
        // Дебаунсинг: не загружаем чаще чем раз в 10 секунд
        const now = Date.now();
        if (now - lastTransactionsUpdate < 10000) {
          console.log('⏱️ Дебаунсинг транзакций: пропускаем загрузку');
          return;
        }
        
        setIsTransactionsLoading(true);
        try {
          const { decimalApi } = await import('../services/decimalApi');
          
          // Добавляем таймаут для API вызовов
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Таймаут запроса')), 10000)
          );
          
          const depositsPromise = Promise.race([
            decimalApi.getUserDeposits(profile.userId).catch(() => []),
            timeoutPromise
          ]).catch(() => []) as Promise<any[]>;
          
          const withdrawalsPromise = Promise.race([
            decimalApi.getUserWithdrawals(profile.userId).catch(() => []),
            timeoutPromise
          ]).catch(() => []) as Promise<any[]>;
          
          const [depositsData, withdrawalsData] = await Promise.all([
            depositsPromise,
            withdrawalsPromise
          ]);
          
          setDeposits(depositsData);
          setWithdrawals(withdrawalsData);
          setLastTransactionsUpdate(now);
        } catch (error) {
          console.error('❌ Profile: Ошибка загрузки данных транзакций:', error);
          // Устанавливаем пустые массивы при ошибке
          setDeposits([]);
          setWithdrawals([]);
        } finally {
          setIsTransactionsLoading(false);
        }
      }
    };

    if (activeTab === 'leaderboard') {
      updateLeaderboard();
      interval = setInterval(updateLeaderboard, 30000); // Обновляем каждые 30 секунд
    } else if (activeTab === 'transactions') {
      loadTransactionsData();
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab, refreshLeaderboard, profile?.userId]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) {
      alert('Введите количество BOOST для вывода');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Введите корректную сумму для вывода');
      return;
    }

    try {
      // Проверяем общий BOOST баланс (tokens) перед выводом
      if (tokens < amount) {
        alert(`Недостаточно BOOST средств. Доступно: ${Math.floor(tokens)} BOOST`);
        return;
      }

      const { decimalApi } = await import('../services/decimalApi');
      if (!profile?.userId) {
        alert('Ошибка: пользователь не найден');
        return;
      }

      const response = await decimalApi.createWithdrawal({
        userId: profile.userId,
        toAddress: withdrawAddress,
        amount: amount
      });

      setWithdrawAmount('');
      setWithdrawAddress('');
      alert(`Запрос на вывод создан успешно!\nID: ${response.withdrawalId}\nСумма: ${response.amount} BOOST\nАдрес: ${response.toAddress}`);
    } catch (error) {
      console.error('Ошибка вывода:', error);
      alert('Ошибка при создании запроса на вывод');
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) {
      alert('Введите количество BOOST для депозита');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0.001) {
      alert('Минимальная сумма депозита: 0.001 BOOST');
      return;
    }

    try {
      const { decimalApi } = await import('../services/decimalApi');
      if (!profile?.userId) {
        alert('Ошибка: пользователь не найден');
        return;
      }

      const response = await decimalApi.createDeposit({
        userId: profile.userId,
        baseAmount: amount
      });

      setDepositAmount('');
      alert(`Депозит создан успешно!\nID: ${response.depositId}\nСумма: ${response.amountRequested} BOOST\nАдрес: ${response.address}\nУникальная сумма: ${response.uniqueAmount} BOOST`);
    } catch (error) {
      console.error('Ошибка депозита:', error);
      alert('Ошибка при создании депозита');
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)'
      }}
    >
      <div 
        className="cyber-panel w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[70vw] max-w-4xl overflow-hidden m-2"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - var(--safe-top) - var(--safe-bottom) - 80px)',
          maxHeight: 'calc(100vh - var(--safe-top) - var(--safe-bottom) - 80px)',
          marginTop: 'calc(var(--safe-top) + 40px)'
        }}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6 p-2 sm:p-0 flex-shrink-0" style={{
          paddingTop: '30px'
        }}>
          <h2 className="cyber-text text-lg sm:text-xl md:text-2xl" style={{
            marginTop: '10px'
          }}>Профиль</h2>
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
              pointerEvents: 'auto',
              marginTop: '5px'
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
          
          {/* Кнопка ADMIN только для Evgeni_Krasnov */}
          {(profile?.username === 'Evgeni_Krasnov' || 
            profile?.telegramUsername === 'Evgeni_Krasnov' ||
            profile?.telegramFirstName === 'Evgeni') && (
            // Отладочная информация
            console.log('🔍 ADMIN Button Debug:', { 
              username: profile?.username, 
              telegramUsername: profile?.telegramUsername,
              telegramFirstName: profile?.telegramFirstName,
              userId: profile?.userId,
              showAdmin: true
            }),
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Открываем админпанель в новой вкладке браузера
                const adminUrl = `${window.location.origin}/admin`;
                window.open(adminUrl, '_blank');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="cyber-button text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 py-2 bg-red-600 hover:bg-red-700"
              style={{
                minHeight: '36px',
                pointerEvents: 'auto',
                zIndex: 10
              }}
            >
              ADMIN
            </button>
          )}
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
                <div className="cyber-text text-lg font-bold mb-4">
                  BOOST Баланс: {Math.floor(tokens)} BOOST
                </div>
                
                <div className="cyber-panel space-y-3 sm:space-y-4 p-3 sm:p-4">
                  <div className="cyber-text text-sm sm:text-base">Вывод BOOST</div>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-input w-full text-sm sm:text-base"
                      placeholder="Количество BOOST для вывода"
                      style={{
                        minHeight: '40px',
                        pointerEvents: 'auto'
                      }}
                    />
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      className="cyber-input w-full text-sm sm:text-base"
                      placeholder="Адрес DecimalChain (0x... или xdc...)"
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
                      className="cyber-button w-full text-sm sm:text-base px-4 py-2"
                      style={{
                        minHeight: '40px',
                        pointerEvents: 'auto'
                      }}
                    >
                      Вывести BOOST
                    </button>
                  </div>
                </div>

                <div className="cyber-panel space-y-3 sm:space-y-4 p-3 sm:p-4">
                  <div className="cyber-text text-sm sm:text-base">Ввод BOOST</div>
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
                {isTransactionsLoading ? (
                  <div className="text-center py-8">
                    <div className="cyber-spinner"></div>
                    <div className="mt-4 text-sm sm:text-base opacity-70">Загрузка транзакций...</div>
                  </div>
                ) : (
                  <>
                    {/* Депозиты */}
                    {Array.isArray(deposits) && deposits.length > 0 && (
                      <div className="space-y-2">
                        <div className="cyber-text text-base font-bold">Депозиты BOOST</div>
                        {deposits.map((deposit: any) => {
                          const isExpired = deposit.status === 'expired';
                          const expiresIn = !isExpired ? Math.max(0, Math.floor((new Date(deposit.expiresAt).getTime() - Date.now()) / 1000)) : 0;
                          return (
                            <div
                              key={deposit.depositId}
                              className={`cyber-card p-3 sm:p-4 ${isExpired ? 'opacity-60' : ''}`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <div className="cyber-text text-sm sm:text-base">
                                    Депозит {deposit.amountRequested} BOOST
                                  </div>
                                  <div className="text-xs sm:text-sm opacity-70">
                                    {new Date(deposit.createdAt).toLocaleString('ru-RU')}
                                  </div>
                                  <div className="text-xs sm:text-sm mt-1">
                                    Отправить: {deposit.uniqueAmount} BOOST
                                  </div>
                                  {deposit.txHash && (
                                    <div className="text-xs sm:text-sm opacity-70 break-all">
                                      TX: {deposit.txHash.slice(0, 10)}...{deposit.txHash.slice(-6)}
                                    </div>
                                  )}
                                  {!isExpired && expiresIn > 0 && (
                                    <div className="text-xs text-yellow-400 mt-1">
                                      До истечения: {Math.floor(expiresIn/60)}:{(expiresIn%60).toString().padStart(2,'0')} мин
                                    </div>
                                  )}
                                  {isExpired && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Время на пополнение истекло
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`text-xs sm:text-sm font-bold px-2 py-1 rounded ${
                                    deposit.status === 'confirmed' ? 'bg-green-600 text-white' :
                                    deposit.status === 'pending' ? 'bg-yellow-600 text-white' :
                                    isExpired ? 'bg-gray-500 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                    {deposit.status === 'confirmed' ? 'Подтвержден' :
                                     deposit.status === 'pending' ? `Ожидание (${deposit.confirmations}/3)` :
                                     isExpired ? 'Истёк' :
                                     'Ожидание'}
                                  </div>
                                  {!isExpired && (
                                    <div className="cyber-text text-sm font-bold mt-1 text-green-400">
                                      +{deposit.amountRequested} BOOST
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Выводы */}
                    {withdrawals.length > 0 && (
                      <div className="space-y-2">
                        <div className="cyber-text text-base font-bold">Выводы BOOST</div>
                        {withdrawals.map((withdrawal) => (
                          <div
                            key={withdrawal.withdrawalId}
                            className="cyber-card p-3 sm:p-4"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="cyber-text text-sm sm:text-base">
                                  Вывод {withdrawal.amount} BOOST
                                </div>
                                <div className="text-xs sm:text-sm opacity-70">
                                  {new Date(withdrawal.requestedAt).toLocaleString('ru-RU')}
                                </div>
                                <div className="text-xs sm:text-sm opacity-70 break-all">
                                  На: {withdrawal.toAddress.slice(0, 10)}...{withdrawal.toAddress.slice(-6)}
                                </div>
                                {withdrawal.txHash && (
                                  <div className="text-xs sm:text-sm opacity-70 break-all">
                                    TX: {withdrawal.txHash.slice(0, 10)}...{withdrawal.txHash.slice(-6)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-xs sm:text-sm font-bold px-2 py-1 rounded ${
                                  withdrawal.status === 'sent' ? 'bg-green-600 text-white' :
                                  withdrawal.status === 'failed' ? 'bg-red-600 text-white' :
                                  'bg-yellow-600 text-white'
                                }`}>
                                  {withdrawal.status === 'sent' ? 'Отправлен' :
                                   withdrawal.status === 'failed' ? 'Ошибка' :
                                   'В очереди'}
                                </div>
                                <div className="cyber-text text-sm font-bold mt-1 text-red-400">
                                  -{withdrawal.amount} BOOST
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Игровые транзакции */}
                    {transactions && transactions.length > 0 && (
                      <div className="space-y-2">
                        <div className="cyber-text text-base font-bold">Игровые операции</div>
                        {transactions.map((tx) => (
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
                              {tx.amount > 0 ? '+' : ''}{tx.amount} BOOST
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Если нет транзакций */}
                    {deposits.length === 0 && withdrawals.length === 0 && (!transactions || transactions.length === 0) && (
                      <div className="text-center opacity-50 py-8 text-sm sm:text-base">
                        История транзакций пуста
                      </div>
                    )}
                  </>
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
                            Уровень: {entry.level} • Рейтинг: {Math.floor(entry.score)}
                            {entry.userId === profile?.userId && (
                              <span className="ml-2">• Баланс: {Math.floor(entry.tokens)} BOOST</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`cyber-text text-sm sm:text-base font-bold whitespace-nowrap ml-2 ${
                        entry.userId === profile?.userId ? 'text-[#00ff88]' : ''
                      }`}>
                        {Math.floor(entry.score)} ⭐
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
      
      {/* Модальное окно с деталями депозита */}
      {showDepositDetails && (
        <div 
          className="cyber-modal"
          onClick={() => setShowDepositDetails(null)}
          style={{ zIndex: 1000 }}
        >
          <div 
            className="cyber-panel w-[95vw] max-w-md p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <h3 className="cyber-text text-lg text-green-400">Депозит создан успешно!</h3>
              
              <div className="cyber-card p-4 space-y-3">
                <div className="space-y-2">
                  <div className="cyber-text text-sm">Отправьте точно:</div>
                  <div 
                    className="cyber-text text-lg font-bold text-green-400 cursor-pointer border border-green-400 rounded p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(showDepositDetails.uniqueAmount.toString());
                      alert('Сумма скопирована!');
                    }}
                  >
                    {showDepositDetails.uniqueAmount} BOOST
                    <div className="text-xs opacity-70 mt-1">Нажмите чтобы скопировать</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="cyber-text text-sm">На адрес:</div>
                  <div 
                    className="cyber-text text-sm font-mono border border-gray-600 rounded p-2 break-all cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(showDepositDetails.address);
                      alert('Адрес скопирован!');
                    }}
                  >
                    {showDepositDetails.address}
                    <div className="text-xs opacity-70 mt-1">Нажмите чтобы скопировать</div>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs opacity-70">
                  <div>ID депозита: {showDepositDetails.depositId}</div>
                  <div>Срок действия: {showDepositDetails.expires}</div>
                </div>
                
                <div className="text-xs opacity-70 text-center mt-4">
                  Депозит будет автоматически зачислен после подтверждения в блокчейне.
                </div>
              </div>
              
              <button
                onClick={() => setShowDepositDetails(null)}
                className="cyber-button w-full"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно админки */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      
    </div>
  );
}; 