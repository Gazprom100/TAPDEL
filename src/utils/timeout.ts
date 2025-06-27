/**
 * Утилиты для работы с таймаутами и асинхронными операциями
 */

import { promisify } from './promisify';

type TimeoutCallback = (error: Error | null) => void;

/**
 * Создает Promise с таймаутом
 * @param ms Время ожидания в миллисекундах
 * @returns Promise, который разрешается после указанного времени
 */
const setTimeoutAsync = promisify<void, [number]>(
  (ms: number, callback: TimeoutCallback) => {
    setTimeout(() => callback(null), ms);
  }
);

export const wait = setTimeoutAsync;

/**
 * Оборачивает Promise с таймаутом
 * @param promise Promise для обертки
 * @param ms Время таймаута в миллисекундах
 * @param errorMessage Сообщение об ошибке при таймауте
 * @returns Promise с таймаутом
 */
export const withTimeout = <T>(
  promise: Promise<T>, 
  ms: number, 
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    }, ms);
  });
  
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};

/**
 * Повторяет асинхронную операцию указанное количество раз
 * @param operation Асинхронная операция для повтора
 * @param retries Количество попыток
 * @param delay Задержка между попытками в миллисекундах
 * @returns Promise с результатом операции
 */
export const retry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 1) throw error;
    await wait(delay);
    return retry(operation, retries - 1, delay);
  }
};

/**
 * Создает отменяемый Promise
 * @param promise Promise для обертки
 * @returns Объект с Promise и функцией отмены
 */
export const makeCancellable = <T>(promise: Promise<T>) => {
  let isCancelled = false;
  
  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then(
      value => isCancelled ? reject(new Error('Operation cancelled')) : resolve(value),
      error => reject(error)
    );
  });

  return {
    promise: wrappedPromise,
    cancel: () => { isCancelled = true; }
  };
}; 