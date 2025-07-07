// Скрипт для добавления текущего пользователя в лидерборд

// Симулируем получение userId из localStorage (как в App.tsx)
function getCurrentUserId() {
  // В реальной игре это будет браться из localStorage
  // но мы создаем стабильный ID для тестирования
  return 'demo-user-main';
}

const userId = getCurrentUserId();
console.log('🎮 Текущий пользователь:', userId);

// Данные пользователя для лидерборда
const userData = {
  userId: userId,
  username: 'Ваш аккаунт',
  telegramFirstName: 'Евгений',
  telegramLastName: 'Краснов', 
  telegramUsername: 'evgenik',
  tokens: 500 // Достаточно токенов чтобы быть в топе
};

console.log('📝 Добавляем пользователя в лидерборд:', userData);

// Добавляем через API
fetch('http://localhost:3000/api/leaderboard', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)
})
.then(res => {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
})
.then(data => {
  console.log('✅ Пользователь добавлен в лидерборд!');
  
  // Теперь добавляем пользователя в базу users тоже
  const userFullData = {
    profile: {
      userId: userId,
      username: userData.username,
      telegramFirstName: userData.telegramFirstName,
      telegramLastName: userData.telegramLastName,
      telegramUsername: userData.telegramUsername,
      maxEnergy: 100,
      energyRecoveryRate: 1,
      maxGear: 'M',
      level: Math.floor(userData.tokens / 100) + 1,
      experience: userData.tokens,
      createdAt: new Date(),
      lastLogin: new Date()
    },
    gameState: {
      tokens: userData.tokens,
      highScore: userData.tokens,
      engineLevel: 'Mk I',
      gearboxLevel: 'L1', 
      batteryLevel: 'B1',
      hyperdriveLevel: 'H1',
      powerGridLevel: 'P1',
      lastSaved: new Date()
    }
  };
  
  return fetch(`http://localhost:3000/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userFullData)
  });
})
.then(res => res.ok ? res.json() : Promise.reject(res))
.then(() => {
  console.log('✅ Пользователь добавлен в базу users!');
  console.log('🏆 Теперь проверьте рейтинг в игре - вы должны быть в топ-10!');
  console.log('💡 Если не видите себя, очистите localStorage в браузере и перезагрузите игру');
})
.catch(err => {
  console.error('❌ Ошибка:', err);
});
