const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');
const config = require('../config/decimal');

async function comprehensiveSystemAudit() {
  try {
    console.log('🔍 КОМПЛЕКСНЫЙ АУДИТ СИСТЕМЫ ВВОДА/ВЫВОДА');
    console.log('===============================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Инициализируем DecimalService
    if (!decimalService.web3) {
      await decimalService.initialize();
    }
    console.log('✅ DecimalService инициализирован');
    
    // === 1. АНАЛИЗ КОНФИГУРАЦИИ ===
    console.log('\n📋 1. АНАЛИЗ КОНФИГУРАЦИИ');
    console.log('============================');
    
    console.log(`RPC URL: ${config.RPC_URL}`);
    console.log(`API Base URL: ${config.API_BASE_URL}`);
    console.log(`Working Address: ${config.WORKING_ADDRESS}`);
    console.log(`Chain ID: ${config.CHAIN_ID}`);
    console.log(`Gas Limit: ${config.GAS_LIMIT}`);
    
    // Проверяем приватный ключ
    try {
      const privateKey = config.getPrivateKey();
      console.log(`Private Key: ${privateKey ? '✅ Настроен' : '❌ Не настроен'}`);
    } catch (error) {
      console.log(`Private Key: ❌ Ошибка: ${error.message}`);
    }
    
    // === 2. ПРОВЕРКА ПОДКЛЮЧЕНИЙ ===
    console.log('\n🔗 2. ПРОВЕРКА ПОДКЛЮЧЕНИЙ');
    console.log('============================');
    
    // Проверяем RPC
    try {
      const blockNumber = await decimalService.web3.eth.getBlockNumber();
      console.log(`✅ RPC подключен, блок: ${blockNumber}`);
    } catch (error) {
      console.log(`❌ RPC ошибка: ${error.message}`);
    }
    
    // Проверяем API
    try {
      const testResponse = await fetch(`${config.API_BASE_URL}/addresses/`, { timeout: 5000 });
      console.log(`✅ API доступен: ${testResponse.status}`);
    } catch (error) {
      console.log(`❌ API недоступен: ${error.message}`);
    }
    
    // Проверяем Redis
    console.log(`Redis: ${decimalService.hasRedis ? '✅ Подключен' : '❌ Недоступен'}`);
    
    // === 3. АНАЛИЗ БАЛАНСОВ ===
    console.log('\n💰 3. АНАЛИЗ БАЛАНСОВ');
    console.log('=======================');
    
    try {
      const workingBalance = await decimalService.getWorkingBalance();
      console.log(`Рабочий кошелек: ${workingBalance} DEL`);
      
      if (workingBalance < 1000) {
        console.log(`⚠️ ВНИМАНИЕ: Низкий баланс рабочего кошелька!`);
      }
    } catch (error) {
      console.log(`❌ Ошибка получения баланса: ${error.message}`);
    }
    
    // === 4. АНАЛИЗ ДЕПОЗИТОВ ===
    console.log('\n📥 4. АНАЛИЗ ДЕПОЗИТОВ');
    console.log('========================');
    
    const deposits = await database.collection('deposits').find({}).toArray();
    const activeDeposits = deposits.filter(d => !d.matched && d.expiresAt > new Date());
    const matchedDeposits = deposits.filter(d => d.matched);
    const expiredDeposits = deposits.filter(d => d.expiresAt <= new Date());
    
    console.log(`Всего депозитов: ${deposits.length}`);
    console.log(`Активных: ${activeDeposits.length}`);
    console.log(`Обработанных: ${matchedDeposits.length}`);
    console.log(`Истекших: ${expiredDeposits.length}`);
    
    // Анализируем активные депозиты
    if (activeDeposits.length > 0) {
      console.log('\n📋 Активные депозиты:');
      for (const deposit of activeDeposits.slice(0, 5)) {
        console.log(`   ${deposit.uniqueAmount} DEL - ${deposit.userId} - ${deposit.createdAt}`);
      }
    }
    
    // === 5. АНАЛИЗ ВЫВОДОВ ===
    console.log('\n📤 5. АНАЛИЗ ВЫВОДОВ');
    console.log('======================');
    
    const withdrawals = await database.collection('withdrawals').find({}).toArray();
    const queuedWithdrawals = withdrawals.filter(w => w.status === 'queued');
    const processingWithdrawals = withdrawals.filter(w => w.status === 'processing');
    const sentWithdrawals = withdrawals.filter(w => w.status === 'sent');
    const failedWithdrawals = withdrawals.filter(w => w.status === 'failed');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
    
    console.log(`Всего выводов: ${withdrawals.length}`);
    console.log(`В очереди: ${queuedWithdrawals.length}`);
    console.log(`Обрабатываются: ${processingWithdrawals.length}`);
    console.log(`Отправлены: ${sentWithdrawals.length}`);
    console.log(`Провалены: ${failedWithdrawals.length}`);
    console.log(`Завершены: ${completedWithdrawals.length}`);
    
    // Анализируем проблемные выводы
    const problematicWithdrawals = [...processingWithdrawals, ...failedWithdrawals];
    if (problematicWithdrawals.length > 0) {
      console.log('\n⚠️ Проблемные выводы:');
      for (const withdrawal of problematicWithdrawals.slice(0, 5)) {
        console.log(`   ${withdrawal.amount} DEL - ${withdrawal.status} - ${withdrawal.error || 'Нет ошибки'}`);
        if (withdrawal.processingStartedAt) {
          const processingTime = Date.now() - new Date(withdrawal.processingStartedAt).getTime();
          console.log(`     В обработке: ${Math.round(processingTime / 1000)} сек`);
        }
      }
    }
    
    // === 6. АНАЛИЗ МОНИТОРИНГА ===
    console.log('\n👁️ 6. АНАЛИЗ МОНИТОРИНГА');
    console.log('===========================');
    
    // Проверяем последний обработанный блок
    let lastBlock;
    if (decimalService.hasRedis && decimalService.redis) {
      try {
        lastBlock = await decimalService.redis.get('DECIMAL_LAST_BLOCK');
      } catch (error) {
        console.log(`Redis ошибка: ${error.message}`);
      }
    }
    
    if (!lastBlock) {
      lastBlock = decimalService.localLastBlock;
    }
    
    console.log(`Последний обработанный блок: ${lastBlock || 'Неизвестно'}`);
    
    // Проверяем текущий блок
    try {
      const currentBlock = await decimalService.web3.eth.getBlockNumber();
      console.log(`Текущий блок: ${currentBlock}`);
      
      if (lastBlock) {
        const blocksBehind = Number(currentBlock) - Number(lastBlock);
        console.log(`Отставание: ${blocksBehind} блоков`);
        
        if (blocksBehind > 100) {
          console.log(`⚠️ ВНИМАНИЕ: Большое отставание в мониторинге!`);
        }
      }
    } catch (error) {
      console.log(`❌ Ошибка получения блока: ${error.message}`);
    }
    
    // === 7. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ ===
    console.log('\n👥 7. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('============================');
    
    const users = await database.collection('users').find({}).toArray();
    const usersWithTokens = users.filter(u => (u.gameState?.tokens || 0) > 0);
    
    console.log(`Всего пользователей: ${users.length}`);
    console.log(`С токенами: ${usersWithTokens.length}`);
    
    if (usersWithTokens.length > 0) {
      const totalTokens = usersWithTokens.reduce((sum, u) => sum + (u.gameState?.tokens || 0), 0);
      console.log(`Общая сумма токенов: ${totalTokens} DEL`);
      
      const topUsers = usersWithTokens
        .sort((a, b) => (b.gameState?.tokens || 0) - (a.gameState?.tokens || 0))
        .slice(0, 5);
      
      console.log('\n🏆 Топ пользователей по балансу:');
      for (const user of topUsers) {
        console.log(`   ${user.username || user.telegramUsername || user.userId}: ${user.gameState?.tokens || 0} DEL`);
      }
    }
    
    // === 8. ВЫЯВЛЕНИЕ ПРОБЛЕМ ===
    console.log('\n🚨 8. ВЫЯВЛЕНИЕ ПРОБЛЕМ');
    console.log('==========================');
    
    const problems = [];
    
    // Проблема 1: Застрявшие выводы
    const stuckWithdrawals = processingWithdrawals.filter(w => {
      if (!w.processingStartedAt) return false;
      const processingTime = Date.now() - new Date(w.processingStartedAt).getTime();
      return processingTime > 5 * 60 * 1000; // 5 минут
    });
    
    if (stuckWithdrawals.length > 0) {
      problems.push(`Застрявшие выводы: ${stuckWithdrawals.length}`);
      console.log(`❌ Застрявшие выводы: ${stuckWithdrawals.length}`);
    }
    
    // Проблема 2: Неудачные выводы
    if (failedWithdrawals.length > 0) {
      problems.push(`Неудачные выводы: ${failedWithdrawals.length}`);
      console.log(`❌ Неудачные выводы: ${failedWithdrawals.length}`);
    }
    
    // Проблема 3: Истекшие депозиты
    if (expiredDeposits.length > 0) {
      problems.push(`Истекшие депозиты: ${expiredDeposits.length}`);
      console.log(`❌ Истекшие депозиты: ${expiredDeposits.length}`);
    }
    
    // Проблема 4: Низкий баланс рабочего кошелька
    try {
      const workingBalance = await decimalService.getWorkingBalance();
      if (workingBalance < 1000) {
        problems.push(`Низкий баланс рабочего кошелька: ${workingBalance} DEL`);
        console.log(`❌ Низкий баланс рабочего кошелька: ${workingBalance} DEL`);
      }
    } catch (error) {
      problems.push(`Ошибка получения баланса: ${error.message}`);
      console.log(`❌ Ошибка получения баланса: ${error.message}`);
    }
    
    // Проблема 5: Отсутствие мониторинга
    if (!lastBlock) {
      problems.push('Мониторинг блоков не активен');
      console.log(`❌ Мониторинг блоков не активен`);
    }
    
    if (problems.length === 0) {
      console.log('✅ Проблем не обнаружено');
    } else {
      console.log(`\n📊 Найдено проблем: ${problems.length}`);
    }
    
    // === 9. РЕКОМЕНДАЦИИ ===
    console.log('\n💡 9. РЕКОМЕНДАЦИИ');
    console.log('===================');
    
    if (problems.length > 0) {
      console.log('🔧 Необходимые исправления:');
      
      if (stuckWithdrawals.length > 0) {
        console.log('   1. Принудительно обработать застрявшие выводы');
      }
      
      if (failedWithdrawals.length > 0) {
        console.log('   2. Повторить неудачные выводы');
      }
      
      if (expiredDeposits.length > 0) {
        console.log('   3. Очистить истекшие депозиты');
      }
      
      if (!lastBlock) {
        console.log('   4. Перезапустить мониторинг блоков');
      }
    } else {
      console.log('✅ Система работает корректно');
    }
    
    console.log('\n✅ Аудит завершен');
    
  } catch (error) {
    console.error('❌ Ошибка аудита:', error);
  }
}

comprehensiveSystemAudit(); 