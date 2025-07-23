const fs = require('fs');
const path = require('path');

console.log('🔧 Настройка Redis для TAPDEL');
console.log('================================');

console.log('\n📋 ТЕКУЩИЕ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log(`REDIS_URL: ${process.env.REDIS_URL || 'НЕ УСТАНОВЛЕН'}`);
console.log(`DECIMAL_WORKING_ADDRESS: ${process.env.DECIMAL_WORKING_ADDRESS || 'НЕ УСТАНОВЛЕН'}`);
console.log(`DECIMAL_WORKING_PRIVKEY_ENC: ${process.env.DECIMAL_WORKING_PRIVKEY_ENC ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'}`);
console.log(`DECIMAL_KEY_PASSPHRASE: ${process.env.DECIMAL_KEY_PASSPHRASE ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'}`);

console.log('\n🎯 РЕКОМЕНДУЕМАЯ НАСТРОЙКА REDIS:');

console.log('\n1️⃣ **UPSTASH REDIS (БЕСПЛАТНО)**');
console.log('   ✅ 10,000 запросов/день');
console.log('   ✅ SSL/TLS поддержка');
console.log('   ✅ Простая настройка');
console.log('   ✅ 99.9% uptime');

console.log('\n📝 ШАГИ ДЛЯ НАСТРОЙКИ:');
console.log('1. Перейдите на https://upstash.com');
console.log('2. Создайте аккаунт через GitHub');
console.log('3. Создайте новую Redis базу данных:');
console.log('   - Name: tapdel-redis');
console.log('   - Region: eu-west-1 (или ближайший)');
console.log('   - Database Type: Redis');
console.log('4. Скопируйте REDIS_URL из настроек');
console.log('5. Добавьте в переменные окружения Render');

console.log('\n🔗 АЛЬТЕРНАТИВЫ:');
console.log('• Redis Cloud: https://redis.com (бесплатно)');
console.log('• Railway Redis: https://railway.app (бесплатно)');

console.log('\n📋 ФОРМАТ REDIS_URL:');
console.log('rediss://default:password@region.upstash.io:6379');

console.log('\n🔧 НАСТРОЙКА В RENDER:');
console.log('1. Перейдите в Dashboard Render');
console.log('2. Выберите ваш сервис TAPDEL');
console.log('3. Перейдите в Environment');
console.log('4. Добавьте переменную:');
console.log('   Key: REDIS_URL');
console.log('   Value: ваш_redis_url_здесь');

console.log('\n🧪 ТЕСТИРОВАНИЕ:');
console.log('После настройки запустите:');
console.log('cd backend && node scripts/testRedis.js');

console.log('\n⚠️ ВАЖНО:');
console.log('• Никогда не коммитьте REDIS_URL в git');
console.log('• Используйте переменные окружения в production');
console.log('• Регулярно ротируйте пароли');

console.log('\n📞 ПОДДЕРЖКА:');
console.log('Если нужна помощь:');
console.log('1. Создайте issue в GitHub');
console.log('2. Приложите логи тестирования');
console.log('3. Укажите провайдера Redis');

console.log('\n🎉 ПОСЛЕ НАСТРОЙКИ:');
console.log('• DecimalChain сервис будет работать с кешированием');
console.log('• Пополнения и выводы будут работать быстро');
console.log('• Система будет готова к 2000 пользователям');

console.log('\n================================');
console.log('🔧 Настройка Redis завершена!'); 