import React, { useState, useEffect } from 'react';

interface Transaction {
  _id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  txHash?: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  moderatorId?: string;
  moderatorNote?: string;
  confirmations?: number;
  blockNumber?: number;
}

interface TransactionFilters {
  type: 'all' | 'deposit' | 'withdrawal';
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  dateFrom: string;
  dateTo: string;
  minAmount: number;
  maxAmount: number;
}

export const TransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: 0,
    maxAmount: 100000
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [moderationNote, setModerationNote] = useState('');

  // Моковые данные для демонстрации
  const mockTransactions: Transaction[] = [
    {
      _id: '1',
      userId: '123456789',
      username: 'Evgeni_Krasnov',
      type: 'withdrawal',
      amount: 5000,
      status: 'pending',
      address: '0x1234567890abcdef...',
      createdAt: '2024-01-20T10:30:00Z',
      updatedAt: '2024-01-20T10:30:00Z'
    },
    {
      _id: '2',
      userId: '987654321',
      username: 'TestUser',
      type: 'deposit',
      amount: 2500,
      status: 'completed',
      txHash: '0xabcdef1234567890...',
      address: '0xabcdef1234567890...',
      createdAt: '2024-01-20T09:15:00Z',
      updatedAt: '2024-01-20T09:20:00Z',
      confirmations: 12,
      blockNumber: 12345678
    },
    {
      _id: '3',
      userId: '555666777',
      username: 'BannedUser',
      type: 'withdrawal',
      amount: 1000,
      status: 'rejected',
      address: '0x555666777888999...',
      createdAt: '2024-01-20T08:45:00Z',
      updatedAt: '2024-01-20T09:00:00Z',
      moderatorId: 'admin_1',
      moderatorNote: 'Подозрительная активность'
    }
  ];

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setTransactions(mockTransactions);
      setTotalPages(Math.ceil(mockTransactions.length / itemsPerPage));
      setLoading(false);
    }, 1000);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.userId.includes(searchTerm) ||
                         tx.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filters.type === 'all' || tx.type === filters.type;
    const matchesStatus = filters.status === 'all' || tx.status === filters.status;
    const matchesAmount = tx.amount >= filters.minAmount && tx.amount <= filters.maxAmount;
    
    const txDate = new Date(tx.createdAt);
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
    
    const matchesDate = (!fromDate || txDate >= fromDate) && (!toDate || txDate <= toDate);
    
    return matchesSearch && matchesType && matchesStatus && matchesAmount && matchesDate;
  });

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectTransaction = (txId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(txId) 
        ? prev.filter(id => id !== txId)
        : [...prev, txId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTransactions(
      selectedTransactions.length === paginatedTransactions.length 
        ? [] 
        : paginatedTransactions.map(tx => tx._id)
    );
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'process') => {
    if (selectedTransactions.length === 0) return;

    const confirmMessage = {
      approve: 'Одобрить выбранные транзакции?',
      reject: 'Отклонить выбранные транзакции?',
      process: 'Обработать выбранные транзакции?'
    };

    if (!confirm(confirmMessage[action])) return;

    try {
      // Здесь будет API вызов
      console.log(`${action} transactions:`, selectedTransactions);
      
      // Обновляем локальное состояние
      setTransactions(prev => prev.map(tx => {
        if (selectedTransactions.includes(tx._id)) {
          switch (action) {
            case 'approve':
              return { ...tx, status: 'approved' as const, updatedAt: new Date().toISOString() };
            case 'reject':
              return { ...tx, status: 'rejected' as const, updatedAt: new Date().toISOString() };
            case 'process':
              return { ...tx, status: 'completed' as const, updatedAt: new Date().toISOString() };
            default:
              return tx;
          }
        }
        return tx;
      }));

      setSelectedTransactions([]);
    } catch (error) {
      console.error('Ошибка массовой операции:', error);
    }
  };

  const handleModerateTransaction = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setModerationNote('');
    setShowModerationModal(true);
  };

  const handleModerationSubmit = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;

    try {
      // Здесь будет API вызов
      console.log(`${action} transaction ${selectedTransaction._id}:`, moderationNote);
      
      // Обновляем локальное состояние
      setTransactions(prev => prev.map(tx => {
        if (tx._id === selectedTransaction._id) {
          return {
            ...tx,
            status: action === 'approve' ? 'approved' : 'rejected',
            moderatorNote: moderationNote,
            updatedAt: new Date().toISOString()
          };
        }
        return tx;
      }));

      setShowModerationModal(false);
      setSelectedTransaction(null);
      setModerationNote('');
    } catch (error) {
      console.error('Ошибка модерации:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600';
      case 'approved': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      case 'completed': return 'bg-blue-600';
      case 'failed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'deposit' ? '💰' : '💸';
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()} DEL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="admin-scrollable space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h2 className="text-2xl font-bold">Управление транзакциями</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBulkAction('approve')}
            disabled={selectedTransactions.length === 0}
            className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            ✅ Одобрить ({selectedTransactions.length})
          </button>
          <button
            onClick={() => handleBulkAction('reject')}
            disabled={selectedTransactions.length === 0}
            className="admin-button px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            ❌ Отклонить ({selectedTransactions.length})
          </button>
          <button
            onClick={() => handleBulkAction('process')}
            disabled={selectedTransactions.length === 0}
            className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            ⚡ Обработать ({selectedTransactions.length})
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Поиск</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Username, ID, TX Hash, Address..."
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Тип</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все типы</option>
              <option value="deposit">Депозиты</option>
              <option value="withdrawal">Выводы</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="approved">Одобрено</option>
              <option value="rejected">Отклонено</option>
              <option value="completed">Завершено</option>
              <option value="failed">Ошибка</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  type: 'all',
                  status: 'all',
                  dateFrom: '',
                  dateTo: '',
                  minAmount: 0,
                  maxAmount: 100000
                });
              }}
              className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              🔄 Сбросить фильтры
            </button>
          </div>
        </div>

        {/* Дополнительные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Дата от</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Дата до</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Мин. сумма</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Макс. сумма</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Таблица транзакций */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="admin-input rounded border-gray-600 bg-gray-700"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Транзакция</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Пользователь</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Сумма</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedTransactions.map(tx => (
                <tr key={tx._id} className="hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(tx._id)}
                      onChange={() => handleSelectTransaction(tx._id)}
                      className="admin-input rounded border-gray-600 bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(tx.type)}</span>
                      <div>
                        <div className="font-medium text-white capitalize">{tx.type}</div>
                        {tx.txHash && (
                          <div className="text-xs text-gray-400 font-mono">
                            {tx.txHash.substring(0, 10)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{tx.username}</div>
                      <div className="text-sm text-gray-400">ID: {tx.userId}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{formatAmount(tx.amount)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tx.status)}`}>
                      {tx.status === 'pending' && 'Ожидает'}
                      {tx.status === 'approved' && 'Одобрено'}
                      {tx.status === 'rejected' && 'Отклонено'}
                      {tx.status === 'completed' && 'Завершено'}
                      {tx.status === 'failed' && 'Ошибка'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-400">
                      {formatDate(tx.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {tx.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleModerateTransaction(tx)}
                            className="admin-button px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleModerateTransaction(tx)}
                            className="admin-button px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {/* Открыть детали транзакции */}}
                        className="admin-button px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        👁️
                      </button>
                      {tx.txHash && (
                        <button
                          onClick={() => window.open(`https://explorer.decimalchain.com/tx/${tx.txHash}`, '_blank')}
                          className="admin-button px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                        >
                          🔗
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} из {filteredTransactions.length}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="admin-button px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded text-sm"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`admin-button px-3 py-1 rounded text-sm ${
                  currentPage === page 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="admin-button px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded text-sm"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно модерации */}
      {showModerationModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Модерация транзакции
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Пользователь</div>
                <div className="text-white font-medium">{selectedTransaction.username}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Сумма</div>
                <div className="text-white font-medium">{formatAmount(selectedTransaction.amount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Адрес</div>
                <div className="text-white font-mono text-sm">{selectedTransaction.address}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Примечание</label>
                <textarea
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                  className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Укажите причину одобрения или отклонения..."
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleModerationSubmit('approve')}
                  className="admin-button flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                >
                  ✅ Одобрить
                </button>
                <button
                  onClick={() => handleModerationSubmit('reject')}
                  className="admin-button flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  ❌ Отклонить
                </button>
                <button
                  onClick={() => setShowModerationModal(false)}
                  className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 