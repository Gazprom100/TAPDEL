import React, { useState, useEffect } from 'react';

interface ApiEndpoint {
  name: string;
  url: string;
  status: 'active' | 'inactive' | 'error';
  lastCheck: string;
  responseTime: number;
  description: string;
}

interface SecuritySettings {
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
  };
  ipWhitelist: {
    enabled: boolean;
    ips: string[];
  };
  sessionTimeout: number;
  maxLoginAttempts: number;
}

interface EnvironmentVariable {
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  isRequired: boolean;
}

interface DeploymentInfo {
  version: string;
  buildDate: string;
  commitHash: string;
  environment: 'production' | 'staging' | 'development';
  lastDeploy: string;
  status: 'running' | 'deploying' | 'error';
}

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'security' | 'environment' | 'deployment'>('api');
  const [saving, setSaving] = useState(false);

  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([
    {
      name: 'DecimalChain API',
      url: 'https://api.decimalchain.com',
      status: 'active',
      lastCheck: new Date().toISOString(),
      responseTime: 120,
      description: 'Основной API для работы с блокчейном'
    },
    {
      name: 'MongoDB',
      url: 'mongodb://localhost:27017',
      status: 'active',
      lastCheck: new Date().toISOString(),
      responseTime: 15,
      description: 'База данных приложения'
    },
    {
      name: 'Redis Cache',
      url: 'redis://localhost:6379',
      status: 'active',
      lastCheck: new Date().toISOString(),
      responseTime: 5,
      description: 'Кэш-сервер'
    },
    {
      name: 'Telegram Bot API',
      url: 'https://api.telegram.org',
      status: 'active',
      lastCheck: new Date().toISOString(),
      responseTime: 25,
      description: 'API Telegram бота'
    }
  ]);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstLimit: 200
    },
    cors: {
      enabled: true,
      allowedOrigins: ['https://tapdel.com', 'https://www.tapdel.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    ipWhitelist: {
      enabled: false,
      ips: []
    },
    sessionTimeout: 3600,
    maxLoginAttempts: 5
  });

  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([
    {
      key: 'MONGODB_URI',
      value: 'mongodb://localhost:27017/tapdel',
      description: 'URI подключения к MongoDB',
      isSecret: false,
      isRequired: true
    },
    {
      key: 'REDIS_URL',
      value: 'redis://localhost:6379',
      description: 'URL подключения к Redis',
      isSecret: false,
      isRequired: true
    },
    {
      key: 'TELEGRAM_BOT_TOKEN',
      value: '********',
      description: 'Токен Telegram бота',
      isSecret: true,
      isRequired: true
    },
    {
      key: 'DECIMAL_API_KEY',
      value: '********',
      description: 'API ключ DecimalChain',
      isSecret: true,
      isRequired: true
    },
    {
      key: 'JWT_SECRET',
      value: '********',
      description: 'Секретный ключ для JWT',
      isSecret: true,
      isRequired: true
    },
    {
      key: 'NODE_ENV',
      value: 'production',
      description: 'Окружение приложения',
      isSecret: false,
      isRequired: true
    }
  ]);

  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    version: '1.2.3',
    buildDate: '2024-01-20T10:30:00Z',
    commitHash: 'a079532',
    environment: 'production',
    lastDeploy: '2024-01-20T10:30:00Z',
    status: 'running'
  });

  const handleSaveSettings = async (type: string) => {
    setSaving(true);
    try {
      // Здесь будет API вызов для сохранения настроек
      console.log(`Сохранение настроек ${type}:`, { apiEndpoints, securitySettings, environmentVariables });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация API
      alert('Настройки сохранены успешно!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      // Здесь будет тест API endpoint
      console.log('Тестирование endpoint:', endpoint.name);
      alert(`Тест ${endpoint.name} выполнен успешно!`);
    } catch (error) {
      console.error('Ошибка теста:', error);
      alert('Ошибка тестирования endpoint');
    }
  };

  const handleDeploy = async () => {
    if (!confirm('Вы уверены, что хотите запустить деплой?')) return;
    
    try {
      // Здесь будет API вызов для деплоя
      console.log('Запуск деплоя...');
      setDeploymentInfo(prev => ({ ...prev, status: 'deploying' }));
      await new Promise(resolve => setTimeout(resolve, 3000)); // Имитация деплоя
      setDeploymentInfo(prev => ({ ...prev, status: 'running' }));
      alert('Деплой выполнен успешно!');
    } catch (error) {
      console.error('Ошибка деплоя:', error);
      setDeploymentInfo(prev => ({ ...prev, status: 'error' }));
      alert('Ошибка деплоя');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'inactive': return 'bg-gray-600';
      case 'error': return 'bg-red-600';
      case 'running': return 'bg-green-600';
      case 'deploying': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'inactive': return 'Неактивен';
      case 'error': return 'Ошибка';
      case 'running': return 'Работает';
      case 'deploying': return 'Деплой';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="admin-scrollable space-y-6">
      <h2 className="text-2xl font-bold">Настройки системы</h2>

      {/* Навигация по настройкам */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('api')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'api' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔗 API Endpoints
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'security' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔒 Безопасность
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'environment' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚙️ Переменные окружения
          </button>
          <button
            onClick={() => setActiveTab('deployment')}
            className={`admin-nav-item px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeTab === 'deployment' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🚀 Deployment
          </button>
        </div>
      </div>

      {/* API Endpoints */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Конфигурация API Endpoints</h3>
            <button
              onClick={() => handleSaveSettings('api')}
              disabled={saving}
              className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm"
            >
              {saving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {apiEndpoints.map((endpoint, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{endpoint.name}</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(endpoint.status)}`}></div>
                    <span className="text-sm text-gray-400">{getStatusText(endpoint.status)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                    <input
                      type="text"
                      value={endpoint.url}
                      onChange={(e) => {
                        const newEndpoints = [...apiEndpoints];
                        newEndpoints[index].url = e.target.value;
                        setApiEndpoints(newEndpoints);
                      }}
                      className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Описание</label>
                    <input
                      type="text"
                      value={endpoint.description}
                      onChange={(e) => {
                        const newEndpoints = [...apiEndpoints];
                        newEndpoints[index].description = e.target.value;
                        setApiEndpoints(newEndpoints);
                      }}
                      className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      Время ответа: {endpoint.responseTime}ms
                    </div>
                    <button
                      onClick={() => handleTestEndpoint(endpoint)}
                      className="admin-button px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      🧪 Тест
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Настройки безопасности */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Настройки безопасности</h3>
            <button
              onClick={() => handleSaveSettings('security')}
              disabled={saving}
              className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm"
            >
              {saving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rate Limiting */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Rate Limiting</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.rateLimiting.enabled}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      rateLimiting: { ...prev.rateLimiting, enabled: e.target.checked }
                    }))}
                    className="admin-input rounded border-gray-600 bg-gray-700"
                  />
                  <label className="text-sm font-medium text-gray-300">Включить rate limiting</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Запросов в минуту</label>
                  <input
                    type="number"
                    value={securitySettings.rateLimiting.requestsPerMinute}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      rateLimiting: { ...prev.rateLimiting, requestsPerMinute: Number(e.target.value) }
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Лимит burst</label>
                  <input
                    type="number"
                    value={securitySettings.rateLimiting.burstLimit}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      rateLimiting: { ...prev.rateLimiting, burstLimit: Number(e.target.value) }
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* CORS */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">CORS настройки</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.cors.enabled}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      cors: { ...prev.cors, enabled: e.target.checked }
                    }))}
                    className="admin-input rounded border-gray-600 bg-gray-700"
                  />
                  <label className="text-sm font-medium text-gray-300">Включить CORS</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Разрешенные домены</label>
                  <textarea
                    value={securitySettings.cors.allowedOrigins.join('\n')}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      cors: { ...prev.cors, allowedOrigins: e.target.value.split('\n').filter(Boolean) }
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* IP Whitelist */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">IP Whitelist</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.ipWhitelist.enabled}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      ipWhitelist: { ...prev.ipWhitelist, enabled: e.target.checked }
                    }))}
                    className="admin-input rounded border-gray-600 bg-gray-700"
                  />
                  <label className="text-sm font-medium text-gray-300">Включить IP whitelist</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Разрешенные IP</label>
                  <textarea
                    value={securitySettings.ipWhitelist.ips.join('\n')}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      ipWhitelist: { ...prev.ipWhitelist, ips: e.target.value.split('\n').filter(Boolean) }
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="192.168.1.1"
                  />
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Настройки сессий</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Таймаут сессии (сек)</label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      sessionTimeout: Number(e.target.value)
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Максимум попыток входа</label>
                  <input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      maxLoginAttempts: Number(e.target.value)
                    }))}
                    className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Переменные окружения */}
      {activeTab === 'environment' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Переменные окружения</h3>
            <button
              onClick={() => handleSaveSettings('environment')}
              disabled={saving}
              className="admin-button px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-sm"
            >
              {saving ? 'Сохранение...' : '💾 Сохранить'}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Ключ</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Значение</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Описание</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Тип</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Обязательная</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {environmentVariables.map((env, index) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{env.key}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type={env.isSecret ? 'password' : 'text'}
                          value={env.value}
                          onChange={(e) => {
                            const newEnvVars = [...environmentVariables];
                            newEnvVars[index].value = e.target.value;
                            setEnvironmentVariables(newEnvVars);
                          }}
                          className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={env.description}
                          onChange={(e) => {
                            const newEnvVars = [...environmentVariables];
                            newEnvVars[index].description = e.target.value;
                            setEnvironmentVariables(newEnvVars);
                          }}
                          className="admin-input w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          env.isSecret ? 'bg-red-600' : 'bg-green-600'
                        }`}>
                          {env.isSecret ? 'Секретная' : 'Публичная'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          env.isRequired ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                          {env.isRequired ? 'Да' : 'Нет'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Deployment */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Deployment управление</h3>
            <button
              onClick={handleDeploy}
              disabled={deploymentInfo.status === 'deploying'}
              className="admin-button px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm"
            >
              {deploymentInfo.status === 'deploying' ? '🚀 Деплой...' : '🚀 Запустить деплой'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Информация о версии</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Версия</span>
                  <span className="text-sm text-white font-medium">{deploymentInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Коммит</span>
                  <span className="text-sm text-white font-medium">{deploymentInfo.commitHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Окружение</span>
                  <span className="text-sm text-white font-medium capitalize">{deploymentInfo.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Статус</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(deploymentInfo.status)}`}></div>
                    <span className="text-sm text-gray-400">{getStatusText(deploymentInfo.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Временные метки</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Дата сборки</span>
                  <span className="text-sm text-white font-medium">
                    {new Date(deploymentInfo.buildDate).toLocaleString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Последний деплой</span>
                  <span className="text-sm text-white font-medium">
                    {new Date(deploymentInfo.lastDeploy).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">История деплоев</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-white">v1.2.3</div>
                  <div className="text-sm text-gray-400">a079532 • 2024-01-20 10:30</div>
                </div>
                <span className="text-sm text-green-400">✅ Успешно</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-white">v1.2.2</div>
                  <div className="text-sm text-gray-400">f79ca6b • 2024-01-19 15:45</div>
                </div>
                <span className="text-sm text-green-400">✅ Успешно</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div>
                  <div className="font-medium text-white">v1.2.1</div>
                  <div className="text-sm text-gray-400">391a6ce • 2024-01-18 12:20</div>
                </div>
                <span className="text-sm text-red-400">❌ Ошибка</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 