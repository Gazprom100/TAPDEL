console.log('🔍 Тестирую загрузку api.js...');

try {
  const apiRoutes = require('./routes/api');
  console.log('✅ api.js загружен успешно');
  console.log('📋 Тип:', typeof apiRoutes);
  console.log('📋 Содержимое:', Object.keys(apiRoutes));
} catch (error) {
  console.error('❌ Ошибка загрузки api.js:', error);
} 