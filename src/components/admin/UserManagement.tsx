import React, { useState, useEffect } from 'react';
import { adminApiService, User } from '../../services/adminApi';

interface UserManagementProps {
  onUserUpdate: (userId: string, updates: Partial<User>) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUserUpdate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'moderator' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage] = useState(20);

  // Загрузка пользователей
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminApiService.getUsers(
        currentPage, 
        itemsPerPage, 
        searchTerm || undefined,
        filterRole !== 'all' ? filterRole : undefined,
        filterStatus !== 'all' ? filterStatus : undefined
      );
      
      setUsers(result.users);
      setTotalPages(result.pages);
      setTotalUsers(result.total);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем пользователей при изменении параметров
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, filterRole, filterStatus]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length 
        ? [] 
        : users.map(user => user._id)
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
      await adminApiService.bulkUpdateUsers(selectedUsers, action);
      
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
              return user; // Удаляем из массива
            default:
              return user;
          }
        }
        return user;
      }));

      // Удаляем пользователей из списка если действие - delete
      if (action === 'delete') {
        setUsers(prev => prev.filter(user => !selectedUsers.includes(user._id)));
      }

      setSelectedUsers([]);
      alert(`Операция ${action} выполнена успешно`);
    } catch (error) {
      console.error('Ошибка массовой операции:', error);
      alert('Ошибка выполнения операции');
    }
  };

  const handleUserAction = async (userId: string, action: string, value?: any) => {
    try {
      let updates: Partial<User> = {};
      
      switch (action) {
        case 'ban':
          updates = { isBanned: true };
          break;
        case 'unban':
          updates = { isBanned: false };
          break;
        case 'role':
          updates = { role: value };
          break;
        case 'balance':
          updates = { tokens: value };
          break;
        default:
          return;
      }
      
      await adminApiService.updateUser(userId, updates);
      
      // Обновляем локальное состояние
      setUsers(prev => prev.map(user => {
        if (user._id === userId) {
          return { ...user, ...updates };
        }
        return user;
      }));
      
      alert('Пользователь обновлен успешно');
    } catch (error) {
      console.error('Ошибка операции с пользователем:', error);
      alert('Ошибка обновления пользователя');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'moderator': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (isBanned: boolean) => {
    return isBanned ? 'bg-red-500' : 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400">Загрузка пользователей...</div>
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
            onClick={loadUsers}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold">Управление пользователями</h2>
        <div className="text-sm text-gray-400">
          Всего: {totalUsers} • Страница {currentPage} из {totalPages}
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Поиск пользователей..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все роли</option>
          <option value="admin">Администраторы</option>
          <option value="moderator">Модераторы</option>
          <option value="user">Пользователи</option>
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="banned">Забаненные</option>
        </select>
        
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
        >
          Обновить
        </button>
      </div>

      {/* Массовые действия */}
      {selectedUsers.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Выбрано: {selectedUsers.length} пользователей
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('ban')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Забанить
              </button>
              <button
                onClick={() => handleBulkAction('unban')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                Разбанить
              </button>
              <button
                onClick={() => handleBulkAction('resetBalance')}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
              >
                Сбросить баланс
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-800 hover:bg-red-900 rounded text-sm"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Таблица пользователей */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left">Пользователь</th>
                <th className="px-4 py-3 text-left">Баланс</th>
                <th className="px-4 py-3 text-left">Рейтинг</th>
                <th className="px-4 py-3 text-left">Роль</th>
                <th className="px-4 py-3 text-left">Статус</th>
                <th className="px-4 py-3 text-left">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{user.username}</div>
                      <div className="text-sm text-gray-400">{user.userId}</div>
                      {user.telegramUsername && (
                        <div className="text-xs text-gray-500">@{user.telegramUsername}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white">{Math.floor(user.tokens)} BOOST</div>
                    <div className="text-sm text-gray-400">Уровень {user.level}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white">{Math.floor(user.highScore)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(user.isBanned)}`}>
                      {user.isBanned ? 'Забанен' : 'Активен'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUserAction(user._id, 'unban')}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Разбанить
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user._id, 'ban')}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Забанить
                        </button>
                      )}
                      <button
                        onClick={() => handleUserAction(user._id, 'resetBalance')}
                        className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
                      >
                        Сбросить
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
            Показано {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalUsers)} из {totalUsers}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded"
            >
              Назад
            </button>
            <span className="px-3 py-1 text-gray-400">
              {currentPage} из {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 