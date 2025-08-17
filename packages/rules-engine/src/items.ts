import { ItemInstance, ItemArchetype, Stats } from '@ai-mmo/shared-types';
import { PRNG, createSubsystemPRNG } from './prng';

/**
 * Generate item instance from archetype with random properties
 */
export function generateItemInstance(
  archetype: ItemArchetype,
  context: {
    mintWorldId: string;
    sourceLevel?: number;
    quality?: number;
    worldSeed: string;
    instanceId: string;
  }
): Omit<ItemInstance, 'id' | 'createdAt'> {
  const rng = createSubsystemPRNG(context.worldSeed, 'items', context.instanceId, 0);
  
  // Generate base instance
  const instance: Omit<ItemInstance, 'id' | 'createdAt'> = {
    archetypeSlug: archetype.slug,
    mintWorldId: context.mintWorldId,
    rollData: {},
  };
  
  // Generate quality if not provided
  const quality = context.quality ?? rng.randFloat(0.8, 1.2);
  
  // Generate rolled stats based on quality
  const rolledStats = generateRolledStats(archetype, quality, rng);
  if (Object.keys(rolledStats).length > 0) {
    instance.rollData!.stats = rolledStats;
  }
  
  // Generate durability for equipment
  if (archetype.slot !== 'consumable' && archetype.slot !== 'trinket') {
    const baseDurability = 100;
    const variance = rng.randFloat(0.9, 1.1);
    const maxDurability = Math.floor(baseDurability * variance * quality);
    
    instance.rollData!.durability = {
      current: maxDurability,
      max: maxDurability,
    };
  }
  
  // Store quality for reference
  instance.rollData!.quality = Math.max(0.5, Math.min(1.5, quality));
  
  return instance;
}

/**
 * Generate rolled stats with variance
 */
function generateRolledStats(
  archetype: ItemArchetype,
  quality: number,
  rng: PRNG
): Stats {
  const rolledStats: Stats = {};
  
  for (const [stat, baseValue] of Object.entries(archetype.stats)) {
    if (baseValue === 0) continue;
    
    // Apply quality modifier
    let modifiedValue = baseValue * quality;
    
    // Add random variance (±10%)
    const variance = rng.randFloat(0.9, 1.1);
    modifiedValue *= variance;
    
    // Round appropriately
    if (stat.includes('Percent') || stat.includes('Rate') || stat === 'resistance') {
      // Percentage stats - keep decimals
      rolledStats[stat] = Math.round(modifiedValue * 100) / 100;
    } else {
      // Integer stats
      rolledStats[stat] = Math.floor(modifiedValue);
    }
  }
  
  return rolledStats;
}

/**
 * Calculate item's current effective stats
 */
export function calculateItemStats(
  archetype: ItemArchetype,
  instance: ItemInstance
): Stats {
  const stats: Stats = { ...archetype.stats };
  
  // Apply rolled stats
  if (instance.rollData?.stats) {
    for (const [stat, value] of Object.entries(instance.rollData.stats)) {
      stats[stat] = (stats[stat] || 0) + value;
    }
  }
  
  // Apply quality modifier to base stats
  if (instance.rollData?.quality && instance.rollData.quality !== 1.0) {
    for (const [stat, value] of Object.entries(stats)) {
      if (archetype.stats[stat]) {
        // Only apply quality to base archetype stats, not rolled bonuses
        const baseContribution = archetype.stats[stat] * (instance.rollData.quality - 1.0);
        stats[stat] = value + baseContribution;
      }
    }
  }
  
  // Apply durability penalty
  if (instance.rollData?.durability) {
    const durabilityRatio = instance.rollData.durability.current / instance.rollData.durability.max;
    const penalty = 1.0 - Math.max(0, 1.0 - durabilityRatio) * 0.5; // Max 50% penalty at 0 durability
    
    for (const [stat, value] of Object.entries(stats)) {
      if (typeof value === 'number' && value > 0) {
        stats[stat] = Math.floor(value * penalty);
      }
    }
  }
  
  // Apply enchantments
  if (instance.rollData?.enchantments) {
    for (const enchantment of instance.rollData.enchantments) {
      for (const [stat, value] of Object.entries(enchantment.stats)) {
        stats[stat] = (stats[stat] || 0) + value;
      }
    }
  }
  
  return stats;
}

/**
 * Check if item can be used by player
 */
export function canUseItem(
  archetype: ItemArchetype,
  playerLevel: number,
  playerStats: Stats,
  playerClass?: string
): { canUse: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let canUse = true;
  
  // Level requirement
  if (archetype.levelRequirement && playerLevel < archetype.levelRequirement) {
    canUse = false;
    reasons.push(`Requires level ${archetype.levelRequirement}`);
  }
  
  // Class restrictions
  if (archetype.classRestrictions && archetype.classRestrictions.length > 0) {
    if (!playerClass || !archetype.classRestrictions.includes(playerClass)) {
      canUse = false;
      reasons.push(`Restricted to: ${archetype.classRestrictions.join(', ')}`);
    }
  }
  
  // Stat requirements (if we add them later)
  // Could check minimum strength for heavy armor, intelligence for spell items, etc.
  
  return { canUse, reasons };
}

/**
 * Apply item use effects
 */
