import { DatabaseService } from './db';
import { CacheService } from './cache';

type MetricType = 'database' | 'cache' | 'game' | 'system';

interface Metric {
  type: MetricType;
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private db: DatabaseService;
  private cache: CacheService;
  private metrics: Metric[] = [];
  private readonly flushInterval = 60 * 1000; // 1 минута

  private constructor() {
    this.db = new DatabaseService();
    this.cache = CacheService.getInstance();
    this.startMetricCollection();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private startMetricCollection() {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  private async flushMetrics() {
    if (this.metrics.length === 0) return;

    try {
      const client = await this.db['client'];
      const systemStats = client?.db('tapdel').collection('systemStats');
      
      await systemStats?.insertMany(this.metrics);
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  public trackDatabaseOperation(operation: string, duration: number, metadata?: Record<string, any>) {
    this.addMetric({
      type: 'database',
      name: operation,
      value: duration,
      timestamp: Date.now(),
      metadata
    });
  }

  public trackCacheOperation(operation: string, hitRate: number) {
    this.addMetric({
      type: 'cache',
      name: operation,
      value: hitRate,
      timestamp: Date.now()
    });
  }

  public trackGameMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.addMetric({
      type: 'game',
      name,
      value,
      timestamp: Date.now(),
      metadata
    });
  }

  public trackSystemMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.addMetric({
      type: 'system',
      name,
      value,
      timestamp: Date.now(),
      metadata
    });
  }

  private addMetric(metric: Metric) {
    this.metrics.push(metric);

    // Если накопилось много метрик, сбрасываем их в базу
    if (this.metrics.length >= 100) {
      this.flushMetrics();
    }
  }

  public async getMetrics(type: MetricType, from: Date, to: Date = new Date()): Promise<Metric[]> {
    try {
      const client = await this.db['client'];
      const systemStats = client?.db('tapdel').collection('systemStats');
      
      const results = await systemStats?.find({
        type,
        timestamp: {
          $gte: from.getTime(),
          $lte: to.getTime()
        }
      }).toArray() || [];

      return results.map(doc => ({
        type: doc.type as MetricType,
        name: doc.name,
        value: doc.value,
        timestamp: doc.timestamp,
        metadata: doc.metadata
      }));
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return [];
    }
  }

  public async getAverageMetric(type: MetricType, name: string, period: number): Promise<number> {
    const from = new Date(Date.now() - period);
    const metrics = await this.getMetrics(type, from);
    
    const relevantMetrics = metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;

    const sum = relevantMetrics.reduce((acc, curr) => acc + curr.value, 0);
    return sum / relevantMetrics.length;
  }
} 