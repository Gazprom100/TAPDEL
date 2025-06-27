/**
 * Преобразует значение в промис
 * @param value Значение или промис
 * @returns Promise с значением
 */
export function toPromise<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

/**
 * Оборачивает функцию в try-catch с возвратом результата или null
 * @param fn Функция для выполнения
 * @returns Promise с результатом или null при ошибке
 */
export async function tryCatch<T>(fn: () => Promise<T> | T): Promise<T | null> {
  try {
    return await toPromise(fn());
  } catch (error) {
    console.error('Operation failed:', error);
    return null;
  }
}

/**
 * Выполняет несколько промисов параллельно с ограничением
 * @param tasks Массив функций, возвращающих промисы
 * @param concurrency Максимальное количество параллельных выполнений
 * @returns Promise с массивом результатов
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 2
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then(result => {
      results.push(result);
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Создает промис, который можно разрешить извне
 * @returns Объект с промисом и функциями resolve/reject
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!
  };
} 