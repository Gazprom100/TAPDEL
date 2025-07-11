const crypto = require('crypto');

const config = {
  WORKING_PRIVKEY_ENC: 'x435O9YfEK4jdApK2VSc0N8lu/LlWtjDpUmhjGat4AB/7U4eMsOxgBqQOYO/GUjGonYr1csAuwhgXqMw+HtByeUy0JiX50XLLyCTOTtFfrjgqlb6t4X2WIem+guMG00Q',
  KEY_PASSPHRASE: 'PyL34X8rWaU6p2OwErGV'
};

function debugPrivateKeyDecryption() {
  console.log('🔍 ОТЛАДКА РАСШИФРОВКИ ПРИВАТНОГО КЛЮЧА');
  console.log('======================================\n');
  
  console.log('📋 Исходные данные:');
  console.log(`   Зашифрованный ключ: ${config.WORKING_PRIVKEY_ENC}`);
  console.log(`   Пароль: ${config.KEY_PASSPHRASE}`);
  console.log(`   Длина зашифрованного ключа: ${config.WORKING_PRIVKEY_ENC.length} символов\n`);
  
  try {
    // Шаг 1: Декодируем из base64
    console.log('🔄 Шаг 1: Декодирование из base64...');
    const encryptedData = Buffer.from(config.WORKING_PRIVKEY_ENC, 'base64');
    console.log(`   Размер после base64: ${encryptedData.length} байт`);
    console.log(`   Hex данные: ${encryptedData.toString('hex').substring(0, 64)}...`);
    
    // Шаг 2: Извлекаем IV и зашифрованные данные
    console.log('\n🔑 Шаг 2: Извлечение IV и зашифрованных данных...');
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    console.log(`   IV (16 байт): ${iv.toString('hex')}`);
    console.log(`   Зашифрованные данные: ${encrypted.length} байт`);
    
    // Шаг 3: Генерируем ключ
    console.log('\n🗝️  Шаг 3: Генерация ключа из пароля...');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(config.KEY_PASSPHRASE, 'salt', 32);
    console.log(`   Алгоритм: ${algorithm}`);
    console.log(`   Ключ (32 байта): ${key.toString('hex')}`);
    
    // Шаг 4: Расшифровка
    console.log('\n🔓 Шаг 4: Расшифровка...');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(`   Расшифрованная длина: ${decrypted.length} символов`);
    console.log(`   Расшифрованные данные: "${decrypted}"`);
    console.log(`   Начинается с "0x": ${decrypted.startsWith('0x')}`);
    
    // Анализ приватного ключа
    console.log('\n📊 Анализ приватного ключа:');
    
    if (decrypted.startsWith('0x')) {
      const hexKey = decrypted.substring(2);
      console.log(`   Hex часть: ${hexKey}`);
      console.log(`   Длина hex: ${hexKey.length} символов`);
      console.log(`   Ожидаемая длина: 64 символа (32 байта)`);
      
      if (hexKey.length === 64) {
        console.log('   ✅ Правильная длина приватного ключа');
        
        // Проверяем что это валидный hex
        const hexRegex = /^[0-9a-fA-F]+$/;
        if (hexRegex.test(hexKey)) {
          console.log('   ✅ Валидный hex формат');
        } else {
          console.log('   ❌ Невалидный hex формат');
          console.log(`   Проблемные символы: ${hexKey.replace(/[0-9a-fA-F]/g, '').split('').join(', ')}`);
        }
      } else {
        console.log(`   ❌ Неправильная длина (должно быть 64, получено ${hexKey.length})`);
      }
    } else {
      console.log('   ❌ Не начинается с "0x"');
      console.log(`   Первые символы: "${decrypted.substring(0, 10)}"`);
    }
    
    // Попытка исправления
    console.log('\n🔧 Попытка исправления формата:');
    let fixedKey = decrypted.trim();
    
    if (!fixedKey.startsWith('0x')) {
      fixedKey = '0x' + fixedKey;
      console.log(`   Добавили префикс "0x": ${fixedKey}`);
    }
    
    if (fixedKey.length !== 66) { // 64 hex + "0x"
      console.log(`   ❌ Неправильная длина после исправления: ${fixedKey.length}`);
    } else {
      console.log(`   ✅ Правильная длина после исправления: ${fixedKey.length}`);
      
      // Тест с Web3
      try {
        const { Web3 } = require('web3');
        const web3 = new Web3();
        const account = web3.eth.accounts.privateKeyToAccount(fixedKey);
        console.log(`   ✅ Web3 принял ключ! Адрес: ${account.address}`);
        
        const expectedAddress = '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
        if (account.address.toLowerCase() === expectedAddress.toLowerCase()) {
          console.log(`   ✅ Адрес совпадает с ожидаемым!`);
        } else {
          console.log(`   ❌ Адрес не совпадает!`);
          console.log(`      Получен: ${account.address}`);
          console.log(`      Ожидался: ${expectedAddress}`);
        }
      } catch (web3Error) {
        console.log(`   ❌ Web3 отклонил ключ: ${web3Error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка расшифровки:', error.message);
    console.error('\n🔍 Возможные причины:');
    console.error('   - Неверный пароль');
    console.error('   - Поврежденные зашифрованные данные');
    console.error('   - Неправильный алгоритм шифрования');
    console.error('   - Проблемы с base64 кодировкой');
  }
}

// Запуск отладки
debugPrivateKeyDecryption(); 