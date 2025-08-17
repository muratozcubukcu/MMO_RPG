import { Stats } from '@ai-mmo/shared-types';
import { PRNG, createSubsystemPRNG } from './prng';

export interface CombatEntity {
  id: string;
  name: string;
  level: number;
  stats: Stats;
  health: {
    current: number;
    max: number;
  };
  mana?: {
    current: number;
    max: number;
  };
  statusEffects?: Array<{
    id: string;
    name: string;
    duration: number;
    effects: Stats;
  }>;
  abilities?: string[];
}

export interface CombatAction {
  actorId: string;
  type: 'attack' | 'defend' | 'cast' | 'item' | 'flee';
  targetId?: string;
  abilityId?: string;
  itemId?: string;
}

export interface CombatTurn {
  turn: number;
  actorId: string;
  action: CombatAction;
  roll?: number;
  damage?: number;
  healing?: number;
  effects?: string[];
  success: boolean;
  description: string;
}

export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'fled';
  turns: CombatTurn[];
  survivors: string[];
  casualties: string[];
  rewards?: {
    experience: number;
    gold: number;
    items?: Array<{ archetypeSlug: string; quantity: number }>;
  };
}

/**
 * Calculate effective stats including equipment and status effects
 */
export function calculateEffectiveStats(entity: CombatEntity): Stats {
  const baseStats = { ...entity.stats };
  
  // Apply status effect modifiers
  if (entity.statusEffects) {
    for (const effect of entity.statusEffects) {
      if (effect.duration > 0) {
        for (const [stat, value] of Object.entries(effect.effects)) {
          baseStats[stat] = (baseStats[stat] || 0) + value;
        }
      }
    }
  }
  
  // Ensure no negative stats
  for (const [stat, value] of Object.entries(baseStats)) {
    baseStats[stat] = Math.max(0, value);
  }
  
  return baseStats;
}

/**
 * Calculate armor class / defense rating
 */
export function calculateAC(entity: CombatEntity): number {
  const stats = calculateEffectiveStats(entity);
  const baseAC = 10;
  const dexMod = Math.floor((stats.dexterity || 10) - 10) / 2;
  const armorBonus = stats.armor || 0;
  
  return Math.floor(baseAC + dexMod + armorBonus);
}

/**
 * Calculate attack bonus
 */
export function calculateAttackBonus(entity: CombatEntity, attackType: 'melee' | 'ranged' | 'spell' = 'melee'): number {
  const stats = calculateEffectiveStats(entity);
  const levelBonus = Math.floor(entity.level / 4);
  
  let statBonus = 0;
  switch (attackType) {
    case 'melee':
      statBonus = Math.floor((stats.strength || 10) - 10) / 2;
      break;
    case 'ranged':
      statBonus = Math.floor((stats.dexterity || 10) - 10) / 2;
      break;
    case 'spell':
      statBonus = Math.floor((stats.intelligence || 10) - 10) / 2;
      break;
  }
  
  return Math.floor(levelBonus + statBonus + (stats.attackBonus || 0));
}

/**
 * Calculate damage for an attack
 */
export function calculateDamage(
  attacker: CombatEntity,
  target: CombatEntity,
  attackType: 'melee' | 'ranged' | 'spell',
  rng: PRNG
): { damage: number; critical: boolean } {
  const attackerStats = calculateEffectiveStats(attacker);
  const targetStats = calculateEffectiveStats(target);
  
  // Base damage
  let baseDamage = 0;
  switch (attackType) {
    case 'melee':
      baseDamage = Math.floor((attackerStats.strength || 10) / 2) + (attackerStats.weaponDamage || 4);
      break;
    case 'ranged':
      baseDamage = Math.floor((attackerStats.dexterity || 10) / 2) + (attackerStats.weaponDamage || 4);
      break;
    case 'spell':
      baseDamage = Math.floor((attackerStats.intelligence || 10) / 2) + (attackerStats.spellPower || 6);
      break;
  }
  
  // Damage variance (±20%)
  const variance = rng.randFloat(0.8, 1.2);
  let damage = Math.floor(baseDamage * variance);
  
  // Critical hit check (5% base chance, modified by luck)
  const critChance = 0.05 + ((attackerStats.luck || 0) * 0.01);
  const critical = rng.random() < critChance;
  
  if (critical) {
    damage = Math.floor(damage * 2);
  }
  
  // Apply damage reduction
  const damageReduction = targetStats.damageReduction || 0;
  damage = Math.max(1, damage - damageReduction);
  
  // Apply resistance/vulnerability
  const resistance = targetStats.resistance || 0;
  const vulnerability = targetStats.vulnerability || 0;
  damage = Math.floor(damage * (1 - resistance + vulnerability));
  
  return { damage: Math.max(1, damage), critical };
}

/**
 * Resolve a single combat turn
 */
