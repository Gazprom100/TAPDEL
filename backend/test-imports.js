console.log('🔍 Тестирую импорты сервисов...');

try {
  console.log('📦 Импортирую cacheService...');
  const cacheService = require('./services/cacheService');
  console.log('✅ cacheService загружен');
} catch (error) {
  console.error('❌ Ошибка загрузки cacheService:', error);
}

try {
  console.log('📦 Импортирую tokenService...');
  const tokenService = require('./services/tokenService');
  console.log('✅ tokenService загружен');
} catch (error) {
  console.error('❌ Ошибка загрузки tokenService:', error);
}

try {
  console.log('📦 Импортирую tokenBalanceService...');
  const tokenBalanceService = require('./services/tokenBalanceService');
  console.log('✅ tokenBalanceService загружен');
} catch (error) {
  console.error('❌ Ошибка загрузки tokenBalanceService:', error);
}

console.log('🔍 Тестирую загрузку api.js с импортами...');

try {
  const apiRoutes = require('./routes/api');
  console.log('✅ api.js загружен успешно с импортами');
} catch (error) {
  console.error('❌ Ошибка загрузки api.js с импортами:', error);
} 