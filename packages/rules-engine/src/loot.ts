import { ItemArchetype, LootTable, Rarity } from '@ai-mmo/shared-types';
import { PRNG, createSubsystemPRNG, weightedChoice } from './prng';

export interface LootDrop {
  archetypeSlug: string;
  quantity: number;
  rarity: Rarity;
  quality?: number; // 0-1 quality multiplier for stats
  affixes?: Array<{
    id: string;
    name: string;
    stats: Record<string, number>;
  }>;
}

export interface LootContext {
  sourceLevel: number;
  sourceName: string;
  playerLevel: number;
  playerLuck: number;
  magicFind: number; // Bonus to rare drop chances
  worldSeed: string;
  dropId: string; // Unique identifier for this drop event
}

/**
 * Generate loot from a loot table
 */
export function generateLoot(
  lootTable: LootTable,
  context: LootContext,
  itemArchetypes: Map<string, ItemArchetype>
): LootDrop[] {
  const rng = createSubsystemPRNG(context.worldSeed, 'loot', context.dropId, 0);
  const drops: LootDrop[] = [];
  
  for (const entry of lootTable.entries) {
    // Check drop chance with magic find bonus
    const baseWeight = entry.weight;
    const adjustedWeight = baseWeight * (1 + context.magicFind * 0.01);
    
    if (rng.random() * 100 < adjustedWeight) {
      const archetype = itemArchetypes.get(entry.archetypeSlug);
      if (!archetype) {
        console.warn(`Unknown item archetype: ${entry.archetypeSlug}`);
        continue;
      }
      
      // Determine quantity
      const quantity = rng.randInt(entry.minQuantity, entry.maxQuantity);
      
      // Determine quality and rarity upgrades
      const drop = generateItemDrop(archetype, context, rng);
      drop.quantity = quantity;
      
      drops.push(drop);
    }
  }
  
  return drops;
}

/**
 * Generate a single item drop with quality and rarity upgrades
 */
export function generateItemDrop(
  archetype: ItemArchetype,
  context: LootContext,
  rng: PRNG
): LootDrop {
  let rarity = archetype.rarity;
  let quality = rng.randFloat(0.8, 1.0); // Base quality range
  
  // Apply luck bonuses
  const luckBonus = context.playerLuck * 0.01;
  const magicFindBonus = context.magicFind * 0.01;
  
  // Chance for rarity upgrade based on level difference and luck
  const levelDiff = Math.max(0, context.sourceLevel - context.playerLevel);
  const upgradeChance = 0.05 + luckBonus + (levelDiff * 0.02) + magicFindBonus;
  
  if (rng.random() < upgradeChance) {
    rarity = upgradeRarity(rarity, rng);
  }
  
  // Quality bonus for higher rarities
  switch (rarity) {
    case 'rare':
      quality = rng.randFloat(0.9, 1.1);
      break;
    case 'epic':
      quality = rng.randFloat(1.0, 1.2);
      break;
    case 'legendary':
      quality = rng.randFloat(1.1, 1.3);
      break;
  }
  
  const drop: LootDrop = {
    archetypeSlug: archetype.slug,
    quantity: 1,
    rarity,
    quality: Math.max(0.5, Math.min(1.5, quality)),
  };
  
  // Generate affixes for rare+ items
  if (rarity !== 'common') {
    drop.affixes = generateAffixes(archetype, rarity, context, rng);
  }
  
  return drop;
}

/**
 * Upgrade item rarity
 */
function upgradeRarity(currentRarity: Rarity, rng: PRNG): Rarity {
  const rarityOrder: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
  const currentIndex = rarityOrder.indexOf(currentRarity);
  
  if (currentIndex < rarityOrder.length - 1) {
    // Decreasing chances for higher tiers
    const upgradeChances = [0.3, 0.1, 0.02]; // common->rare, rare->epic, epic->legendary
    
    for (let i = currentIndex; i < rarityOrder.length - 1; i++) {
      if (rng.random() < upgradeChances[i]) {
        return rarityOrder[i + 1];
      } else {
        break; // Failed upgrade, stop trying
      }
    }
  }
  
  return currentRarity;
}

/**
 * Generate affixes for rare+ items
 */
function generateAffixes(
  archetype: ItemArchetype,
  rarity: Rarity,
  context: LootContext,
  rng: PRNG
): Array<{ id: string; name: string; stats: Record<string, number> }> {
  const affixes: Array<{ id: string; name: string; stats: Record<string, number> }> = [];
  
  // Number of affixes based on rarity
  let maxAffixes = 0;
  switch (rarity) {
    case 'rare':
      maxAffixes = rng.randInt(1, 2);
      break;
    case 'epic':
      maxAffixes = rng.randInt(2, 3);
      break;
    case 'legendary':
      maxAffixes = rng.randInt(3, 4);
      break;
  }
  
  // Available affix pools based on item type
  const availableAffixes = getAffixPool(archetype.slot, archetype.tags);
  
  for (let i = 0; i < maxAffixes && availableAffixes.length > 0; i++) {
    const affixTemplate = rng.choice(availableAffixes);
    
    // Remove used affix to prevent duplicates
    const index = availableAffixes.indexOf(affixTemplate);
    availableAffixes.splice(index, 1);
    
    // Generate affix with random values
    const affix = generateAffix(affixTemplate, context, rng);
    affixes.push(affix);
  }
  
  return affixes;
}

