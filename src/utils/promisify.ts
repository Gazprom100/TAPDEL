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
 * Создает Promise, который разрешается через указанное время
 * @param ms Время задержки в миллисекундах
 * @returns Promise
 */
export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Повторяет функцию указанное количество раз с задержкой
 * @param fn Функция для повторения
 * @param times Количество повторений
 * @param ms Задержка между повторениями в миллисекундах
 */
export async function retry<T>(
  fn: () => Promise<T>, 
  times: number = 3, 
  ms: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (times === 0) throw error;
    await timeout(ms);
    return retry(fn, times - 1, ms);
  }
}

export default {
  promisify,
  timeout,
  retry
}; 