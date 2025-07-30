interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiCallTime: number;
  memoryUsage: number;
  fps: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private renderStartTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;

  constructor() {
    this.initFPSMonitoring();
  }

  startTimer() {
    this.startTime = performance.now();
  }

  endTimer(): number {
    const endTime = performance.now();
    return endTime - this.startTime;
  }

  startRenderTimer() {
    this.renderStartTime = performance.now();
  }

  endRenderTimer(): number {
    const endTime = performance.now();
    return endTime - this.renderStartTime;
  }

  measureApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return apiCall().finally(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`📊 API Call took ${duration.toFixed(2)}ms`);
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow API call detected: ${duration.toFixed(2)}ms`);
      }
    });
  }

  private initFPSMonitoring() {
    let lastTime = performance.now();
    
    const measureFPS = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      const fps = 1000 / deltaTime;
      
      this.frameCount++;
      this.lastFrameTime = fps;
      
      if (fps < 30) {
        console.warn(`⚠️ Low FPS detected: ${fps.toFixed(1)}`);
      }
      
      lastTime = currentTime;
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  logMetrics() {
    const memoryUsage = this.getMemoryUsage();
    const avgFPS = this.lastFrameTime;
    
    console.log('📊 Performance Metrics:');
    console.log(`  - Memory Usage: ${memoryUsage.toFixed(2)}MB`);
    console.log(`  - FPS: ${avgFPS.toFixed(1)}`);
    
    if (memoryUsage > 100) {
      console.warn('⚠️ High memory usage detected');
    }
  }

  // Автоматический мониторинг каждые 30 секунд
  startAutoMonitoring() {
    setInterval(() => {
      this.logMetrics();
    }, 30000);
  }
}

// Глобальный экземпляр мониторинга
export const performanceMonitor = new PerformanceMonitor();

// Хук для измерения производительности компонентов
export function usePerformanceMonitoring(componentName: string) {
  const startRender = () => {
    performanceMonitor.startRenderTimer();
  };

  const endRender = () => {
    const renderTime = performanceMonitor.endRenderTimer();
    
    if (renderTime > 16) { // Больше 60 FPS
      console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  };

  return { startRender, endRender };
}

// Декоратор для измерения времени выполнения функций
export function measureTime<T extends (...args: any[]) => any>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
) {
  const originalMethod = descriptor.value;

  if (originalMethod) {
    descriptor.value = function (this: any, ...args: any[]) {
      const startTime = performance.now();
      const result = originalMethod.apply(this, args);
      const endTime = performance.now();
      
      console.log(`⏱️ ${propertyKey} took ${(endTime - startTime).toFixed(2)}ms`);
      
      return result;
    } as T;
  }

  return descriptor;
} 