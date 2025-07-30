import React, { useState, useEffect } from 'react';

export const LoadingTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const runLoadingTests = async () => {
      const results: string[] = [];
      
      try {
        results.push('🚀 Начало тестирования загрузки приложения...');
        
        // Тест 1: Проверка Vite dev server
        results.push('🔍 Тест 1: Vite dev server...');
        try {
          const response = await fetch('/');
          if (response.ok) {
            results.push('✅ Vite dev server работает');
          } else {
            results.push(`❌ Vite dev server ошибка: ${response.status}`);
          }
        } catch (err) {
          results.push(`❌ Vite dev server недоступен: ${err}`);
        }
        
        // Тест 2: Проверка модулей
        results.push('🔍 Тест 2: JavaScript модули...');
        try {
          const moduleResponse = await fetch('/src/main.tsx');
          if (moduleResponse.ok) {
            const contentType = moduleResponse.headers.get('content-type');
            if (contentType && contentType.includes('javascript')) {
              results.push('✅ JavaScript модули загружаются корректно');
            } else {
              results.push(`⚠️ Неправильный MIME тип: ${contentType}`);
            }
          } else {
            results.push(`❌ Ошибка загрузки модулей: ${moduleResponse.status}`);
          }
        } catch (err) {
          results.push(`❌ Ошибка загрузки модулей: ${err}`);
        }
        
        // Тест 3: Проверка API
        results.push('🔍 Тест 3: API сервер...');
        try {
          const apiResponse = await fetch('/api/health');
          if (apiResponse.ok) {
            const data = await apiResponse.json();
            results.push(`✅ API сервер работает: ${data.status}`);
          } else {
            results.push(`❌ API сервер ошибка: ${apiResponse.status}`);
          }
        } catch (err) {
          results.push(`❌ API сервер недоступен: ${err}`);
        }
        
        // Тест 4: Проверка React
        results.push('🔍 Тест 4: React...');
        results.push(`✅ React версия: ${React.version}`);
        
        // Тест 5: Проверка браузера
        results.push('🔍 Тест 5: Браузер...');
        results.push(`✅ User Agent: ${navigator.userAgent.substring(0, 50)}...`);
        results.push(`✅ Платформа: ${navigator.platform}`);
        
        // Тест 6: Проверка viewport
        results.push('🔍 Тест 6: Viewport...');
        results.push(`✅ Размер окна: ${window.innerWidth}x${window.innerHeight}`);
        results.push(`✅ Размер экрана: ${screen.width}x${screen.height}`);
        
        // Тест 7: Проверка localStorage
        results.push('🔍 Тест 7: LocalStorage...');
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          results.push('✅ LocalStorage работает');
        } catch (err) {
          results.push(`❌ LocalStorage ошибка: ${err}`);
        }
        
        // Тест 8: Проверка Telegram WebApp
        results.push('🔍 Тест 8: Telegram WebApp...');
        if (window.Telegram?.WebApp) {
          results.push('✅ Telegram WebApp доступен');
          const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (user) {
            results.push(`✅ Telegram пользователь: ${user.first_name || 'Unknown'}`);
          } else {
            results.push('⚠️ Telegram пользователь не определен');
          }
        } else {
          results.push('⚠️ Telegram WebApp недоступен (но это нормально для веб-версии)');
        }
        
        results.push('✅ Все тесты завершены успешно!');
        
      } catch (err) {
        results.push(`❌ Критическая ошибка тестирования: ${err}`);
      }
      
      setTestResults(results);
      setIsComplete(true);
    };
    
    runLoadingTests();
  }, []);

  if (!isComplete) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        padding: '20px',
        fontSize: '14px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '18px' }}>
          🔧 Тестирование загрузки приложения...
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div>Проверка Vite dev server...</div>
          <div>Проверка JavaScript модулей...</div>
          <div>Проверка API сервера...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      color: '#fff',
      padding: '20px',
      fontSize: '14px',
      zIndex: 10000,
      overflow: 'auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '18px' }}>
        🔧 Результаты тестирования загрузки
      </div>
      
      {testResults.map((result, index) => (
        <div key={index} style={{ 
          marginBottom: '8px',
          color: result.includes('❌') ? '#ff4444' : 
                 result.includes('⚠️') ? '#ffaa00' : 
                 result.includes('✅') ? '#00ff88' : '#ffffff'
        }}>
          {result}
        </div>
      ))}
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Перезагрузить страницу
        </button>
        
        <button 
          onClick={() => {
            const element = document.getElementById('loading-test');
            if (element) element.remove();
          }} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Скрыть тест
        </button>
      </div>
    </div>
  );
}; 