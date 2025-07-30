import React, { useState, useEffect } from 'react';

export const InitializationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const runTests = async () => {
      const results: string[] = [];
      
      try {
        // Тест 1: Проверка localStorage
        results.push('🔍 Тест 1: localStorage...');
        const userId = localStorage.getItem('userId');
        results.push(`✅ userId: ${userId || 'null'}`);
        
        // Тест 2: Проверка Telegram WebApp
        results.push('🔍 Тест 2: Telegram WebApp...');
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        results.push(`✅ Telegram user: ${telegramUser ? 'available' : 'not available'}`);
        
        // Тест 3: Проверка API
        results.push('🔍 Тест 3: API connection...');
        try {
          const response = await fetch('/api/health');
          if (response.ok) {
            const data = await response.json();
            results.push(`✅ API OK: ${data.status}`);
          } else {
            results.push(`❌ API Error: ${response.status}`);
          }
        } catch (err) {
          results.push(`❌ API Error: ${err}`);
        }
        
        // Тест 4: Проверка fetch
        results.push('🔍 Тест 4: Fetch API...');
        try {
          const response = await fetch('/api/test');
          if (response.ok) {
            const data = await response.json();
            results.push(`✅ Fetch OK: ${data.message}`);
          } else {
            results.push(`❌ Fetch Error: ${response.status}`);
          }
        } catch (err) {
          results.push(`❌ Fetch Error: ${err}`);
        }
        
        // Тест 5: Проверка React
        results.push('🔍 Тест 5: React...');
        results.push(`✅ React version: ${React.version}`);
        
        // Тест 6: Проверка браузера
        results.push('🔍 Тест 6: Browser...');
        results.push(`✅ User Agent: ${navigator.userAgent.substring(0, 50)}...`);
        results.push(`✅ Platform: ${navigator.platform}`);
        results.push(`✅ Language: ${navigator.language}`);
        
        // Тест 7: Проверка viewport
        results.push('🔍 Тест 7: Viewport...');
        results.push(`✅ Window size: ${window.innerWidth}x${window.innerHeight}`);
        results.push(`✅ Screen size: ${screen.width}x${screen.height}`);
        
        // Тест 8: Проверка ошибок в консоли
        results.push('🔍 Тест 8: Console errors...');
        const originalError = console.error;
        const errors: string[] = [];
        console.error = (...args) => {
          errors.push(args.join(' '));
          originalError.apply(console, args);
        };
        
        // Ждем немного для сбора ошибок
        setTimeout(() => {
          console.error = originalError;
          if (errors.length > 0) {
            results.push(`⚠️ Console errors: ${errors.length} found`);
            errors.slice(0, 3).forEach(err => results.push(`   - ${err.substring(0, 100)}...`));
          } else {
            results.push(`✅ No console errors`);
          }
          setTestResults(results);
          setIsComplete(true);
        }, 2000);
        
      } catch (err) {
        results.push(`❌ Test error: ${err}`);
        setTestResults(results);
        setIsComplete(true);
      }
    };
    
    runTests();
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
        overflow: 'auto'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '18px' }}>
          🔧 Initialization Test Running...
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
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
        🔧 Initialization Test Results
      </div>
      
      {testResults.map((result, index) => (
        <div key={index} style={{ 
          marginBottom: '8px',
          color: result.includes('❌') ? '#ff4444' : result.includes('⚠️') ? '#ffaa00' : '#00ff88'
        }}>
          {result}
        </div>
      ))}
      
      <div style={{ marginTop: '20px' }}>
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
          Reload Page
        </button>
      </div>
    </div>
  );
}; 