// Скрипт для конвертации Upstash REST URL в Redis URL
const upstashRestUrl = "https://inviting-camel-20897.upstash.io";
const upstashToken = "AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA";

console.log('🔧 Конвертация Upstash URL для TAPDEL');
console.log('=====================================');

console.log('\n📋 ИСХОДНЫЕ ДАННЫЕ:');
console.log(`REST URL: ${upstashRestUrl}`);
console.log(`Token: ${upstashToken.substring(0, 10)}...`);

// Извлекаем хост из REST URL
const url = new URL(upstashRestUrl);
const host = url.hostname;

console.log('\n🔍 АНАЛИЗ URL:');
console.log(`Hostname: ${host}`);
console.log(`Protocol: ${url.protocol}`);

// Создаем Redis URL
const redisUrl = `rediss://default:${upstashToken}@${host}:6379`;

console.log('\n✅ РЕЗУЛЬТАТ:');
console.log(`REDIS_URL: ${redisUrl}`);

console.log('\n📋 ДЛЯ RENDER ENVIRONMENT:');
console.log('Key: REDIS_URL');
console.log(`Value: ${redisUrl}`);

console.log('\n🧪 ТЕСТИРОВАНИЕ:');
console.log('После добавления в Render запустите:');
console.log('cd backend && npm run test-redis');

console.log('\n⚠️ ВАЖНО:');
console.log('• Никогда не коммитьте этот URL в git');
console.log('• Используйте только в переменных окружения');
console.log('• Регулярно ротируйте токены');

console.log('\n=====================================');
console.log('✅ Конвертация завершена!'); 