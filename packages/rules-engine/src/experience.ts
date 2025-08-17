/**
 * Experience and leveling system
 */

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForNext: number;
  xpTotal: number;
  statPoints: number;
}

/**
 * Calculate experience required for a given level
 * Uses a polynomial curve that starts easy and gets progressively harder
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  // Base XP formula: level^2.2 * 100 + level * 50
  const baseXP = Math.pow(level - 1, 2.2) * 100 + (level - 1) * 50;
  return Math.floor(baseXP);
}

/**
 * Calculate total experience required from level 1 to target level
 */
export function calculateTotalXPForLevel(level: number): number {
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    totalXP += calculateXPForLevel(i);
  }
  return totalXP;
}

/**
 * Determine level from total experience
 */
export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpAccumulated = 0;
  
  while (xpAccumulated <= totalXP) {
    level++;
    const xpForNextLevel = calculateXPForLevel(level);
    if (xpAccumulated + xpForNextLevel > totalXP) {
      level--;
      break;
    }
    xpAccumulated += xpForNextLevel;
  }
  
  return Math.max(1, level);
}

/**
 * Get detailed level information from total experience
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  const level = getLevelFromXP(totalXP);
  const xpForCurrentLevel = calculateTotalXPForLevel(level);
  const xpForNextLevel = calculateXPForLevel(level + 1);
  const currentXP = totalXP - xpForCurrentLevel;
  
  // Stat points gained from leveling (1 per level, bonus at milestones)
  let statPoints = level - 1; // Base stat points
  
  // Bonus stat points at certain levels
  const bonusLevels = [5, 10, 15, 20, 25, 30, 40, 50];
  for (const bonusLevel of bonusLevels) {
    if (level >= bonusLevel) {
      statPoints += Math.floor(bonusLevel / 5);
    }
  }
  
  return {
    level,
    currentXP,
    xpForNext: xpForNextLevel,
    xpTotal: totalXP,
    statPoints,
  };
}

/**
 * Calculate experience gained from various activities
 */
export interface XPGain {
  source: string;
  baseXP: number;
  multipliers: Record<string, number>;
  totalXP: number;
}

export function calculateCombatXP(
  enemyLevel: number,
  playerLevel: number,
  groupSize: number = 1,
  bonusMultipliers: Record<string, number> = {}
): XPGain {
  // Base XP from enemy level
  const baseXP = enemyLevel * 50;
  
  // Level difference modifier
  const levelDiff = enemyLevel - playerLevel;
  let levelMultiplier = 1.0;
  
  if (levelDiff > 0) {
    // Bonus for fighting higher level enemies
    levelMultiplier = 1.0 + (levelDiff * 0.1);
  } else if (levelDiff < -5) {
    // Reduced XP for fighting much lower level enemies
    levelMultiplier = Math.max(0.1, 1.0 + (levelDiff * 0.05));
  }
  
  // Group size penalty (XP split)
  const groupMultiplier = groupSize > 1 ? 1.0 / Math.sqrt(groupSize) : 1.0;
  
  const multipliers = {
    level: levelMultiplier,
    group: groupMultiplier,
    ...bonusMultipliers,
  };
  
  const totalMultiplier = Object.values(multipliers).reduce((acc, mult) => acc * mult, 1.0);
  const totalXP = Math.floor(baseXP * totalMultiplier);
  
  return {
    source: 'combat',
    baseXP,
    multipliers,
    totalXP,
  };
}

export function calculateQuestXP(
  questLevel: number,
  playerLevel: number,
  questType: 'main' | 'side' | 'daily' = 'side',
  bonusMultipliers: Record<string, number> = {}
): XPGain {
  // Base XP varies by quest type
  const baseXPMultipliers = {
    main: 200,
    side: 100,
    daily: 50,
  };
  
  const baseXP = questLevel * baseXPMultipliers[questType];
  
  // Level scaling
  const levelDiff = questLevel - playerLevel;
  let levelMultiplier = 1.0;
  
  if (levelDiff > 0) {
    levelMultiplier = 1.0 + (levelDiff * 0.05);
  } else if (levelDiff < -3) {
    levelMultiplier = Math.max(0.2, 1.0 + (levelDiff * 0.1));
  }
  
  const multipliers = {
    level: levelMultiplier,
    type: 1.0, // Could add type-specific bonuses
    ...bonusMultipliers,
  };
  
  const totalMultiplier = Object.values(multipliers).reduce((acc, mult) => acc * mult, 1.0);
  const totalXP = Math.floor(baseXP * totalMultiplier);
  
  return {
    source: 'quest',
    baseXP,
    multipliers,
    totalXP,
  };
}

