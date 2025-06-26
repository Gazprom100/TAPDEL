/**
 * Преобразует функцию с колбэком в Promise
 * @param fn Функция для промисификации
 * @returns Promise версия функции
 */
export function promisify<T>(fn: Function): (...args: any[]) => Promise<T> {
  return (...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      fn(...args, (error: Error | null, result?: T) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as T);
        }
      });
    });
  };
}

/**
 * Создает Promise с таймаутом
 * @param ms Время таймаута в миллисекундах
 * @returns Promise который разрешается после указанного времени
 */
export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Оборачивает Promise с таймаутом
 * @param promise Promise для обертки
 * @param ms Время таймаута в миллисекундах
 * @returns Promise с таймаутом
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]);
} 