const config = require('../config/decimal');

function testDepositGeneration() {
  console.log('🧪 ТЕСТИРОВАНИЕ ГЕНЕРАЦИИ ДЕПОЗИТОВ\n');
  
  const testUsers = [
    'telegram-7013973686', // AirdropsVSDonuts
    'telegram-1234567890', // Тестовый пользователь 1
    'telegram-9876543210', // Тестовый пользователь 2
  ];
  
  const testAmounts = [1, 10, 100, 1000];
  
  console.log('📊 Результаты генерации:');
  console.log('=' * 60);
  
  testUsers.forEach(userId => {
    console.log(`\n👤 Пользователь: ${userId}`);
    testAmounts.forEach(amount => {
      const uniqueAmount = config.generateUniqueAmount(amount, userId);
      console.log(`   ${amount} DEL → ${uniqueAmount} DEL`);
    });
  });
  
  console.log('\n✅ Тест завершен');
}

testDepositGeneration(); 