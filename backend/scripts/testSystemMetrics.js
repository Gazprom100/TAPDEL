const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testSystemMetrics() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ РЕАЛЬНЫХ СИСТЕМНЫХ МЕТРИК');
    console.log('==========================================\n');
    
    // CPU
    const cpuUsage = os.loadavg()[0] * 100;
    console.log(`💻 CPU (1-минутная нагрузка): ${cpuUsage.toFixed(2)}%`);
    
    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    console.log(`🧠 Память: ${memoryUsage.toFixed(2)}% (${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB всего)`);
    
    // Disk
    console.log('\n💾 ДИСК:');
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      console.log(`   ${stdout.trim()}`);
      
      const { stdout: diskUsage } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
      console.log(`   Использование: ${diskUsage.trim()}%`);
    } catch (error) {
      console.log(`   ❌ Ошибка получения данных о диске: ${error.message}`);
    }
    
    // Network
    console.log('\n🌐 СЕТЬ:');
    try {
      const { stdout } = await execAsync('cat /proc/net/dev | grep -E "(eth0|en0|lo)" | head -3');
      console.log(`   Интерфейсы:\n${stdout.trim()}`);
      
      const { stdout: networkStats } = await execAsync('cat /proc/net/dev | grep eth0 | awk \'{print $2 " " $10}\'');
      if (networkStats.trim()) {
        const [rx, tx] = networkStats.trim().split(' ').map(Number);
        console.log(`   Получено: ${(rx / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Отправлено: ${(tx / 1024 / 1024).toFixed(2)} MB`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка получения данных о сети: ${error.message}`);
    }
    
    // Active Connections
    console.log('\n🔗 АКТИВНЫЕ СОЕДИНЕНИЯ:');
    try {
      const { stdout } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
      console.log(`   ESTABLISHED: ${stdout.trim()}`);
      
      const { stdout: totalConnections } = await execAsync('netstat -an | wc -l');
      console.log(`   Всего соединений: ${totalConnections.trim()}`);
    } catch (error) {
      console.log(`   ❌ Ошибка получения данных о соединениях: ${error.message}`);
    }
    
    // Uptime
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    console.log(`\n⏰ Uptime: ${days}д ${hours}ч ${minutes}м`);
    
    // System Info
    console.log('\n📊 ИНФОРМАЦИЯ О СИСТЕМЕ:');
    console.log(`   Платформа: ${os.platform()}`);
    console.log(`   Архитектура: ${os.arch()}`);
    console.log(`   Версия: ${os.release()}`);
    console.log(`   Процессоры: ${os.cpus().length}`);
    
    console.log('\n📋 ИТОГОВЫЕ ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:');
    console.log('=====================================');
    
    let diskUsage = 50;
    try {
      const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
      diskUsage = parseFloat(stdout.trim());
    } catch (error) {
      console.log('   ⚠️ Используем fallback значение для диска: 50%');
    }
    
    let networkIn = 0;
    let networkOut = 0;
    try {
      const { stdout } = await execAsync('cat /proc/net/dev | grep eth0 | awk \'{print $2 " " $10}\'');
      const [rx, tx] = stdout.trim().split(' ').map(Number);
      networkIn = Math.round(rx / 1024 / 1024);
      networkOut = Math.round(tx / 1024 / 1024);
    } catch (error) {
      console.log('   ⚠️ Используем fallback значения для сети: 0 MB');
    }
    
    let activeConnections = 0;
    try {
      const { stdout } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
      activeConnections = parseInt(stdout.trim());
    } catch (error) {
      console.log('   ⚠️ Используем fallback значение для соединений: 0');
    }
    
    console.log(`✅ CPU: ${Math.min(cpuUsage, 100).toFixed(2)}%`);
    console.log(`✅ Память: ${Math.min(memoryUsage, 100).toFixed(2)}%`);
    console.log(`✅ Диск: ${Math.min(diskUsage, 100).toFixed(2)}%`);
    console.log(`✅ Сеть (входящий): ${networkIn} MB`);
    console.log(`✅ Сеть (исходящий): ${networkOut} MB`);
    console.log(`✅ Активные соединения: ${activeConnections}`);
    console.log(`✅ Uptime: ${uptime} секунд`);
    
    console.log('\n🔗 JSON для API:');
    console.log(JSON.stringify({
      cpu: Math.min(cpuUsage, 100),
      memory: Math.min(memoryUsage, 100),
      disk: Math.min(diskUsage, 100),
      network: {
        in: networkIn,
        out: networkOut
      },
      uptime,
      activeConnections
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testSystemMetrics();
