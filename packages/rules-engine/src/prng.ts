import { createHash } from 'crypto';

/**
 * Deterministic PRNG based on PCG (Permuted Congruential Generator)
 * Ensures reproducible results for the same seed
 */
export class DeterministicPRNG {
  private state: bigint;
  private inc: bigint;

  constructor(seed: string, namespace: string = '', entityId: string = '', turn: number = 0) {
    // Create deterministic seed from inputs
    const combinedSeed = `${seed}:${namespace}:${entityId}:${turn}`;
    const hash = createHash('sha256').update(combinedSeed).digest('hex');
    
    // Use first 16 hex chars for state, next 16 for increment
    this.state = BigInt('0x' + hash.substring(0, 16));
    this.inc = BigInt('0x' + hash.substring(16, 32)) | 1n; // Must be odd
  }

  /**
   * Generate next random 32-bit unsigned integer
   */
  next(): number {
    const oldstate = this.state;
    this.state = (oldstate * 6364136223846793005n + this.inc) & 0xFFFFFFFFFFFFFFFFn;
    const xorshifted = Number((((oldstate >> 18n) ^ oldstate) >> 27n) & 0xFFFFFFFFn);
    const rot = Number((oldstate >> 59n) & 0x1Fn);
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
    if (min > max) {
      throw new Error('min must be <= max');
    }
    const range = max - min + 1;
    return Math.floor(this.random() * range) + min;
  }

  /**
   * Generate random float between min and max
   */
  randFloat(min: number, max: number): number {
    if (min > max) {
      throw new Error('min must be <= max');
    }
    return this.random() * (max - min) + min;
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
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate boolean with given probability (0-1)
   */
  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /**
   * Weighted random selection
   */
  weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have same length');
    }
    if (items.length === 0) {
      throw new Error('Cannot choose from empty arrays');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      throw new Error('Total weight must be positive');
    }

    let random = this.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    // Fallback (should never reach here with valid inputs)
    return items[items.length - 1];
  }

  /**
   * Normal distribution using Box-Muller transform
   */
  normal(mean: number = 0, stddev: number = 1): number {
    // Use cached value if available
    if (this.cachedNormal !== null) {
      const result = this.cachedNormal * stddev + mean;
      this.cachedNormal = null;
      return result;
    }

    // Generate two uniform random numbers
    const u1 = this.random();
    const u2 = this.random();

    // Box-Muller transform
    const mag = stddev * Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2) + mean;
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);

    // Cache the second value for next call
    this.cachedNormal = z1;
    return z0;
  }

  private cachedNormal: number | null = null;

  /**
   * Create a new PRNG with the same parameters but advanced turn
   */
  forTurn(turn: number): DeterministicPRNG {
    // Extract original parameters from state (this is a simplified approach)
    // In practice, you'd want to store the original seed parameters
    return new DeterministicPRNG(this.state.toString(16), 'turn', '', turn);
  }
}

/**
 * Factory for creating PRNGs with consistent seeding strategy
 */
export class PRNGFactory {
  constructor(private worldSeed: string) {}

  /**
   * Create PRNG for combat calculations
   */
  combat(entityId: string, turn: number = 0): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'combat', entityId, turn);
  }

  /**
   * Create PRNG for loot generation
   */
  loot(entityId: string, turn: number = 0): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'loot', entityId, turn);
  }

  /**
   * Create PRNG for spawn calculations
   */
  spawn(locationId: string, turn: number = 0): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'spawn', locationId, turn);
  }

  /**
   * Create PRNG for quest generation
   */
  quest(questId: string, turn: number = 0): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'quest', questId, turn);
  }

  /**
   * Create PRNG for skill checks
   */
  skill(playerId: string, turn: number = 0): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'skill', playerId, turn);
  }

  /**
   * Create PRNG for world generation
   */
  worldgen(phase: string): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'worldgen', phase, 0);
  }

  /**
   * Create PRNG for item rolling
   */
  itemRoll(itemInstanceId: string): DeterministicPRNG {
    return new DeterministicPRNG(this.worldSeed, 'itemroll', itemInstanceId, 0);
  }
}