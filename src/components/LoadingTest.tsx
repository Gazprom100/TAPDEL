import React, { useState, useEffect } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const LoadingTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const runLoadingTests = async () => {
      const results: TestResult[] = [];
      
      // Тест 1: Vite dev server
      const startTime1 = Date.now();
      try {
        const response = await fetch('/', { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const duration1 = Date.now() - startTime1;
        results.push({
          name: 'Vite Dev Server',
          status: response.ok ? 'success' : 'error',
          message: `HTTP ${response.status} (${duration1}ms)`,
          duration: duration1
        });
      } catch (error) {
        results.push({
          name: 'Vite Dev Server',
          status: 'error',
          message: `Error: ${error}`
        });
      }

      // Тест 2: JavaScript modules
      const startTime2 = Date.now();
      try {
        const response = await fetch('/src/main.tsx', { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const duration2 = Date.now() - startTime2;
        results.push({
          name: 'JavaScript Modules',
          status: response.ok ? 'success' : 'error',
          message: `HTTP ${response.status} (${duration2}ms)`,
          duration: duration2
        });
      } catch (error) {
        results.push({
          name: 'JavaScript Modules',
          status: 'error',
          message: `Error: ${error}`
        });
      }

      // Тест 3: API server
      const startTime3 = Date.now();
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const duration3 = Date.now() - startTime3;
        results.push({
          name: 'API Server',
          status: response.ok ? 'success' : 'error',
          message: `HTTP ${response.status} (${duration3}ms)`,
          duration: duration3
        });
      } catch (error) {
        results.push({
          name: 'API Server',
          status: 'error',
          message: `Error: ${error}`
        });
      }

      // Тест 4: React version
      results.push({
        name: 'React Version',
        status: 'success',
        message: `React ${React.version}`
      });

      // Тест 5: Browser
      results.push({
        name: 'Browser',
        status: 'success',
        message: `${navigator.userAgent.split(' ')[0]} - ${navigator.platform}`
      });

      // Тест 6: Viewport
      results.push({
        name: 'Viewport',
        status: 'success',
        message: `${window.innerWidth}x${window.innerHeight} (screen: ${screen.width}x${screen.height})`
      });

      // Тест 7: LocalStorage
      try {
        const testKey = '__test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        results.push({
          name: 'LocalStorage',
          status: 'success',
          message: 'Available and working'
        });
      } catch (error) {
        results.push({
          name: 'LocalStorage',
          status: 'error',
          message: `Error: ${error}`
        });
      }

      // Тест 8: Telegram WebApp
      if (window.Telegram?.WebApp) {
        results.push({
          name: 'Telegram WebApp',
          status: 'success',
          message: 'Available'
        });
      } else {
        results.push({
          name: 'Telegram WebApp',
          status: 'error',
          message: 'Not available'
        });
      }

      // Тест 9: Service Worker
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          results.push({
            name: 'Service Worker',
            status: registration ? 'success' : 'error',
            message: registration ? 'Registered' : 'Not registered'
          });
        } else {
          results.push({
            name: 'Service Worker',
            status: 'error',
            message: 'Not supported'
          });
        }
      } catch (error) {
        results.push({
          name: 'Service Worker',
          status: 'error',
          message: `Error: ${error}`
        });
      }

      // Тест 10: Network connectivity
      try {
        const response = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          mode: 'no-cors'
        });
        results.push({
          name: 'Network',
          status: 'success',
          message: 'Internet connection available'
        });
      } catch (error) {
        results.push({
          name: 'Network',
          status: 'error',
          message: `No internet connection: ${error}`
        });
      }

      setTestResults(results);
      setIsComplete(true);
    };

    runLoadingTests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 9998,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '350px',
      maxHeight: '500px',
      overflow: 'auto',
      fontFamily: 'monospace'
    }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>🔧 Loading Test</strong>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isVisible ? '▼' : '▲'}
        </button>
      </div>
      
      {isVisible && (
        <>
          {!isComplete && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div>🔄 Running tests...</div>
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '60%',
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    animation: 'pulse 1s infinite'
                  }}></div>
                </div>
              </div>
            </div>
          )}
          
          {isComplete && (
            <div>
              {testResults.map((result, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '5px',
                  borderLeft: `3px solid ${getStatusColor(result.status)}`,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <strong>{result.name}</strong>
                    <span style={{ color: getStatusColor(result.status) }}>●</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc' }}>
                    {result.message}
                    {result.duration && ` (${result.duration}ms)`}
                  </div>
                </div>
              ))}
              
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px'
              }}>
                <strong>Summary:</strong>
                <div>✅ Success: {testResults.filter(r => r.status === 'success').length}</div>
                <div>❌ Errors: {testResults.filter(r => r.status === 'error').length}</div>
                <div>⏳ Pending: {testResults.filter(r => r.status === 'pending').length}</div>
              </div>
            </div>
          )}
        </>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}; 