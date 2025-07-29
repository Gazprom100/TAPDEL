import React, { useState, useEffect } from 'react';
import { adminApiService, SystemMetrics, BlockchainStatus, ServiceStatus } from '../../services/adminApi';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  service: string;
}

export const SystemMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: 0, out: 0 },
    uptime: 0,
    activeConnections: 0
  });

  const [blockchain, setBlockchain] = useState<BlockchainStatus>({
    lastBlock: 0,
    blockTime: 0,
    confirmations: 0,
    networkHashrate: 0,
    isConnected: false
  });

  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных системы
  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем все данные параллельно
      const [metricsData, blockchainData, servicesData, logsData] = await Promise.all([
        adminApiService.getSystemMetrics(),
        adminApiService.getBlockchainStatus(),
        adminApiService.getServicesStatus(),
        adminApiService.getSystemLogs(50)
      ]);
      
      setMetrics(metricsData);
      setBlockchain(blockchainData);
      setServices(servicesData);
      setLogs(logsData);
    } catch (error) {
      console.error('Ошибка загрузки данных системы:', error);
      setError('Ошибка загрузки данных системы');
    } finally {
      setLoading(false);
    }
  };

  // Автообновление каждые 30 секунд
  useEffect(() => {
    loadSystemData();
    
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-400">Загрузка данных системы...</div>
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
            onClick={loadSystemData}
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
      <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Мониторинг системы</h2>
        <button
          onClick={loadSystemData}
          className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
        >
          Обновить
        </button>
      </div>

      {/* Системные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">CPU</p>
              <p className="text-2xl font-bold text-white">{metrics.cpu.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">⚡</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Память</p>
              <p className="text-2xl font-bold text-white">{metrics.memory.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🧠</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Диск</p>
              <p className="text-2xl font-bold text-white">{metrics.disk.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💾</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.disk}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Аптайм</p>
              <p className="text-2xl font-bold text-white">{formatUptime(metrics.uptime)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">⏱️</span>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400">Активных соединений: {metrics.activeConnections}</p>
          </div>
        </div>
      </div>

      {/* Статус блокчейна */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Статус блокчейна</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{blockchain.lastBlock.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Последний блок</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{blockchain.blockTime.toFixed(1)}с</div>
            <div className="text-sm text-gray-400">Время блока</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{blockchain.confirmations}</div>
            <div className="text-sm text-gray-400">Подтверждения</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatBytes(blockchain.networkHashrate)}</div>
            <div className="text-sm text-gray-400">Хешрейт сети</div>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${blockchain.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-400">
            {blockchain.isConnected ? 'Подключено к сети' : 'Отключено от сети'}
          </span>
        </div>
      </div>

      {/* Статус сервисов */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Статус сервисов</h3>
        <div className="space-y-3">
          {services.map(service => (
            <div key={service.name} className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                <div>
                  <div className="font-medium text-white">{service.name}</div>
                  <div className="text-sm text-gray-400">
                    {service.responseTime}ms • {new Date(service.lastCheck).toLocaleTimeString()}
                  </div>
                  {service.error && (
                    <div className="text-xs text-red-400">{service.error}</div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {service.status === 'online' ? '🟢' : service.status === 'warning' ? '🟡' : '🔴'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Логи системы */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Логи системы</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-3 p-2 bg-gray-700 rounded">
              <div className={`text-xs font-mono ${getLevelColor(log.level)}`}>
                {log.level.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white">{log.message}</div>
                <div className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleString()} • {log.service}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 