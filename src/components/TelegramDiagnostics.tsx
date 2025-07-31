import React, { useEffect, useState } from 'react';

interface TelegramDiagnosticInfo {
  hasTelegram: boolean;
  hasWebApp: boolean;
  platform?: string;
  version?: string;
  isExpanded?: boolean;
  user?: any;
  safeArea?: any;
  userAgent: string;
  viewport: string;
  url: string;
  referrer: string;
}

export const TelegramDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnosticInfo | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Задержка для полной инициализации
    setTimeout(() => {
      const tg = window.Telegram?.WebApp;
      
      const info: TelegramDiagnosticInfo = {
        hasTelegram: !!window.Telegram,
        hasWebApp: !!tg,
        platform: tg?.platform,
        version: tg?.version,
        isExpanded: (tg as any)?.isExpanded,
        user: tg?.initDataUnsafe?.user,
        safeArea: tg?.safeAreaInset,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        referrer: document.referrer
      };
      
      setDiagnostics(info);
      
      // Логируем в консоль для удаленной диагностики
      console.log('📊 TELEGRAM DIAGNOSTICS:', info);
    }, 1000);
  }, []);

  if (!isVisible || !diagnostics) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      maxHeight: '80vh',
      overflow: 'auto',
      border: '2px solid #ffcc00'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ color: '#ffcc00' }}>🔍 TELEGRAM WEBAPP ДИАГНОСТИКА</strong>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: '#ff4444',
            border: 'none',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Закрыть
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div><strong>Telegram:</strong> <span style={{ color: diagnostics.hasTelegram ? '#00ff88' : '#ff4444' }}>
          {diagnostics.hasTelegram ? '✅ Доступен' : '❌ Недоступен'}
        </span></div>
        
        <div><strong>WebApp:</strong> <span style={{ color: diagnostics.hasWebApp ? '#00ff88' : '#ff4444' }}>
          {diagnostics.hasWebApp ? '✅ Доступен' : '❌ Недоступен'}
        </span></div>
        
        {diagnostics.platform && (
          <div><strong>Платформа:</strong> <span style={{ color: '#00ff88' }}>{diagnostics.platform}</span></div>
        )}
        
        {diagnostics.version && (
          <div><strong>Версия:</strong> <span style={{ color: '#00ff88' }}>{diagnostics.version}</span></div>
        )}
        
        <div><strong>Развернут:</strong> <span style={{ color: diagnostics.isExpanded ? '#00ff88' : '#ffaa00' }}>
          {diagnostics.isExpanded ? '✅ Да' : '⚠️ Нет'}
        </span></div>
      </div>

      {diagnostics.user && (
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: '#ffcc00' }}>👤 Пользователь:</strong>
          <div>ID: {diagnostics.user.id}</div>
          <div>Имя: {diagnostics.user.first_name} {diagnostics.user.last_name}</div>
          {diagnostics.user.username && <div>Username: @{diagnostics.user.username}</div>}
        </div>
      )}

      {diagnostics.safeArea && (
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: '#ffcc00' }}>📱 Safe Area:</strong>
          <div>Top: {diagnostics.safeArea.top}px</div>
          <div>Bottom: {diagnostics.safeArea.bottom}px</div>
          <div>Left: {diagnostics.safeArea.left}px</div>
          <div>Right: {diagnostics.safeArea.right}px</div>
        </div>
      )}

      <div style={{ marginBottom: '10px' }}>
        <strong style={{ color: '#ffcc00' }}>📱 Устройство:</strong>
        <div>Viewport: {diagnostics.viewport}</div>
        <div>UserAgent: {diagnostics.userAgent.substring(0, 60)}...</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong style={{ color: '#ffcc00' }}>🌐 Навигация:</strong>
        <div>URL: {diagnostics.url}</div>
        {diagnostics.referrer && <div>Referrer: {diagnostics.referrer}</div>}
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255, 204, 0, 0.1)', 
        padding: '10px', 
        borderRadius: '4px',
        marginTop: '10px'
      }}>
        <strong style={{ color: '#ffcc00' }}>ℹ️ Инструкции:</strong>
        <div style={{ fontSize: '11px', marginTop: '5px' }}>
          {!diagnostics.hasWebApp ? (
            <>
              <div style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '5px' }}>
                ❌ ОШИБКА: Приложение открыто в браузере!
              </div>
              1. Закройте эту вкладку браузера<br/>
              2. Откройте Telegram (телефон/компьютер)<br/>
              3. Найдите бота @tapdel_bot<br/>
              4. Отправьте команду /start<br/>
              5. Нажмите кнопку "🎮 Играть TAPDEL"<br/>
              <br/>
              <strong>НЕ ОТКРЫВАЙТЕ ссылку в браузере!</strong>
            </>
          ) : (
            <>
              1. Если Telegram/WebApp недоступен - проверьте, что вы запускаете через бота<br/>
              2. Скопируйте эту информацию и отправьте разработчику<br/>
              3. Проверьте консоль браузера на наличие ошибок
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 