export function resolveCombatTurn(
  turn: number,
  action: CombatAction,
  entities: Map<string, CombatEntity>,
  worldSeed: string
): CombatTurn {
  const actor = entities.get(action.actorId);
  if (!actor) {
    throw new Error(`Actor ${action.actorId} not found`);
  }
  
  const rng = createSubsystemPRNG(worldSeed, 'combat', action.actorId, turn);
  
  const combatTurn: CombatTurn = {
    turn,
    actorId: action.actorId,
    action,
    success: false,
    description: '',
  };
  
  switch (action.type) {
    case 'attack': {
      const target = action.targetId ? entities.get(action.targetId) : null;
      if (!target) {
        combatTurn.description = `${actor.name} attacks but finds no target!`;
        break;
      }
      
      // Attack roll
      const attackRoll = rng.rollDice('1d20');
      const attackBonus = calculateAttackBonus(actor, 'melee');
      const targetAC = calculateAC(target);
      
      combatTurn.roll = attackRoll + attackBonus;
      
      if (combatTurn.roll >= targetAC) {
        // Hit!
        const { damage, critical } = calculateDamage(actor, target, 'melee', rng);
        combatTurn.damage = damage;
        combatTurn.success = true;
        
        // Apply damage
        target.health.current = Math.max(0, target.health.current - damage);
        
        if (critical) {
          combatTurn.effects = ['critical'];
          combatTurn.description = `${actor.name} critically strikes ${target.name} for ${damage} damage!`;
        } else {
          combatTurn.description = `${actor.name} attacks ${target.name} for ${damage} damage!`;
        }
        
        if (target.health.current === 0) {
          combatTurn.description += ` ${target.name} is defeated!`;
        }
      } else {
        // Miss
        combatTurn.description = `${actor.name} attacks ${target.name} but misses!`;
      }
      break;
    }
    
    case 'defend': {
      // Defensive stance - increases AC and reduces damage taken
      combatTurn.success = true;
      combatTurn.description = `${actor.name} takes a defensive stance!`;
      
      // Add temporary defensive bonus (would be handled by status effects)
      if (!actor.statusEffects) actor.statusEffects = [];
      actor.statusEffects.push({
        id: 'defensive_stance',
        name: 'Defensive Stance',
        duration: 1,
        effects: { armor: 2, damageReduction: 2 },
      });
      break;
    }
    
    case 'flee': {
      // Attempt to flee - based on dexterity vs average enemy dexterity
      const stats = calculateEffectiveStats(actor);
      const fleeChance = 0.5 + ((stats.dexterity || 10) - 10) * 0.05;
      
      combatTurn.success = rng.random() < Math.max(0.1, Math.min(0.9, fleeChance));
      
      if (combatTurn.success) {
        combatTurn.description = `${actor.name} successfully flees from combat!`;
      } else {
        combatTurn.description = `${actor.name} tries to flee but cannot escape!`;
      }
      break;
    }
    
    default:
      combatTurn.description = `${actor.name} performs an unknown action.`;
      break;
  }
  
  // Update status effect durations
  if (actor.statusEffects) {
    actor.statusEffects = actor.statusEffects
      .map(effect => ({ ...effect, duration: effect.duration - 1 }))
      .filter(effect => effect.duration > 0);
  }
  
  return combatTurn;
}

/**
 * Determine combat initiative order
 */
export function rollInitiative(entities: CombatEntity[], worldSeed: string): string[] {
  const initiatives = entities.map(entity => {
    const rng = createSubsystemPRNG(worldSeed, 'initiative', entity.id, 0);
    const stats = calculateEffectiveStats(entity);
    const dexMod = Math.floor((stats.dexterity || 10) - 10) / 2;
    const roll = rng.rollDice('1d20') + dexMod;
    
    return { id: entity.id, initiative: roll };
  });
  
  // Sort by initiative (highest first)
  initiatives.sort((a, b) => b.initiative - a.initiative);
  
  return initiatives.map(init => init.id);
}

/**
 * Check if combat should end
 */
export function checkCombatEnd(entities: Map<string, CombatEntity>): {
  ended: boolean;
  outcome: 'victory' | 'defeat' | 'fled' | null;
  survivors: string[];
  casualties: string[];
} {
  const alive = Array.from(entities.values()).filter(e => e.health.current > 0);
  const dead = Array.from(entities.values()).filter(e => e.health.current === 0);
  
  // Check for fled entities (would need additional tracking in real implementation)
  // For now, assume no one has fled unless explicitly handled
  
  if (alive.length <= 1) {
    const survivors = alive.map(e => e.id);
    const casualties = dead.map(e => e.id);
    
    // Determine outcome based on remaining entities
    // This is simplified - in reality you'd track player vs enemy teams
    const outcome: 'victory' | 'defeat' = alive.length === 1 ? 'victory' : 'defeat';
    
    return {
      ended: true,
      outcome,
      survivors,
      casualties,
    };
  }
  
  return {
    ended: false,
    outcome: null,
    survivors: [],
    casualties: [],
  };
}

/**
 * Calculate experience and rewards for combat victory
 */
export function calculateCombatRewards(
  victor: CombatEntity,
  defeated: CombatEntity[],
  worldSeed: string
): { experience: number; gold: number } {
  let totalExperience = 0;
  let totalGold = 0;
  
  for (const enemy of defeated) {
    // Experience based on level difference
    const levelDiff = enemy.level - victor.level;
    let baseXP = enemy.level * 100;
    
    // Adjust for level difference
    if (levelDiff > 0) {
      baseXP *= 1 + (levelDiff * 0.1); // Bonus for defeating higher level
    } else if (levelDiff < -5) {
      baseXP *= Math.max(0.1, 1 + (levelDiff * 0.1)); // Reduced XP for much lower level
    }
    
    totalExperience += Math.floor(baseXP);
    
    // Gold based on enemy level with some randomness
    const rng = createSubsystemPRNG(worldSeed, 'rewards', enemy.id, 0);
    const baseGold = enemy.level * rng.randInt(5, 15);
    totalGold += baseGold;
  }
  
  return {
    experience: totalExperience,
    gold: totalGold,
  };
}
