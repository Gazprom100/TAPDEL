const rateLimiterMiddleware = require('../middleware/rateLimiter');

async function clearRateLimiting() {
  try {
    console.log('🧹 Очистка rate limiting...');
    
    const result = await rateLimiterMiddleware.clearAllLimits();
    
    if (result) {
      console.log('✅ Rate limiting очищен успешно');
    } else {
      console.log('⚠️ Rate limiting очищен (локально)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка очистки rate limiting:', error);
    process.exit(1);
  }
}

clearRateLimiting(); 