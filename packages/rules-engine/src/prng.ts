/**
 * Deterministic PRNG using PCG (Permuted Congruential Generator)
 * Provides reproducible random numbers for game mechanics
 */

import { createHash } from 'crypto';

export class PRNG {
  private state: bigint;
  private inc: bigint;

  constructor(seed: string | number | bigint) {
    // Convert seed to BigInt
    if (typeof seed === 'string') {
      const hash = createHash('sha256').update(seed).digest('hex');
      this.state = BigInt('0x' + hash.substring(0, 16));
    } else {
      this.state = BigInt(seed);
    }
    
    // Use a fixed increment for PCG
    this.inc = 1013904223n;
    
    // Warm up the generator
    this.next();
  }

  /**
   * Generate next 32-bit random number
   */
  next(): number {
    const oldstate = this.state;
    this.state = (oldstate * 6364136223846793005n + this.inc) & 0xffffffffffffffffn;
    const xorshifted = Number((((oldstate >> 18n) ^ oldstate) >> 27n) & 0xffffffffn);
    const rot = Number(oldstate >> 59n);
    return ((xorshifted >>> rot) | (xorshifted << ((-rot) & 31))) >>> 0;
  }

  /**
   * Generate random float between 0 and 1
   */
  random(): number {
    return this.next() / 0x100000000;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  randInt(min: number, max: number): number {
    if (min > max) [min, max] = [max, min];
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  randFloat(min: number, max: number): number {
    if (min > max) [min, max] = [max, min];
    return this.random() * (max - min) + min;
  }

  /**
   * Roll dice (e.g., "3d6+2" or "1d20")
   */
  rollDice(notation: string): number {
    const match = notation.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }

    const [, numDiceStr, sidesStr, operation, modifierStr] = match;
    const numDice = parseInt(numDiceStr, 10);
    const sides = parseInt(sidesStr, 10);
    const modifier = modifierStr ? parseInt(modifierStr, 10) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += this.randInt(1, sides);
    }

    if (operation === '+') {
      total += modifier;
    } else if (operation === '-') {
      total -= modifier;
    }

    return Math.max(0, total);
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.randInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in-place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get current state for serialization
   */
  getState(): string {
    return `${this.state.toString(16)}:${this.inc.toString(16)}`;
  }

  /**
   * Restore from serialized state
   */
  setState(stateStr: string): void {
    const [stateHex, incHex] = stateStr.split(':');
    this.state = BigInt('0x' + stateHex);
    this.inc = BigInt('0x' + incHex);
  }
}

/**
 * Create namespaced seed for deterministic subsystems
 * @param worldSeed Base world seed
 * @param subsystem Subsystem name (e.g., 'combat', 'loot', 'spawns')
 * @param entityId Entity identifier
 * @param turnNumber Turn/action number for temporal determinism
 */
export function createNamespacedSeed(
  worldSeed: string,
  subsystem: string,
  entityId: string,
  turnNumber: number = 0
): string {
  const combined = `${worldSeed}:${subsystem}:${entityId}:${turnNumber}`;
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Create PRNG for specific subsystem
 */
export function createSubsystemPRNG(
  worldSeed: string,
  subsystem: string,
  entityId: string,
  turnNumber: number = 0
): PRNG {
  const seed = createNamespacedSeed(worldSeed, subsystem, entityId, turnNumber);
  return new PRNG(seed);
}

/**
 * Weighted random selection
 */
export function weightedChoice<T>(
  items: Array<{ item: T; weight: number }>,
  rng: PRNG
): T {
  if (items.length === 0) {
    throw new Error('Cannot choose from empty weighted array');
  }

  const totalWeight = items.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive');
  }

  let randomValue = rng.random() * totalWeight;
  
  for (const entry of items) {
    randomValue -= entry.weight;
    if (randomValue <= 0) {
      return entry.item;
    }
  }

  // Fallback (should never reach here due to floating point precision)
  return items[items.length - 1].item;
}
