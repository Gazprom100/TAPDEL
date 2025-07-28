import React, { useState, useEffect } from 'react';

interface User {
  _id: string;
  userId: string;
  username: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramUsername?: string;
  tokens: number;
  highScore: number;
  level: number;
  isBanned: boolean;
  role: 'admin' | 'moderator' | 'user';
  createdAt: string;
  lastActive: string;
  totalDeposits: number;
  totalWithdrawals: number;
}

interface UserManagementProps {
  onUserUpdate: (userId: string, updates: Partial<User>) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUserUpdate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'moderator' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  // Моковые данные для демонстрации
  const mockUsers: User[] = [
    {
      _id: '1',
      userId: '123456789',
      username: 'Evgeni_Krasnov',
      telegramFirstName: 'Evgeni',
      telegramLastName: 'Krasnov',
      telegramUsername: 'evgeni_krasnov',
      tokens: 15000,
      highScore: 25000,
      level: 15,
      isBanned: false,
      role: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      lastActive: '2024-01-20T14:45:00Z',
      totalDeposits: 5000,
      totalWithdrawals: 2000
    },
    {
      _id: '2',
      userId: '987654321',
      username: 'TestUser',
      telegramFirstName: 'Test',
      telegramLastName: 'User',
      telegramUsername: 'testuser',
      tokens: 5000,
      highScore: 8000,
      level: 8,
      isBanned: false,
      role: 'user',
      createdAt: '2024-01-10T09:15:00Z',
      lastActive: '2024-01-20T12:30:00Z',
      totalDeposits: 1000,
      totalWithdrawals: 500
    },
    {
      _id: '3',
      userId: '555666777',
      username: 'BannedUser',
      telegramFirstName: 'Banned',
      telegramLastName: 'User',
      telegramUsername: 'banneduser',
      tokens: 0,
      highScore: 3000,
      level: 3,
      isBanned: true,
      role: 'user',
      createdAt: '2024-01-05T11:20:00Z',
      lastActive: '2024-01-18T16:00:00Z',
      totalDeposits: 500,
      totalWithdrawals: 0
    }
  ];

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setUsers(mockUsers);
      setTotalPages(Math.ceil(mockUsers.length / itemsPerPage));
      setLoading(false);
    }, 1000);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.userId.includes(searchTerm) ||
                         user.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !user.isBanned) ||
                         (filterStatus === 'banned' && user.isBanned);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === paginatedUsers.length 
        ? [] 
        : paginatedUsers.map(user => user._id)
    );
  };

  const handleBulkAction = async (action: 'ban' | 'unban' | 'resetBalance' | 'delete') => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = {
      ban: 'Забанить выбранных пользователей?',
      unban: 'Разбанить выбранных пользователей?',
      resetBalance: 'Сбросить баланс выбранных пользователей?',
      delete: 'Удалить выбранных пользователей?'
    };

    if (!confirm(confirmMessage[action])) return;

    try {
      // Здесь будет API вызов
      console.log(`${action} users:`, selectedUsers);
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(user => {
        if (selectedUsers.includes(user._id)) {
          switch (action) {
            case 'ban':
              return { ...user, isBanned: true };
            case 'unban':
              return { ...user, isBanned: false };
            case 'resetBalance':
              return { ...user, tokens: 0, highScore: 0 };
            case 'delete':
              return user; // В реальности удаляем из массива
            default:
              return user;
          }
        }
        return user;
      }));

      setSelectedUsers([]);
    } catch (error) {
      console.error('Ошибка массовой операции:', error);
    }
  };

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    try {
      // Здесь будет API вызов
      console.log(`${action} user ${userId}:`, value);
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(user => {
        if (user._id === userId) {
          switch (action) {
            case 'ban':
              return { ...user, isBanned: true };
            case 'unban':
              return { ...user, isBanned: false };
            case 'role':
              return { ...user, role: value };
            case 'balance':
              return { ...user, tokens: value };
            default:
              return user;
          }
        }
        return user;
      }));
    } catch (error) {
      console.error('Ошибка операции с пользователем:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'moderator': return 'bg-blue-600';
      case 'user': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (isBanned: boolean) => {
    return isBanned ? 'bg-red-600' : 'bg-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h2 className="text-2xl font-bold">Управление пользователями</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBulkAction('ban')}
            disabled={selectedUsers.length === 0}
            className="admin-button px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            🚫 Забанить ({selectedUsers.length})
          </button>
          <button
            onClick={() => handleBulkAction('unban')}
            disabled={selectedUsers.length === 0}
            className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            ✅ Разбанить ({selectedUsers.length})
          </button>
          <button
            onClick={() => handleBulkAction('resetBalance')}
            disabled={selectedUsers.length === 0}
            className="admin-button px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg text-sm"
          >
            💰 Сбросить баланс ({selectedUsers.length})
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Поиск</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ID, имя, username..."
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Роль</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="moderator">Модераторы</option>
              <option value="user">Пользователи</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="banned">Забаненные</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
                setFilterStatus('all');
              }}
              className="admin-button px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              🔄 Сбросить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={handleSelectAll}
                    className="admin-input rounded border-gray-600 bg-gray-700"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Пользователь</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Баланс</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Уровень</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Роль</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Активность</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedUsers.map(user => (
                <tr key={user._id} className="hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="admin-input rounded border-gray-600 bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{user.username}</div>
                      <div className="text-sm text-gray-400">ID: {user.userId}</div>
                      {user.telegramUsername && (
                        <div className="text-sm text-gray-400">@{user.telegramUsername}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{user.tokens.toLocaleString()} DEL</div>
                      <div className="text-sm text-gray-400">Рекорд: {user.highScore.toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{user.level}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.isBanned)}`}>
                      {user.isBanned ? 'Забанен' : 'Активен'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-400">
                      {new Date(user.lastActive).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUserAction(user._id, 'unban')}
                          className="admin-button px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          ✅
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user._id, 'ban')}
                          className="admin-button px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          🚫
                        </button>
                      )}
                      <button
                        onClick={() => {/* Открыть детали пользователя */}}
                        className="admin-button px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => {/* Открыть историю транзакций */}}
                        className="admin-button px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                      >
                        📊
                      </button>
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
            Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} из {filteredUsers.length}
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
    </div>
  );
}; 