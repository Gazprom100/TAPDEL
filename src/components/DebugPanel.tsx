import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface DebugInfo {
  timestamp: string;
  userId: string | null;
  telegramUser: any;
  localStorage: any;
  apiStatus: 'checking' | 'ok' | 'error';
  storeStatus: 'loading' | 'ready' | 'error';
  errors: string[];
}

export const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    timestamp: new Date().toISOString(),
    userId: null,
    telegramUser: null,
    localStorage: {},
    apiStatus: 'checking',
    storeStatus: 'loading',
    errors: []
  });

  const { tokens, profile, isLoading, error } = useGameStore();

  useEffect(() => {
    const updateDebugInfo = async () => {
      try {
        // Собираем информацию
        const userId = localStorage.getItem('userId');
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        // Проверяем API
        let apiStatus: 'checking' | 'ok' | 'error' = 'checking';
        try {
          const response = await fetch('/api/health');
          apiStatus = response.ok ? 'ok' : 'error';
        } catch (err) {
          apiStatus = 'error';
        }

        // Проверяем store
        const storeStatus: 'loading' | 'ready' | 'error' = 
          isLoading ? 'loading' : error ? 'error' : 'ready';

        // Собираем ошибки
        const errors: string[] = [];
        if (error) errors.push(`Store error: ${error}`);
        if (apiStatus === 'error') errors.push('API connection failed');

        setDebugInfo({
          timestamp: new Date().toISOString(),
          userId,
          telegramUser,
          localStorage: {
            userId: localStorage.getItem('userId'),
            oldUserId: localStorage.getItem('oldUserId'),
            telegramUserData: localStorage.getItem('telegramUserData')
          },
          apiStatus,
          storeStatus,
          errors
        });
      } catch (err) {
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, `Debug error: ${err}`]
        }));
      }
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [isLoading, error]);

  if (debugInfo.errors.length === 0 && debugInfo.apiStatus === 'ok' && debugInfo.storeStatus === 'ready') {
    return null; // Скрываем панель если все хорошо
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxHeight: '50vh',
      overflow: 'auto'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        🔧 Debug Panel - {debugInfo.timestamp}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>User ID:</strong> {debugInfo.userId || 'null'}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Telegram User:</strong> {debugInfo.telegramUser ? 'Available' : 'Not available'}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>API Status:</strong> 
        <span style={{ color: debugInfo.apiStatus === 'ok' ? '#00ff00' : '#ff0000' }}>
          {debugInfo.apiStatus}
        </span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Store Status:</strong> 
        <span style={{ color: debugInfo.storeStatus === 'ready' ? '#00ff00' : debugInfo.storeStatus === 'loading' ? '#ffff00' : '#ff0000' }}>
          {debugInfo.storeStatus}
        </span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Tokens:</strong> {tokens}
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Profile:</strong> {profile ? 'Loaded' : 'Not loaded'}
      </div>
      
      {debugInfo.errors.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong style={{ color: '#ff0000' }}>Errors:</strong>
          {debugInfo.errors.map((err, index) => (
            <div key={index} style={{ color: '#ff0000', marginLeft: '10px' }}>
              {err}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '10px' }}>
        <strong>LocalStorage:</strong>
        <pre style={{ fontSize: '10px', marginLeft: '10px' }}>
          {JSON.stringify(debugInfo.localStorage, null, 2)}
        </pre>
      </div>
    </div>
  );
}; 