export function useItem(
  archetype: ItemArchetype,
  instance: ItemInstance,
  context: {
    userId: string;
    worldId: string;
    targetId?: string;
    worldSeed: string;
  }
): {
  success: boolean;
  effects: Array<{
    type: string;
    value: number;
    duration?: number;
    description: string;
  }>;
  consumeItem: boolean;
  message: string;
} {
  const rng = createSubsystemPRNG(context.worldSeed, 'item_use', instance.id, Date.now());
  
  const result = {
    success: true,
    effects: [] as Array<{
      type: string;
      value: number;
      duration?: number;
      description: string;
    }>,
    consumeItem: false,
    message: '',
  };
  
  // Handle consumable items
  if (archetype.slot === 'consumable') {
    result.consumeItem = true;
    
    // Parse item effects from tags or usable properties
    if (archetype.tags.includes('healing')) {
      const healAmount = archetype.stats.healing || 50;
      result.effects.push({
        type: 'heal',
        value: healAmount,
        description: `Restored ${healAmount} health`,
      });
      result.message = `You consume the ${archetype.name} and feel refreshed.`;
    }
    
    if (archetype.tags.includes('mana')) {
      const manaAmount = archetype.stats.manaRestore || 30;
      result.effects.push({
        type: 'mana',
        value: manaAmount,
        description: `Restored ${manaAmount} mana`,
      });
      result.message += ` Your magical energy is replenished.`;
    }
    
    if (archetype.tags.includes('buff')) {
      // Temporary stat boost
      const duration = 300; // 5 minutes
      for (const [stat, value] of Object.entries(archetype.stats)) {
        if (value > 0 && !['healing', 'manaRestore'].includes(stat)) {
          result.effects.push({
            type: 'buff',
            value,
            duration,
            description: `${stat} increased by ${value} for ${duration} seconds`,
          });
        }
      }
      result.message += ` You feel empowered!`;
    }
  }
  
  // Handle tools and special items
  if (archetype.tags.includes('tool')) {
    result.message = `You use the ${archetype.name}.`;
    
    // Tool-specific logic would go here
    if (archetype.tags.includes('lockpick')) {
      result.effects.push({
        type: 'skill_bonus',
        value: 5,
        description: 'Lockpicking bonus',
      });
    }
  }
  
  // Handle charges for reusable items
  if (archetype.usable?.charges) {
    // Would need to track charges in instance data
    // For now, assume unlimited uses for non-consumables
  }
  
  // Apply cooldown
  if (archetype.usable?.cooldown && archetype.usable.cooldown > 0) {
    result.effects.push({
      type: 'cooldown',
      value: archetype.usable.cooldown,
      description: `${archetype.name} on cooldown for ${archetype.usable.cooldown} seconds`,
    });
  }
  
  if (!result.message) {
    result.message = `You use the ${archetype.name}, but nothing obvious happens.`;
  }
  
  return result;
}

/**
 * Calculate item repair cost
 */
export function calculateRepairCost(
  archetype: ItemArchetype,
  instance: ItemInstance
): number {
  if (!instance.rollData?.durability) return 0;
  
  const durabilityLost = instance.rollData.durability.max - instance.rollData.durability.current;
  if (durabilityLost <= 0) return 0;
  
  // Base repair cost is proportional to item value and durability lost
  const baseValue = archetype.value || 100;
  const repairCostPerPoint = Math.max(1, Math.floor(baseValue * 0.02)); // 2% of item value per durability point
  
  return durabilityLost * repairCostPerPoint;
}

/**
 * Repair item
 */
export function repairItem(
  instance: ItemInstance,
  repairAmount?: number
): { success: boolean; cost: number; newDurability: number } {
  if (!instance.rollData?.durability) {
    return { success: false, cost: 0, newDurability: 0 };
  }
  
  const maxDurability = instance.rollData.durability.max;
  const currentDurability = instance.rollData.durability.current;
  
  // If no specific amount, repair to full
  const targetDurability = repairAmount 
    ? Math.min(maxDurability, currentDurability + repairAmount)
    : maxDurability;
  
  const actualRepair = targetDurability - currentDurability;
  
  if (actualRepair <= 0) {
    return { success: false, cost: 0, newDurability: currentDurability };
  }
  
  // Update durability
  instance.rollData.durability.current = targetDurability;
  
  return {
    success: true,
    cost: actualRepair * 10, // Simple cost calculation
    newDurability: targetDurability,
  };
}

/**
 * Apply wear and tear to item
 */
export function degradeItem(
  instance: ItemInstance,
  degradeAmount: number = 1
): { degraded: boolean; newDurability: number; broken: boolean } {
  if (!instance.rollData?.durability) {
    return { degraded: false, newDurability: 0, broken: false };
  }
  
  const oldDurability = instance.rollData.durability.current;
  const newDurability = Math.max(0, oldDurability - degradeAmount);
  
  instance.rollData.durability.current = newDurability;
  
  return {
    degraded: newDurability < oldDurability,
    newDurability,
    broken: newDurability === 0,
  };
}

/**
 * Check if two items can be stacked
 */
export function canStackItems(
  archetype: ItemArchetype,
  instance1: ItemInstance,
  instance2: ItemInstance
): boolean {
  // Must be same archetype and stackable
  if (!archetype.stackable || instance1.archetypeSlug !== instance2.archetypeSlug) {
    return false;
  }
  
  // Must have same quality and rolled stats (for consistency)
  if (instance1.rollData?.quality !== instance2.rollData?.quality) {
    return false;
  }
  
  // Compare rolled stats
  const stats1 = JSON.stringify(instance1.rollData?.stats || {});
  const stats2 = JSON.stringify(instance2.rollData?.stats || {});
  
  if (stats1 !== stats2) {
    return false;
  }
  
  // Items with durability typically don't stack
  if (instance1.rollData?.durability || instance2.rollData?.durability) {
    return false;
  }
  
  // Items with enchantments don't stack
  if (instance1.rollData?.enchantments || instance2.rollData?.enchantments) {
    return false;
  }
  
  return true;
}
