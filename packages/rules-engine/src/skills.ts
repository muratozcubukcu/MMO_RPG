import { Stats } from '@ai-mmo/shared-types';
import { PRNG, createSubsystemPRNG } from './prng';

export interface SkillCheck {
  skill: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  modifiers?: Record<string, number>; // Additional situational modifiers
}

export interface SkillResult {
  success: boolean;
  roll: number;
  totalModifier: number;
  targetDC: number;
  degree: 'critical_failure' | 'failure' | 'success' | 'critical_success';
  description: string;
}

/**
 * Difficulty Class (DC) values
 */
export const DIFFICULTY_DCS = {
  easy: 10,
  normal: 15,
  hard: 20,
  extreme: 25,
} as const;

/**
 * Skill to stat mappings
 */
export const SKILL_STAT_MAP = {
  athletics: 'strength',
  acrobatics: 'dexterity',
  stealth: 'dexterity',
  sleightOfHand: 'dexterity',
  arcana: 'intelligence',
  history: 'intelligence',
  investigation: 'intelligence',
  nature: 'intelligence',
  religion: 'intelligence',
  insight: 'wisdom',
  medicine: 'wisdom',
  perception: 'wisdom',
  survival: 'wisdom',
  animalHandling: 'wisdom',
  deception: 'charisma',
  intimidation: 'charisma',
  performance: 'charisma',
  persuasion: 'charisma',
} as const;

/**
 * Calculate skill modifier from stats
 */
export function calculateSkillModifier(
  skill: string,
  stats: Stats,
  level: number,
  proficiencies: string[] = []
): number {
  // Get primary stat for skill
  const primaryStat = SKILL_STAT_MAP[skill as keyof typeof SKILL_STAT_MAP] || 'intelligence';
  const statValue = stats[primaryStat] || 10;
  const statModifier = Math.floor((statValue - 10) / 2);
  
  // Proficiency bonus
  const proficiencyBonus = proficiencies.includes(skill) ? Math.ceil(level / 4) + 1 : 0;
  
  // Skill-specific bonuses from equipment/effects
  const skillBonus = stats[`${skill}Bonus`] || 0;
  
  return statModifier + proficiencyBonus + skillBonus;
}

/**
 * Perform a skill check
 */
export function performSkillCheck(
  check: SkillCheck,
  stats: Stats,
  level: number,
  proficiencies: string[],
  worldSeed: string,
  entityId: string,
  turnNumber: number = 0
): SkillResult {
  const rng = createSubsystemPRNG(worldSeed, 'skills', entityId, turnNumber);
  
  // Roll d20
  const roll = rng.rollDice('1d20');
  
  // Calculate total modifier
  const skillModifier = calculateSkillModifier(check.skill, stats, level, proficiencies);
  const situationalModifiers = Object.values(check.modifiers || {}).reduce((sum, mod) => sum + mod, 0);
  const totalModifier = skillModifier + situationalModifiers;
  
  // Determine target DC
  const targetDC = DIFFICULTY_DCS[check.difficulty];
  
  // Calculate final result
  const finalResult = roll + totalModifier;
  const success = finalResult >= targetDC;
  
  // Determine degree of success/failure
  let degree: SkillResult['degree'];
  if (roll === 20) {
    degree = 'critical_success';
  } else if (roll === 1) {
    degree = 'critical_failure';
  } else if (success) {
    degree = finalResult >= targetDC + 10 ? 'critical_success' : 'success';
  } else {
    degree = finalResult <= targetDC - 10 ? 'critical_failure' : 'failure';
  }
  
  // Generate description
  let description = `${check.skill.charAt(0).toUpperCase() + check.skill.slice(1)} check: `;
  description += `rolled ${roll} + ${totalModifier} = ${finalResult} vs DC ${targetDC}`;
  
  switch (degree) {
    case 'critical_success':
      description += ' (Critical Success!)';
      break;
    case 'critical_failure':
      description += ' (Critical Failure!)';
      break;
    case 'success':
      description += ' (Success)';
      break;
    case 'failure':
      description += ' (Failure)';
      break;
  }
  
  return {
    success,
    roll,
    totalModifier,
    targetDC,
    degree,
    description,
  };
}

/**
 * Determine difficulty based on level difference
 */
export function calculateDynamicDifficulty(
  baseLevel: number,
  playerLevel: number,
  baseDifficulty: SkillCheck['difficulty'] = 'normal'
): SkillCheck['difficulty'] {
  const levelDiff = baseLevel - playerLevel;
  
  // Adjust difficulty based on level difference
  if (levelDiff <= -5) return 'easy';
  if (levelDiff <= -2) return baseDifficulty === 'hard' ? 'normal' : 'easy';
  if (levelDiff >= 5) return 'extreme';
  if (levelDiff >= 2) return baseDifficulty === 'easy' ? 'normal' : 'hard';
  
  return baseDifficulty;
}

/**
 * Get contextual skill suggestions based on situation
 */
