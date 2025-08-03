import React, { useEffect, useState } from 'react';

export const ServiceWorkerManager: React.FC = () => {
  const [swStatus, setSwStatus] = useState<string>('checking');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) {
        setSwStatus('not-supported');
        return;
      }

      try {
        // Проверяем, есть ли уже зарегистрированный SW
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        
        if (existingRegistration) {
          setSwRegistration(existingRegistration);
          setSwStatus('already-registered');
          // console.log('Service Worker already registered:', existingRegistration);
          return;
        }

        // Регистрируем новый SW с задержкой
        setTimeout(async () => {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            setSwRegistration(registration);
            setSwStatus('registered');
            // console.log('Service Worker registered successfully:', registration);
          } catch (error) {
            // console.error('Service Worker registration failed:', error);
            setSwStatus('failed');
          }
        }, 3000); // Увеличиваем задержку до 3 секунд

      } catch (error) {
        // console.error('Service Worker check failed:', error);
        setSwStatus('error');
      }
    };

    registerServiceWorker();
  }, []);

  // Отображение статуса только если есть критические проблемы
  if (swStatus === 'checking' || swStatus === 'registered' || swStatus === 'already-registered' || swStatus === 'not-supported') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(255, 165, 0, 0.9)',
      color: 'white',
      padding: '8px',
      borderRadius: '5px',
      fontSize: '11px',
      zIndex: 1000,
      maxWidth: '250px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
        ⚠️ Service Worker: {swStatus}
      </div>
      <div style={{ fontSize: '10px' }}>
        {swStatus === 'failed' && 'Ошибка регистрации Service Worker'}
        {swStatus === 'error' && 'Ошибка проверки Service Worker'}
      </div>
      <button 
        onClick={() => {
          if (swRegistration) {
            swRegistration.unregister();
            window.location.reload();
          }
        }}
        style={{
          marginTop: '3px',
          padding: '2px 6px',
          backgroundColor: 'white',
          color: 'black',
          border: 'none',
          borderRadius: '3px',
          fontSize: '9px',
          cursor: 'pointer'
        }}
      >
        Отключить SW
      </button>
    </div>
  );
}; 