/**
 * Get available affix pool for item type
 */
function getAffixPool(slot: string, tags: string[]): AffixTemplate[] {
  const baseAffixes: AffixTemplate[] = [
    { id: 'strength_boost', name: 'of Strength', stats: { strength: [1, 5] } },
    { id: 'dexterity_boost', name: 'of Dexterity', stats: { dexterity: [1, 5] } },
    { id: 'intelligence_boost', name: 'of Intelligence', stats: { intelligence: [1, 5] } },
    { id: 'vitality_boost', name: 'of Vitality', stats: { vitality: [1, 5] } },
    { id: 'luck_boost', name: 'of Fortune', stats: { luck: [1, 3] } },
  ];
  
  // Slot-specific affixes
  const slotAffixes: Record<string, AffixTemplate[]> = {
    weapon: [
      { id: 'damage_boost', name: 'of Power', stats: { weaponDamage: [1, 8] } },
      { id: 'critical_boost', name: 'of Precision', stats: { criticalChance: [1, 5] } },
      { id: 'speed_boost', name: 'of Swiftness', stats: { attackSpeed: [5, 15] } },
    ],
    head: [
      { id: 'mana_boost', name: 'of the Mind', stats: { mana: [10, 30] } },
      { id: 'wisdom_boost', name: 'of Wisdom', stats: { wisdom: [1, 4] } },
    ],
    chest: [
      { id: 'health_boost', name: 'of Health', stats: { health: [20, 60] } },
      { id: 'armor_boost', name: 'of Protection', stats: { armor: [2, 8] } },
    ],
    ring: [
      { id: 'resist_boost', name: 'of Resistance', stats: { resistance: [0.05, 0.15] } },
      { id: 'regen_boost', name: 'of Regeneration', stats: { healthRegen: [1, 5] } },
    ],
  };
  
  const available = [...baseAffixes];
  if (slotAffixes[slot]) {
    available.push(...slotAffixes[slot]);
  }
  
  return available;
}

interface AffixTemplate {
  id: string;
  name: string;
  stats: Record<string, [number, number]>; // [min, max] ranges
}

/**
 * Generate specific affix from template
 */
function generateAffix(
  template: AffixTemplate,
  context: LootContext,
  rng: PRNG
): { id: string; name: string; stats: Record<string, number> } {
  const stats: Record<string, number> = {};
  
  for (const [statName, [min, max]] of Object.entries(template.stats)) {
    // Scale values based on source level
    const levelScale = 1 + (context.sourceLevel - 1) * 0.1;
    const scaledMin = Math.floor(min * levelScale);
    const scaledMax = Math.floor(max * levelScale);
    
    stats[statName] = rng.randInt(scaledMin, scaledMax);
  }
  
  return {
    id: template.id,
    name: template.name,
    stats,
  };
}

/**
 * Calculate total item value including affixes and quality
 */
export function calculateItemValue(
  archetype: ItemArchetype,
  drop: LootDrop
): number {
  let value = archetype.value;
  
  // Rarity multipliers
  const rarityMultipliers: Record<Rarity, number> = {
    common: 1.0,
    rare: 2.5,
    epic: 6.0,
    legendary: 15.0,
  };
  
  value *= rarityMultipliers[drop.rarity];
  
  // Quality multiplier
  if (drop.quality) {
    value *= drop.quality;
  }
  
  // Affix value bonus
  if (drop.affixes) {
    const affixBonus = drop.affixes.length * 0.5; // 50% per affix
    value *= (1 + affixBonus);
  }
  
  return Math.floor(value);
}

/**
 * Generate loot from defeated enemy
 */
export function generateEnemyLoot(
  enemyLevel: number,
  enemyName: string,
  playerLevel: number,
  playerLuck: number,
  magicFind: number,
  worldSeed: string,
  lootTables: Map<string, LootTable>,
  itemArchetypes: Map<string, ItemArchetype>
): LootDrop[] {
  const context: LootContext = {
    sourceLevel: enemyLevel,
    sourceName: enemyName,
    playerLevel,
    playerLuck,
    magicFind,
    worldSeed,
    dropId: `${enemyName}_${Date.now()}`,
  };
  
  // Determine which loot tables to use (simplified)
  const applicableTables = Array.from(lootTables.values()).filter(table => 
    table.key.includes('generic') || table.key.includes(enemyName.toLowerCase())
  );
  
  const allDrops: LootDrop[] = [];
  
  for (const table of applicableTables) {
    const drops = generateLoot(table, context, itemArchetypes);
    allDrops.push(...drops);
  }
  
  return allDrops;
}
