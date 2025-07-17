const { spawn } = require('child_process');
const path = require('path');

class AutoFixAndRestart {
  constructor() {
    this.results = {
      timestamp: new Date(),
      steps: [],
      success: false
    };
  }

  async runScript(scriptName, description) {
    console.log(`\n🔄 Запуск: ${description}`);
    console.log('=' * 50);
    
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, scriptName);
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: __dirname
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${description} завершен успешно`);
          this.results.steps.push({
            step: description,
            status: 'success',
            exitCode: code
          });
          resolve(true);
        } else {
          console.log(`❌ ${description} завершен с ошибкой (код: ${code})`);
          this.results.steps.push({
            step: description,
            status: 'error',
            exitCode: code
          });
          reject(new Error(`${description} failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.log(`❌ Ошибка запуска ${description}:`, error.message);
        this.results.steps.push({
          step: description,
          status: 'error',
          error: error.message
        });
        reject(error);
      });
    });
  }

  async runFullAutomation() {
    console.log('🚀 ЗАПУСК ПОЛНОЙ АВТОМАТИЗАЦИИ СИСТЕМЫ TAPDEL');
    console.log('=' * 60);
    console.log('Этапы:');
    console.log('1. 🔍 Доскональный аудит системы');
    console.log('2. 🔧 Автоматическое исправление всех проблем');
    console.log('3. 🧪 Тестирование исправленной системы');
    console.log('4. 🔄 Перезапуск сервера с мониторингом');
    console.log('=' * 60);

    try {
      // Шаг 1: Аудит
      await this.runScript('comprehensiveAudit.js', 'Доскональный аудит системы');
      
      // Шаг 2: Исправления
      await this.runScript('fixAllBalances.js', 'Автоматическое исправление проблем');
      
      // Шаг 3: Тестирование
      await this.runScript('testSystem.js', 'Тестирование исправленной системы');
      
      // Шаг 4: Перезапуск сервера
      console.log('\n🔄 Запуск перезапуска сервера...');
      console.log('📝 Сервер будет перезапущен и начнет мониторинг');
      console.log('💡 Для остановки нажмите Ctrl+C');
      console.log('=' * 50);
      
      await this.runScript('restartServer.js', 'Перезапуск сервера');
      
      this.results.success = true;
      console.log('\n🎉 ПОЛНАЯ АВТОМАТИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
      
    } catch (error) {
      console.error('\n❌ ОШИБКА В ПРОЦЕССЕ АВТОМАТИЗАЦИИ:', error.message);
      this.results.success = false;
      
      console.log('\n📊 Статус выполнения:');
      this.results.steps.forEach((step, index) => {
        const status = step.status === 'success' ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${step.step}`);
      });
      
      console.log('\n🔧 Рекомендации:');
      console.log('1. Проверьте логи выше для выявления проблем');
      console.log('2. Убедитесь, что все переменные окружения настроены');
      console.log('3. Проверьте подключение к MongoDB и Redis');
      console.log('4. Запустите скрипты по отдельности для детальной диагностики');
    }
  }
}

// Запуск полной автоматизации
const automation = new AutoFixAndRestart();
automation.runFullAutomation(); 