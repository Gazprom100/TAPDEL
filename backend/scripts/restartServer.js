const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServerManager {
  constructor() {
    this.serverProcess = null;
    this.isRestarting = false;
    this.restartCount = 0;
    this.maxRestarts = 3;
    this.restartDelay = 5000; // 5 секунд
  }

  async checkServerHealth() {
    try {
      const response = await fetch('http://localhost:3000/api/decimal/test');
      const data = await response.json();
      return response.ok && data.message === 'DecimalChain API работает!';
    } catch (error) {
      return false;
    }
  }

  async waitForServer(maxAttempts = 30) {
    console.log('⏳ Ожидание запуска сервера...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isHealthy = await this.checkServerHealth();
      if (isHealthy) {
        console.log(`✅ Сервер запущен и работает (попытка ${attempt}/${maxAttempts})`);
        return true;
      }
      
      console.log(`⏳ Попытка ${attempt}/${maxAttempts}: сервер еще не готов...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('❌ Сервер не запустился в течение ожидаемого времени');
    return false;
  }

  startServer() {
    console.log('🚀 Запуск сервера...');
    
    this.serverProcess = spawn('node', ['server.js'], {
      stdio: 'pipe',
      cwd: __dirname
    });

    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`📤 [SERVER] ${output.trim()}`);
      
      // Проверяем на успешный запуск
      if (output.includes('Server is ready to handle requests')) {
        console.log('✅ Сервер успешно запущен!');
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(`❌ [SERVER ERROR] ${error.trim()}`);
    });

    this.serverProcess.on('close', (code) => {
      console.log(`🔴 Сервер завершился с кодом ${code}`);
      
      if (!this.isRestarting && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        console.log(`🔄 Перезапуск сервера (${this.restartCount}/${this.maxRestarts})...`);
        this.restartServer();
      } else if (this.restartCount >= this.maxRestarts) {
        console.log('❌ Превышено максимальное количество перезапусков');
        process.exit(1);
      }
    });

    this.serverProcess.on('error', (error) => {
      console.error('❌ Ошибка запуска сервера:', error);
    });
  }

  async restartServer() {
    this.isRestarting = true;
    
    if (this.serverProcess) {
      console.log('🛑 Остановка текущего сервера...');
      this.serverProcess.kill('SIGTERM');
      
      // Ждем завершения процесса
      await new Promise(resolve => setTimeout(resolve, this.restartDelay));
    }
    
    this.isRestarting = false;
    this.startServer();
  }

  async stopServer() {
    console.log('🛑 Остановка сервера...');
    
    if (this.serverProcess) {
      this.isRestarting = true; // Предотвращаем автоматический перезапуск
      this.serverProcess.kill('SIGTERM');
      
      // Ждем завершения процесса
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async runHealthCheck() {
    console.log('\n🏥 Проверка здоровья системы...');
    
    try {
      const response = await fetch('http://localhost:3000/api/decimal/info');
      const data = await response.json();
      
      console.log('📊 Статус системы:');
      console.log(`   Рабочий адрес: ${data.workingAddress}`);
      console.log(`   Баланс кошелька: ${data.workingBalance} DEL`);
      console.log(`   Chain ID: ${data.chainId}`);
      console.log(`   Подтверждения: ${data.confirmationsRequired}`);
      
      return true;
    } catch (error) {
      console.log('❌ Ошибка проверки здоровья:', error.message);
      return false;
    }
  }

  async runFullRestart() {
    console.log('🔄 Запуск полного перезапуска системы TAPDEL...\n');
    
    try {
      // Останавливаем сервер если он запущен
      await this.stopServer();
      
      // Запускаем сервер
      this.startServer();
      
      // Ждем запуска
      const isStarted = await this.waitForServer();
      
      if (isStarted) {
        console.log('\n✅ Сервер успешно перезапущен!');
        
        // Проверяем здоровье системы
        await this.runHealthCheck();
        
        console.log('\n🎉 Система TAPDEL готова к работе!');
        console.log('📝 Логи сервера будут отображаться ниже:');
        console.log('=' * 50);
        
        // Держим процесс активным для мониторинга
        process.on('SIGINT', async () => {
          console.log('\n🛑 Получен сигнал остановки...');
          await this.stopServer();
          process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
          console.log('\n🛑 Получен сигнал завершения...');
          await this.stopServer();
          process.exit(0);
        });
        
      } else {
        console.log('\n❌ Не удалось запустить сервер');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Ошибка перезапуска:', error);
      process.exit(1);
    }
  }
}

// Запуск перезапуска
const manager = new ServerManager();
manager.runFullRestart(); 