require('dotenv').config({ path: './backend/TAPDEL.env' });

const config = require('../backend/config/decimal');

console.log('🔍 Проверка конфигурации DecimalChain...\n');

console.log('📋 Переменные окружения:');
console.log(`DECIMAL_WORKING_ADDRESS: ${process.env.DECIMAL_WORKING_ADDRESS ? '✅ Установлена' : '❌ Отсутствует'}`);
console.log(`DECIMAL_WORKING_PRIVKEY_ENC: ${process.env.DECIMAL_WORKING_PRIVKEY_ENC ? '✅ Установлена' : '❌ Отсутствует'}`);
console.log(`DECIMAL_KEY_PASSPHRASE: ${process.env.DECIMAL_KEY_PASSPHRASE ? '✅ Установлена' : '❌ Отсутствует'}`);
console.log(`REDIS_URL: ${process.env.REDIS_URL ? '✅ Установлена' : '❌ Отсутствует'}`);

console.log('\n🔧 Конфигурация decimal.js:');
console.log(`WORKING_ADDRESS: ${config.WORKING_ADDRESS || 'undefined'}`);
console.log(`WORKING_PRIVKEY_ENC: ${config.WORKING_PRIVKEY_ENC ? 'Установлен' : 'undefined'}`);
console.log(`KEY_PASSPHRASE: ${config.KEY_PASSPHRASE ? 'Установлен' : 'undefined'}`);
console.log(`REDIS_URL: ${config.REDIS_URL || 'undefined'}`);

console.log('\n✅ Результат проверки:');
console.log(`isConfigured(): ${config.isConfigured()}`);

if (!config.isConfigured()) {
  console.log('\n❌ Конфигурация неполная. Отсутствуют:');
  if (!config.WORKING_ADDRESS) console.log('  - DECIMAL_WORKING_ADDRESS');
  if (!config.WORKING_PRIVKEY_ENC) console.log('  - DECIMAL_WORKING_PRIVKEY_ENC');
  if (!config.KEY_PASSPHRASE) console.log('  - DECIMAL_KEY_PASSPHRASE');
  if (!config.REDIS_URL) console.log('  - REDIS_URL');
}

// Если все переменные есть, проверяем приватный ключ
if (config.isConfigured()) {
  try {
    const privateKey = config.getPrivateKey();
    console.log(`\n🔑 Приватный ключ: ${privateKey.substring(0, 10)}... (длина: ${privateKey.length})`);
  } catch (error) {
    console.log(`\n❌ Ошибка получения приватного ключа: ${error.message}`);
  }
} 