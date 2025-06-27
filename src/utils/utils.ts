import { promisify } from './promisify';
import timeout from './timeout';

/**
 * Форматирует число с разделителями тысяч
 * @param num Число для форматирования
 * @returns Отформатированная строка
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.floor(num));
};

/**
 * Форматирует время в формат MM:SS
 * @param ms Время в миллисекундах
 * @returns Отформатированная строка времени
 */
export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Генерирует случайное целое число в заданном диапазоне
 * @param min Минимальное значение
 * @param max Максимальное значение
 * @returns Случайное число
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Ограничивает значение в заданном диапазоне
 * @param value Значение
 * @param min Минимальное значение
 * @param max Максимальное значение
 * @returns Ограниченное значение
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export {
  promisify,
  timeout
}; 