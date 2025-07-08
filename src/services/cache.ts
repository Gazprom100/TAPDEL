type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>>;
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly isProduction: boolean;

  private constructor() {
    this.cache = new Map();
    this.isProduction = import.meta.env.MODE === 'production';
    
    if (!this.isProduction) {
      this.startCleanupInterval();
      console.log('🔧 CacheService: Memory кеширование включено (dev режим)');
    } else {
      console.log('🚀 CacheService: Memory кеширование отключено (production режим)');
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Очистка каждую минуту
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key);
      }
    }
  }

  public set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // В production режиме не кешируем в памяти
    if (this.isProduction) {
      return;
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Автоматическое удаление по истечении TTL
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);
  }

  public get<T>(key: string): T | null {
    // В production режиме всегда возвращаем null (нет кеша)
    if (this.isProduction) {
      return null;
    }
    
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  public delete(key: string): void {
    if (!this.isProduction) {
      this.cache.delete(key);
    }
  }

  public clear(): void {
    if (!this.isProduction) {
      this.cache.clear();
    }
  }

  // Специальные методы для часто используемых данных
  public setLeaderboard(data: any[]): void {
    this.set('leaderboard', data, 30 * 1000); // 30 секунд для таблицы лидеров
  }

  public getLeaderboard(): any[] | null {
    return this.get('leaderboard');
  }

  public setUserProfile(userId: string, data: any): void {
    this.set(`user:${userId}`, data, 60 * 1000); // 1 минута для профиля
  }

  public getUserProfile(userId: string): any | null {
    return this.get(`user:${userId}`);
  }

  public setGameState(userId: string, data: any): void {
    this.set(`gameState:${userId}`, data, 10 * 1000); // 10 секунд для состояния игры
  }

  public getGameState(userId: string): any | null {
    return this.get(`gameState:${userId}`);
  }
} 