export function calculateSkillXP(
  skillDifficulty: 'easy' | 'normal' | 'hard' | 'extreme',
  playerLevel: number,
  success: boolean,
  bonusMultipliers: Record<string, number> = {}
): XPGain {
  // Base XP by difficulty
  const difficultyXP = {
    easy: 10,
    normal: 25,
    hard: 50,
    extreme: 100,
  };
  
  const baseXP = difficultyXP[skillDifficulty];
  
  // Success multiplier
  const successMultiplier = success ? 1.0 : 0.5;
  
  // Level scaling (skills give less XP at higher levels)
  const levelMultiplier = Math.max(0.1, 1.0 - (playerLevel * 0.02));
  
  const multipliers = {
    success: successMultiplier,
    level: levelMultiplier,
    ...bonusMultipliers,
  };
  
  const totalMultiplier = Object.values(multipliers).reduce((acc, mult) => acc * mult, 1.0);
  const totalXP = Math.floor(baseXP * totalMultiplier);
  
  return {
    source: 'skill',
    baseXP,
    multipliers,
    totalXP,
  };
}

export function calculateDiscoveryXP(
  discoveryType: 'location' | 'secret' | 'lore' | 'item',
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common',
  playerLevel: number,
  bonusMultipliers: Record<string, number> = {}
): XPGain {
  // Base XP by discovery type
  const typeXP = {
    location: 50,
    secret: 100,
    lore: 75,
    item: 25,
  };
  
  // Rarity multiplier
  const rarityMultipliers = {
    common: 1.0,
    uncommon: 1.5,
    rare: 2.5,
    legendary: 5.0,
  };
  
  const baseXP = typeXP[discoveryType];
  
  const multipliers = {
    rarity: rarityMultipliers[rarity],
    level: Math.max(0.5, 1.0 - (playerLevel * 0.01)), // Slight level scaling
    ...bonusMultipliers,
  };
  
  const totalMultiplier = Object.values(multipliers).reduce((acc, mult) => acc * mult, 1.0);
  const totalXP = Math.floor(baseXP * totalMultiplier);
  
  return {
    source: 'discovery',
    baseXP,
    multipliers,
    totalXP,
  };
}

/**
 * Calculate stat increases on level up
 */
export interface StatIncrease {
  stat: string;
  increase: number;
  reason: string;
}

export function calculateLevelUpStatIncreases(
  oldLevel: number,
  newLevel: number,
  classType?: string
): StatIncrease[] {
  const increases: StatIncrease[] = [];
  
  for (let level = oldLevel + 1; level <= newLevel; level++) {
    // Base stat increases every level
    increases.push({
      stat: 'health',
      increase: 10 + Math.floor(level / 5) * 2,
      reason: `Level ${level} health increase`,
    });
    
    // Milestone bonuses
    if (level % 5 === 0) {
      increases.push({
        stat: 'allStats',
        increase: 1,
        reason: `Level ${level} milestone bonus`,
      });
    }
    
    // Class-specific bonuses (if implemented)
    if (classType) {
      const classBonuses = getClassLevelBonuses(classType, level);
      increases.push(...classBonuses);
    }
  }
  
  return increases;
}

function getClassLevelBonuses(classType: string, level: number): StatIncrease[] {
  const bonuses: StatIncrease[] = [];
  
  // Example class bonuses (can be expanded)
  switch (classType.toLowerCase()) {
    case 'warrior':
      if (level % 3 === 0) {
        bonuses.push({
          stat: 'strength',
          increase: 1,
          reason: `Warrior level ${level} strength bonus`,
        });
      }
      break;
      
    case 'mage':
      if (level % 3 === 0) {
        bonuses.push({
          stat: 'intelligence',
          increase: 1,
          reason: `Mage level ${level} intelligence bonus`,
        });
      }
      break;
      
    case 'rogue':
      if (level % 3 === 0) {
        bonuses.push({
          stat: 'dexterity',
          increase: 1,
          reason: `Rogue level ${level} dexterity bonus`,
        });
      }
      break;
  }
  
  return bonuses;
}

/**
 * Calculate experience penalties/bonuses
 */
export function calculateXPModifiers(
  playerLevel: number,
  worldModifiers: Record<string, number> = {}
): Record<string, number> {
  const modifiers: Record<string, number> = { ...worldModifiers };
  
  // Rest bonus (would be tracked separately)
  if (!modifiers.restBonus) {
    modifiers.restBonus = 1.0;
  }
  
  // Death penalty (would be applied temporarily)
  if (!modifiers.deathPenalty) {
    modifiers.deathPenalty = 1.0;
  }
  
  // High level scaling (XP requirements increase at high levels)
  if (playerLevel > 50) {
    modifiers.highLevelPenalty = Math.max(0.5, 1.0 - ((playerLevel - 50) * 0.01));
  }
  
  return modifiers;
}
