const fetch = require('node-fetch');

async function checkProductionUser() {
  console.log('🔍 Проверка пользователей в production');
  console.log('=====================================');
  
  const testUserId = 'telegram-123456789';
  
  try {
    // Тест 1: Проверка баланса существующего пользователя
    console.log('\n1️⃣ Проверка баланса пользователя');
    const balanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${testUserId}/balance`);
    
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('✅ Баланс пользователя найден:', balance);
    } else {
      const error = await balanceResponse.text();
      console.log('❌ Пользователь не найден:', error);
    }
    
    // Тест 2: Проверка через API пользователей
    console.log('\n2️⃣ Проверка через API пользователей');
    const userResponse = await fetch(`https://tapdel.onrender.com/api/users/${testUserId}`);
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log('✅ Пользователь найден через API:', {
        userId: user.userId,
        tokens: user.gameState?.tokens,
        telegramId: user.profile?.telegramId
      });
    } else {
      const error = await userResponse.text();
      console.log('❌ Пользователь не найден через API:', error);
    }
    
    // Тест 3: Проверка лидерборда
    console.log('\n3️⃣ Проверка лидерборда');
    const leaderboardResponse = await fetch('https://tapdel.onrender.com/api/leaderboard');
    
    if (leaderboardResponse.ok) {
      const leaderboard = await leaderboardResponse.json();
      console.log('✅ Лидерборд загружен:', leaderboard.length, 'пользователей');
      
      const testUserInLeaderboard = leaderboard.find(u => u.userId === testUserId);
      if (testUserInLeaderboard) {
        console.log('✅ Тестовый пользователь найден в лидерборде:', {
          username: testUserInLeaderboard.username,
          tokens: testUserInLeaderboard.tokens,
          rank: testUserInLeaderboard.rank
        });
      } else {
        console.log('❌ Тестовый пользователь не найден в лидерборде');
      }
    } else {
      const error = await leaderboardResponse.text();
      console.log('❌ Ошибка загрузки лидерборда:', error);
    }
    
    // Тест 4: Создание депозита для существующего пользователя
    console.log('\n4️⃣ Тест создания депозита');
    const depositResponse = await fetch('https://tapdel.onrender.com/api/decimal/deposits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        baseAmount: 1.0
      })
    });
    
    if (depositResponse.ok) {
      const deposit = await depositResponse.json();
      console.log('✅ Депозит создан:', {
        depositId: deposit.depositId,
        uniqueAmount: deposit.uniqueAmount,
        address: deposit.address
      });
    } else {
      const error = await depositResponse.text();
      console.log('❌ Ошибка создания депозита:', error);
    }
    
    // Тест 5: Создание вывода для существующего пользователя
    console.log('\n5️⃣ Тест создания вывода');
    const withdrawalResponse = await fetch('https://tapdel.onrender.com/api/decimal/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 0.5
      })
    });
    
    if (withdrawalResponse.ok) {
      const withdrawal = await withdrawalResponse.json();
      console.log('✅ Вывод создан:', {
        withdrawalId: withdrawal.withdrawalId,
        status: withdrawal.status,
        amount: withdrawal.amount
      });
    } else {
      const error = await withdrawalResponse.text();
      console.log('❌ Ошибка создания вывода:', error);
    }
    
    console.log('\n🎉 Проверка завершена!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
    return false;
  }
}

// Запускаем проверку если скрипт вызван напрямую
if (require.main === module) {
  checkProductionUser()
    .then(success => {
      if (success) {
        console.log('\n🎉 Проверка production пользователей завершена!');
        process.exit(0);
      } else {
        console.log('\n💥 Проверка production пользователей провалилась!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { checkProductionUser }; 