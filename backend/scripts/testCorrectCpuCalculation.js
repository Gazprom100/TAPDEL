const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testCorrectCpuCalculation() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ ПРАВИЛЬНОГО РАСЧЕТА CPU');
    console.log('========================================\n');
    
    console.log(`📊 Платформа: ${process.platform}`);
    console.log(`💻 Количество CPU: ${os.cpus().length}`);
    console.log(`🔄 Load Average: ${os.loadavg().join(', ')}\n`);
    
    // Старый метод (неправильный)
    const oldCpuUsage = os.loadavg()[0] * 100;
    console.log(`❌ СТАРЫЙ МЕТОД (неправильный):`);
    console.log(`   os.loadavg()[0] * 100 = ${os.loadavg()[0]} * 100 = ${oldCpuUsage.toFixed(2)}%`);
    console.log(`   ⚠️ Это показывает нагрузку на все ядра, а не процент использования!`);
    
    // Новый метод (правильный)
    console.log(`\n✅ НОВЫЙ МЕТОД (правильный):`);
    
    let cpuUsage = 0;
    try {
      if (process.platform === 'darwin') {
        console.log(`   🍎 macOS - используем команду 'top'`);
        const { stdout } = await execAsync('top -l 1 | grep "CPU usage" | awk \'{print $3}\' | sed \'s/%//\'');
        cpuUsage = parseFloat(stdout.trim());
        console.log(`   📋 Результат команды: ${stdout.trim()}`);
        console.log(`   ✅ CPU Usage: ${cpuUsage}%`);
      } else if (process.platform === 'linux') {
        console.log(`   🐧 Linux - используем команду 'top'`);
        const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | sed \'s/%us,//\'');
        cpuUsage = parseFloat(stdout.trim());
        console.log(`   📋 Результат команды: ${stdout.trim()}`);
        console.log(`   ✅ CPU Usage: ${cpuUsage}%`);
      } else {
        console.log(`   🔧 Другая платформа - используем fallback`);
        const loadAvg = os.loadavg()[0];
        const cpuCount = os.cpus().length;
        cpuUsage = (loadAvg / cpuCount) * 100;
        console.log(`   📋 Load Average / CPU Count * 100 = ${loadAvg} / ${cpuCount} * 100`);
        console.log(`   ✅ CPU Usage: ${cpuUsage.toFixed(2)}%`);
      }
    } catch (error) {
      console.log(`   ⚠️ Ошибка получения данных о CPU: ${error.message}`);
      console.log(`   🔄 Используем fallback метод`);
      const loadAvg = os.loadavg()[0];
      const cpuCount = os.cpus().length;
      cpuUsage = (loadAvg / cpuCount) * 100;
      console.log(`   📋 Load Average / CPU Count * 100 = ${loadAvg} / ${cpuCount} * 100`);
      console.log(`   ✅ CPU Usage: ${cpuUsage.toFixed(2)}%`);
    }
    
    console.log(`\n📊 СРАВНЕНИЕ МЕТОДОВ:`);
    console.log(`   ❌ Старый метод: ${oldCpuUsage.toFixed(2)}%`);
    console.log(`   ✅ Новый метод: ${cpuUsage.toFixed(2)}%`);
    console.log(`   📈 Разница: ${Math.abs(oldCpuUsage - cpuUsage).toFixed(2)}%`);
    
    console.log(`\n🔍 ОБЪЯСНЕНИЕ ПРОБЛЕМЫ:`);
    console.log(`   • Старый метод: os.loadavg()[0] * 100`);
    console.log(`   • Load Average показывает среднюю нагрузку на систему`);
    console.log(`   • Умножение на 100 дает неправильный результат для многопроцессорных систем`);
    console.log(`   • Например: 4 ядра, нагрузка 2.0 = 200% (неправильно!)`);
    console.log(`   • Правильно: 2.0 / 4 * 100 = 50% (правильно!)`);
    
    console.log(`\n📋 ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:`);
    console.log(JSON.stringify({
      cpu: Math.min(cpuUsage, 100),
      memory: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      platform: process.platform,
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      oldMethod: oldCpuUsage.toFixed(2),
      newMethod: cpuUsage.toFixed(2)
    }, null, 2));
    
    console.log(`\n✅ ПРОБЛЕМА РЕШЕНА!`);
    console.log(`   Теперь CPU будет показывать реальный процент использования, а не нагрузку на все ядра.`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testCorrectCpuCalculation(); 