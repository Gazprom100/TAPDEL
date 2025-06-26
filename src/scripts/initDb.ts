import { MongoClient } from 'mongodb';
import clientPromise from '../config/mongodb';
import { CacheService } from '../services/cache';
import { MonitoringService } from '../services/monitoring';
import { BackupService } from '../services/backup';

async function initializeDatabase() {
  let client: MongoClient;
  
  try {
    console.log('🚀 Initializing database and services...');
    
    // Инициализируем сервисы
    const cache = CacheService.getInstance();
    const monitoring = MonitoringService.getInstance();
    const backup = BackupService.getInstance();
    
    client = await clientPromise;
    const db = client.db('tapdel');

    // 1. Users Collection
    console.log('📊 Setting up users collection...');
    const users = db.collection('users');
    await users.createIndexes([
      { key: { userId: 1 }, unique: true },
      { key: { 'profile.username': 1 }, unique: true },
      { key: { 'gameState.highScore': -1 } },
      { key: { updatedAt: -1 } }
    ]);

    // 2. Leaderboard Collection
    console.log('🏆 Setting up leaderboard collection...');
    const leaderboard = db.collection('leaderboard');
    await leaderboard.createIndexes([
      { key: { userId: 1 }, unique: true },
      { key: { score: -1 } },
      { key: { rank: 1 } },
      { key: { updatedAt: -1 } }
    ]);

    // 3. Transactions Collection
    console.log('💰 Setting up transactions collection...');
    const transactions = db.collection('transactions');
    await transactions.createIndexes([
      { key: { userId: 1 } },
      { key: { type: 1 } },
      { key: { timestamp: -1 } },
      { key: { status: 1 } }
    ]);

    // 4. GameSessions Collection
    console.log('🎮 Setting up game sessions collection...');
    const gameSessions = db.collection('gameSessions');
    await gameSessions.createIndexes([
      { key: { userId: 1 } },
      { key: { startTime: -1 } },
      { key: { endTime: -1 } },
      { key: { status: 1 } }
    ]);

    // 5. Achievements Collection
    console.log('🏅 Setting up achievements collection...');
    const achievements = db.collection('achievements');
    await achievements.createIndexes([
      { key: { userId: 1 } },
      { key: { achievementId: 1 } },
      { key: { unlockedAt: -1 } }
    ]);

    // 6. Components Collection
    console.log('⚙️ Setting up components collection...');
    const components = db.collection('components');
    await components.createIndexes([
      { key: { userId: 1 } },
      { key: { type: 1 } },
      { key: { level: 1 } }
    ]);

    // 7. SystemStats Collection
    console.log('📈 Setting up system stats collection...');
    const systemStats = db.collection('systemStats');
    await systemStats.createIndexes([
      { key: { timestamp: -1 } },
      { key: { type: 1 } },
      { key: { metric: 1 } }
    ]);

    // 8. Backups Collection
    console.log('💾 Setting up backups collection...');
    const backups = db.collection('backups');
    await backups.createIndexes([
      { key: { userId: 1 } },
      { key: { createdAt: -1 } },
      { key: { type: 1 } }
    ]);

    // Создаем TTL индексы для автоматической очистки старых данных
    await systemStats.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 дней
    );

    await gameSessions.createIndex(
      { endTime: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 дней
    );

    // Проверяем работу сервисов
    console.log('🔍 Testing services...');

    // Тест кэширования
    cache.set('test', { value: 'test' });
    const cachedValue = cache.get('test');
    console.log('Cache test:', cachedValue ? 'Success' : 'Failed');

    // Тест мониторинга
    monitoring.trackSystemMetric('initialization', 1);
    const metrics = await monitoring.getMetrics('system', new Date(Date.now() - 1000));
    console.log('Monitoring test:', metrics.length > 0 ? 'Success' : 'Failed');

    // Тест бэкапов
    const backupResult = await backup.createBackup('test_user');
    console.log('Backup test:', backupResult ? 'Success' : 'Failed');

    console.log('✅ Database and services initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Запускаем инициализацию
initializeDatabase().catch(console.error); 