import { Stats } from '@ai-mmo/shared-types';

/**
 * Utility functions for the rules engine
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert stat value to modifier (D&D style)
 */
export function statToModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2);
}

/**
 * Calculate percentage from two numbers
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Format large numbers with suffixes (1.2K, 3.4M, etc.)
 */
export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let suffixIndex = 0;
  
  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }
  
  return num.toFixed(1) + suffixes[suffixIndex];
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key] as T[typeof key];
      }
    }
  }
  
  return result;
}

/**
 * Combine multiple stat objects
 */
export function combineStats(...statObjects: (Stats | undefined)[]): Stats {
  const combined: Stats = {};
  
  for (const stats of statObjects) {
    if (!stats) continue;
    
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        combined[key] = (combined[key] || 0) + value;
      }
    }
  }
  
  return combined;
}

/**
 * Scale stats by a multiplier
 */
export function scaleStats(stats: Stats, multiplier: number): Stats {
  const scaled: Stats = {};
  
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value === 'number') {
      scaled[key] = Math.round(value * multiplier);
    } else {
      scaled[key] = value;
    }
  }
  
  return scaled;
}

/**
 * Get stat priority order for different contexts
 */
export function getStatPriority(context: 'combat' | 'exploration' | 'social' | 'crafting'): string[] {
  switch (context) {
    case 'combat':
      return ['strength', 'dexterity', 'vitality', 'intelligence', 'luck'];
    case 'exploration':
      return ['dexterity', 'perception', 'survival', 'athletics', 'luck'];
    case 'social':
      return ['charisma', 'intelligence', 'wisdom', 'insight', 'persuasion'];
    case 'crafting':
      return ['intelligence', 'dexterity', 'patience', 'focus', 'creativity'];
    default:
      return ['strength', 'dexterity', 'intelligence', 'vitality', 'wisdom', 'charisma'];
  }
}

/**
 * Calculate effective level based on stats and equipment
 */
export function calculateEffectiveLevel(
  baseLevel: number,
  stats: Stats,
  equipmentBonus: number = 0
): number {
  // Calculate stat contribution to effective level
  const primaryStats = ['strength', 'dexterity', 'intelligence', 'vitality'];
  let statBonus = 0;
  
  for (const stat of primaryStats) {
    const statValue = stats[stat] || 10;
    statBonus += Math.max(0, (statValue - 10) * 0.1); // Each point above 10 adds 0.1 levels
  }
  
  return Math.round(baseLevel + statBonus + equipmentBonus);
}

/**
 * Generate hash from object (for state verification)
 */
export function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string = 'value'
): void {
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}, got ${value}`);
  }
}

/**
 * Safe division that handles zero denominators
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  return denominator === 0 ? fallback : numerator / denominator;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if a value is within a percentage of another value
 */
export function isWithinPercent(value: number, target: number, percent: number): boolean {
  const tolerance = Math.abs(target * (percent / 100));
  return Math.abs(value - target) <= tolerance;
}

/**
 * Generate a simple checksum for data integrity
 */
export function checksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i);
  }
  return sum % 65536; // 16-bit checksum
}

/**
 * Time-based utilities
 */
export const Time = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  
  /**
   * Convert seconds to human readable format
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours}h ${minutes}m ${secs}s`;
  },
  
  /**
   * Check if a timestamp is expired
   */
  isExpired(timestamp: number, durationMs: number): boolean {
    return Date.now() > timestamp + durationMs;
  },
  
  /**
   * Get remaining time in milliseconds
   */
  timeRemaining(timestamp: number, durationMs: number): number {
    return Math.max(0, (timestamp + durationMs) - Date.now());
  },
};

/**
 * Array utilities
 */
export const ArrayUtils = {
  /**
   * Remove duplicates from array
   */
  unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  },
  
  /**
   * Group array elements by a key function
   */
  groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    const groups = {} as Record<K, T[]>;
    
    for (const item of array) {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    
    return groups;
  },
  
  /**
   * Find the item with the maximum value
   */
  maxBy<T>(array: T[], valueFn: (item: T) => number): T | undefined {
    if (array.length === 0) return undefined;
    
    let max = array[0];
    let maxValue = valueFn(max);
    
    for (let i = 1; i < array.length; i++) {
      const value = valueFn(array[i]);
      if (value > maxValue) {
        max = array[i];
        maxValue = value;
      }
    }
    
    return max;
  },
  
  /**
   * Find the item with the minimum value
   */
  minBy<T>(array: T[], valueFn: (item: T) => number): T | undefined {
    if (array.length === 0) return undefined;
    
    let min = array[0];
    let minValue = valueFn(min);
    
    for (let i = 1; i < array.length; i++) {
      const value = valueFn(array[i]);
      if (value < minValue) {
        min = array[i];
        minValue = value;
      }
    }
    
    return min;
  },
};
