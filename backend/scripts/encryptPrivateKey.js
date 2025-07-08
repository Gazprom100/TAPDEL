const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function encryptPrivateKey(privateKey, passphrase) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(passphrase, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'binary');
  encrypted += cipher.final('binary');
  
  // Объединяем IV и зашифрованные данные
  const encryptedData = Buffer.concat([iv, Buffer.from(encrypted, 'binary')]);
  
  return encryptedData.toString('base64');
}

console.log('🔐 Шифрование приватного ключа для DecimalChain');
console.log('Этот скрипт поможет безопасно зашифровать ваш приватный ключ для хранения в переменных окружения.\n');

rl.question('Введите приватный ключ (без 0x): ', (privateKey) => {
  if (!privateKey || privateKey.length !== 64) {
    console.error('❌ Неверный формат приватного ключа. Должен быть 64 символа (без 0x)');
    rl.close();
    return;
  }
  
  rl.question('Введите пароль для шифрования: ', (passphrase) => {
    if (!passphrase || passphrase.length < 8) {
      console.error('❌ Пароль должен быть минимум 8 символов');
      rl.close();
      return;
    }
    
    try {
      const encrypted = encryptPrivateKey(privateKey, passphrase);
      
      console.log('\n✅ Приватный ключ успешно зашифрован!');
      console.log('\nДобавьте следующие переменные в ваш .env файл:');
      console.log(`DECIMAL_WORKING_PRIVKEY_ENC=${encrypted}`);
      console.log(`DECIMAL_KEY_PASSPHRASE=${passphrase}`);
      
      console.log('\n⚠️ ВАЖНО:');
      console.log('1. Никогда не делитесь зашифрованным ключом и паролем');
      console.log('2. Храните резервную копию незашифрованного ключа в безопасном месте');
      console.log('3. На production используйте переменные окружения, а не .env файл');
      
    } catch (error) {
      console.error('❌ Ошибка шифрования:', error.message);
    }
    
    rl.close();
  });
}); 