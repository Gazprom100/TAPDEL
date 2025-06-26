import { DatabaseService } from './db';
import { MonitoringService } from './monitoring';

interface BackupMetadata {
  userId: string;
  type: 'full' | 'incremental';
  collections: string[];
  timestamp: number;
  size: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export class BackupService {
  private static instance: BackupService;
  private db: DatabaseService;
  private monitoring: MonitoringService;
  private readonly collections = ['users', 'leaderboard', 'transactions', 'gameSessions', 'achievements', 'components'];

  private constructor() {
    this.db = new DatabaseService();
    this.monitoring = MonitoringService.getInstance();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  public async createBackup(userId: string, type: 'full' | 'incremental' = 'full'): Promise<boolean> {
    const startTime = Date.now();
    const metadata: BackupMetadata = {
      userId,
      type,
      collections: this.collections,
      timestamp: startTime,
      size: 0,
      status: 'pending'
    };

    try {
      const client = await this.db['client'];
      const db = client?.db('tapdel');
      const backupsCollection = db?.collection('backups');

      // Создаем запись о бэкапе
      const backupId = await backupsCollection?.insertOne(metadata);

      // Собираем данные для бэкапа
      const backup: Record<string, any> = {};
      let totalSize = 0;

      for (const collectionName of this.collections) {
        const collection = db?.collection(collectionName);
        
        // Для инкрементального бэкапа берем только данные после последнего полного бэкапа
        const query = type === 'incremental' 
          ? { 
              userId,
              updatedAt: { 
                $gt: await this.getLastFullBackupDate(userId) 
              } 
            }
          : { userId };

        const data = await collection?.find(query).toArray();
        backup[collectionName] = data;
        totalSize += JSON.stringify(data).length;
      }

      // Сохраняем бэкап
      await backupsCollection?.updateOne(
        { _id: backupId?.insertedId },
        {
          $set: {
            data: backup,
            size: totalSize,
            status: 'completed',
            completedAt: Date.now()
          }
        }
      );

      // Записываем метрику
      this.monitoring.trackSystemMetric('backup_size', totalSize, { type, userId });
      this.monitoring.trackSystemMetric('backup_duration', Date.now() - startTime, { type, userId });

      return true;
    } catch (error) {
      // Обновляем статус в случае ошибки
      const client = await this.db['client'];
      const backupsCollection = client?.db('tapdel').collection('backups');
      await backupsCollection?.updateOne(
        { userId, timestamp: startTime },
        {
          $set: {
            status: 'failed',
            error: (error as Error).message
          }
        }
      );

      this.monitoring.trackSystemMetric('backup_error', 1, { 
        type, 
        userId,
        error: (error as Error).message 
      });

      return false;
    }
  }

  public async restoreFromBackup(userId: string, timestamp?: number): Promise<boolean> {
    try {
      const client = await this.db['client'];
      const backupsCollection = client?.db('tapdel').collection('backups');

      // Находим последний успешный бэкап или конкретный по timestamp
      const query = timestamp 
        ? { userId, timestamp, status: 'completed' }
        : { userId, status: 'completed' };
      
      const backup = await backupsCollection?.findOne(query, { sort: { timestamp: -1 } });
      if (!backup) throw new Error('No valid backup found');

      const db = client?.db('tapdel');

      // Восстанавливаем данные из бэкапа
      for (const [collectionName, data] of Object.entries(backup.data)) {
        const collection = db?.collection(collectionName);
        
        // Удаляем существующие данные пользователя
        await collection?.deleteMany({ userId });
        
        // Восстанавливаем данные из бэкапа
        if (Array.isArray(data) && data.length > 0) {
          await collection?.insertMany(data);
        }
      }

      this.monitoring.trackSystemMetric('restore_success', 1, { userId, timestamp: backup.timestamp });
      return true;
    } catch (error) {
      this.monitoring.trackSystemMetric('restore_error', 1, { 
        userId, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  private async getLastFullBackupDate(userId: string): Promise<Date> {
    const client = await this.db['client'];
    const backupsCollection = client?.db('tapdel').collection('backups');
    
    const lastFullBackup = await backupsCollection?.findOne(
      { userId, type: 'full', status: 'completed' },
      { sort: { timestamp: -1 } }
    );

    return lastFullBackup ? new Date(lastFullBackup.timestamp) : new Date(0);
  }

  public async listBackups(userId: string): Promise<BackupMetadata[]> {
    try {
      const client = await this.db['client'];
      const backupsCollection = client?.db('tapdel').collection('backups');
      
      const backups = await backupsCollection?.find(
        { userId },
        { 
          projection: { data: 0 }, // Исключаем сами данные бэкапа
          sort: { timestamp: -1 } 
        }
      ).toArray();

      return (backups || []).map(doc => ({
        userId: doc.userId,
        type: doc.type as 'full' | 'incremental',
        collections: doc.collections,
        timestamp: doc.timestamp,
        size: doc.size,
        status: doc.status as 'pending' | 'completed' | 'failed',
        error: doc.error
      }));
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  public async deleteOldBackups(daysToKeep: number = 30): Promise<void> {
    try {
      const client = await this.db['client'];
      const backupsCollection = client?.db('tapdel').collection('backups');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await backupsCollection?.deleteMany({
        timestamp: { $lt: cutoffDate.getTime() }
      });

      this.monitoring.trackSystemMetric('deleted_backups', result?.deletedCount || 0, { daysToKeep });
    } catch (error) {
      console.error('Failed to delete old backups:', error);
    }
  }
} 