export function getContextualSkills(
  situation: string,
  availableObjects: string[] = [],
  availableNPCs: string[] = []
): Array<{ skill: string; reason: string; difficulty: SkillCheck['difficulty'] }> {
  const suggestions: Array<{ skill: string; reason: string; difficulty: SkillCheck['difficulty'] }> = [];
  
  const lowerSituation = situation.toLowerCase();
  
  // Movement and traversal
  if (lowerSituation.includes('climb') || lowerSituation.includes('jump') || lowerSituation.includes('swim')) {
    suggestions.push({ skill: 'athletics', reason: 'Physical movement required', difficulty: 'normal' });
  }
  
  if (lowerSituation.includes('balance') || lowerSituation.includes('squeeze') || lowerSituation.includes('acrobat')) {
    suggestions.push({ skill: 'acrobatics', reason: 'Agility and balance needed', difficulty: 'normal' });
  }
  
  // Stealth and subterfuge
  if (lowerSituation.includes('sneak') || lowerSituation.includes('hide') || lowerSituation.includes('stealth')) {
    suggestions.push({ skill: 'stealth', reason: 'Avoiding detection', difficulty: 'normal' });
  }
  
  if (lowerSituation.includes('pick') || lowerSituation.includes('steal') || lowerSituation.includes('sleight')) {
    suggestions.push({ skill: 'sleightOfHand', reason: 'Manual dexterity required', difficulty: 'hard' });
  }
  
  // Knowledge and investigation
  if (lowerSituation.includes('magic') || lowerSituation.includes('spell') || lowerSituation.includes('arcane')) {
    suggestions.push({ skill: 'arcana', reason: 'Magical knowledge needed', difficulty: 'normal' });
  }
  
  if (lowerSituation.includes('examine') || lowerSituation.includes('search') || lowerSituation.includes('investigate')) {
    suggestions.push({ skill: 'investigation', reason: 'Careful examination required', difficulty: 'normal' });
  }
  
  if (lowerSituation.includes('nature') || lowerSituation.includes('plant') || lowerSituation.includes('animal')) {
    suggestions.push({ skill: 'nature', reason: 'Natural knowledge needed', difficulty: 'normal' });
  }
  
  // Social interactions
  if (availableNPCs.length > 0) {
    if (lowerSituation.includes('persuade') || lowerSituation.includes('convince')) {
      suggestions.push({ skill: 'persuasion', reason: 'Convincing others', difficulty: 'normal' });
    }
    
    if (lowerSituation.includes('intimidate') || lowerSituation.includes('threaten')) {
      suggestions.push({ skill: 'intimidation', reason: 'Using fear and presence', difficulty: 'normal' });
    }
    
    if (lowerSituation.includes('lie') || lowerSituation.includes('deceive') || lowerSituation.includes('bluff')) {
      suggestions.push({ skill: 'deception', reason: 'Misleading others', difficulty: 'hard' });
    }
    
    if (lowerSituation.includes('sense') || lowerSituation.includes('read') || lowerSituation.includes('insight')) {
      suggestions.push({ skill: 'insight', reason: 'Reading intentions and emotions', difficulty: 'normal' });
    }
  }
  
  // Survival and perception
  if (lowerSituation.includes('track') || lowerSituation.includes('navigate') || lowerSituation.includes('forage')) {
    suggestions.push({ skill: 'survival', reason: 'Wilderness skills needed', difficulty: 'normal' });
  }
  
  if (lowerSituation.includes('listen') || lowerSituation.includes('spot') || lowerSituation.includes('notice')) {
    suggestions.push({ skill: 'perception', reason: 'Noticing details', difficulty: 'normal' });
  }
  
  return suggestions;
}

/**
 * Apply skill check results to game state
 */
export function applySkillCheckResult(
  result: SkillResult,
  check: SkillCheck,
  context: {
    entityId: string;
    location: string;
    targetObject?: string;
    targetNPC?: string;
  }
): Array<{ type: string; description: string; data?: any }> {
  const effects: Array<{ type: string; description: string; data?: any }> = [];
  
  switch (result.degree) {
    case 'critical_success':
      effects.push({
        type: 'skill_success',
        description: `Exceptional ${check.skill} success! ${result.description}`,
        data: { bonus: true, skill: check.skill }
      });
      
      // Critical successes might provide additional benefits
      if (check.skill === 'investigation') {
        effects.push({
          type: 'reveal_secret',
          description: 'Your thorough investigation reveals hidden details!',
        });
      } else if (check.skill === 'persuasion') {
        effects.push({
          type: 'social_bonus',
          description: 'Your exceptional persuasion creates a lasting positive impression!',
        });
      }
      break;
      
    case 'success':
      effects.push({
        type: 'skill_success',
        description: `${check.skill.charAt(0).toUpperCase() + check.skill.slice(1)} success: ${result.description}`,
        data: { skill: check.skill }
      });
      break;
      
    case 'failure':
      effects.push({
        type: 'skill_failure',
        description: `${check.skill.charAt(0).toUpperCase() + check.skill.slice(1)} failed: ${result.description}`,
        data: { skill: check.skill }
      });
      break;
      
    case 'critical_failure':
      effects.push({
        type: 'skill_failure',
        description: `Critical ${check.skill} failure! ${result.description}`,
        data: { critical: true, skill: check.skill }
      });
      
      // Critical failures might have additional consequences
      if (check.skill === 'stealth') {
        effects.push({
          type: 'alert_enemies',
          description: 'Your failed stealth attempt alerts nearby enemies!',
        });
      } else if (check.skill === 'athletics') {
        effects.push({
          type: 'take_damage',
          description: 'Your athletic failure results in injury!',
          data: { damage: 5 }
        });
      }
      break;
  }
  
  return effects;
}
