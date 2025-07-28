import React, { useState, useEffect } from 'react';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  uptime: number;
  activeConnections: number;
}

interface BlockchainStatus {
  lastBlock: number;
  blockTime: number;
  confirmations: number;
  networkHashrate: number;
  isConnected: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

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

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'MongoDB',
      status: 'online',
      responseTime: 15,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Redis',
      status: 'online',
      responseTime: 5,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'DecimalChain API',
      status: 'online',
      responseTime: 120,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Telegram Bot',
      status: 'online',
      responseTime: 25,
      lastCheck: new Date().toISOString()
    }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Система запущена успешно',
      service: 'System'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'warning',
      message: 'Высокая нагрузка на CPU',
      service: 'Monitor'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'error',
      message: 'Ошибка подключения к DecimalChain',
      service: 'Blockchain'
    }
  ]);

  const [alerts, setAlerts] = useState<LogEntry[]>([]);

  // Имитация real-time обновлений
  useEffect(() => {
    const interval = setInterval(() => {
      // Обновляем метрики
      setMetrics(prev => ({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: {
          in: Math.random() * 1000,
          out: Math.random() * 500
        },
        uptime: prev.uptime + 1,
        activeConnections: Math.floor(Math.random() * 100)
      }));

      // Обновляем статус блокчейна
      setBlockchain(prev => ({
        ...prev,
        lastBlock: prev.lastBlock + Math.floor(Math.random() * 3),
        blockTime: Math.random() * 10 + 5,
        networkHashrate: Math.random() * 1000 + 500
      }));

      // Добавляем новые логи
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.8 ? 'warning' : 'info',
        message: `Системная активность: ${Math.floor(Math.random() * 100)}`,
        service: 'System'
      };

      setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Оставляем только последние 50 записей
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-600';
      case 'warning': return 'bg-yellow-600';
      case 'offline': return 'bg-red-600';
      default: return 'bg-gray-600';
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
    return `${days}д ${hours}ч ${minutes}м`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Мониторинг системы</h2>

      {/* Системные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">CPU</p>
              <p className="text-2xl font-bold text-white">{metrics.cpu.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💻</span>
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
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(service.status).replace('bg-', 'text-')}`}>
                  {service.status === 'online' ? 'Онлайн' : 
                   service.status === 'warning' ? 'Предупреждение' : 'Офлайн'}
                </div>
                {service.error && (
                  <div className="text-xs text-red-400">{service.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Логи в реальном времени */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Логи системы</h3>
          <button className="admin-button px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
            📥 Экспорт
          </button>
        </div>
        <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-3 py-1">
              <span className={`text-xs font-mono ${getLevelColor(log.level)}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs text-gray-500">[{log.service}]</span>
              <span className="text-xs text-gray-300 flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Алерты */}
      {alerts.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Активные алерты</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
                <span className="text-red-400">⚠️</span>
                <div className="flex-1">
                  <div className="text-sm text-red-400 font-medium">{alert.message}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleString()} • {alert.service}
                  </div>
                </div>
                <button className="admin-button px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 