import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create currencies
  console.log('Creating currencies...');
  const goldCurrency = await prisma.currency.upsert({
    where: { code: 'GOLD' },
    update: {},
    create: {
      code: 'GOLD',
      name: 'Gold',
      symbol: '🪙',
      decimals: 0,
    },
  });

  // Create test user
  console.log('Creating test user...');
  const hashedPassword = await bcrypt.hash('password123', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testplayer',
      passwordHash: hashedPassword,
    },
  });

  // Create user wallet
  console.log('Creating user wallet...');
  await prisma.wallet.upsert({
    where: {
      userId_currencyId: {
        userId: testUser.id,
        currencyId: goldCurrency.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      currencyId: goldCurrency.id,
      balance: 1000, // Starting gold
    },
  });

  // Create user inventory
  console.log('Creating user inventory...');
  await prisma.inventory.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      capacity: 100,
    },
  });

  // Create sample item archetypes
  console.log('Creating item archetypes...');
  const swordArchetype = await prisma.itemArchetype.upsert({
    where: { slug: 'iron-sword' },
    update: {},
    create: {
      slug: 'iron-sword',
      name: 'Iron Sword',
      description: 'A sturdy iron sword, well-balanced and reliable.',
      rarity: 'COMMON',
      slot: 'WEAPON',
      statsJson: {
        weaponDamage: 8,
        strength: 2,
      },
      tagsJson: ['weapon', 'melee', 'sword'],
      value: 100,
    },
  });

  const healthPotionArchetype = await prisma.itemArchetype.upsert({
    where: { slug: 'health-potion' },
    update: {},
    create: {
      slug: 'health-potion',
      name: 'Health Potion',
      description: 'A red potion that restores health when consumed.',
      rarity: 'COMMON',
      slot: 'CONSUMABLE',
      statsJson: {
        healing: 50,
      },
      tagsJson: ['consumable', 'healing', 'potion'],
      value: 25,
      stackable: true,
      maxStack: 10,
      usableJson: {
        consumable: true,
        effects: [
          {
            type: 'heal',
            value: 50,
            duration: 0,
          },
        ],
      },
    },
  });

  const leatherArmorArchetype = await prisma.itemArchetype.upsert({
    where: { slug: 'leather-armor' },
    update: {},
    create: {
      slug: 'leather-armor',
      name: 'Leather Armor',
      description: 'Basic leather armor providing modest protection.',
      rarity: 'COMMON',
      slot: 'CHEST',
      statsJson: {
        armor: 3,
        health: 20,
      },
      tagsJson: ['armor', 'chest', 'leather'],
      value: 75,
    },
  });

  // Create sample world
  console.log('Creating sample world...');
  const sampleWorld = await prisma.world.upsert({
    where: { id: 'sample-world-id' },
    update: {},
    create: {
      id: 'sample-world-id',
      ownerId: testUser.id,
      title: 'The Forgotten Realms',
      description: 'A mystical world filled with ancient magic and forgotten secrets.',
      seed: 'sample-world-seed-12345',
      status: 'READY',
      modelVersion: 'llama3:8b-instruct',
      compiledWorldUrl: 'https://storage.example.com/worlds/sample-world.json',
    },
  });

  // Create sample locations
  console.log('Creating sample locations...');
  await prisma.location.createMany({
    data: [
      {
        worldId: sampleWorld.id,
        key: 'starting-village',
        name: 'Millbrook Village',
        description: 'A peaceful village nestled in a valley, with thatched-roof cottages and a babbling brook.',
        biome: 'plains',
        connectionsJson: [
          { direction: 'north', targetKey: 'dark-forest', description: 'A path leads into the shadowy woods.' },
          { direction: 'east', targetKey: 'old-ruins', description: 'Ancient stones mark the way to forgotten ruins.' },
        ],
      },
      {
        worldId: sampleWorld.id,
        key: 'dark-forest',
        name: 'Shadowmere Forest',
        description: 'Dense woods where sunlight barely penetrates the canopy. Strange sounds echo in the darkness.',
        biome: 'forest',
        connectionsJson: [
          { direction: 'south', targetKey: 'starting-village', description: 'The path back to the village.' },
          { direction: 'west', targetKey: 'ancient-temple', description: 'Overgrown stones lead to an old temple.' },
        ],
      },
      {
        worldId: sampleWorld.id,
        key: 'old-ruins',
        name: 'Crumbling Ruins',
        description: 'The remnants of an ancient civilization, with weathered stone pillars and mysterious carvings.',
        biome: 'ruins',
        connectionsJson: [
          { direction: 'west', targetKey: 'starting-village', description: 'The path back to the village.' },
          { direction: 'down', targetKey: 'underground-cavern', description: 'Stairs descend into darkness.' },
        ],
      },
      {
        worldId: sampleWorld.id,
        key: 'ancient-temple',
        name: 'Temple of the Moon',
        description: 'A sacred temple dedicated to lunar deities, with silver inlays and glowing crystals.',
        biome: 'ruins',
        connectionsJson: [
          { direction: 'east', targetKey: 'dark-forest', description: 'The path back through the forest.' },
        ],
      },
      {
        worldId: sampleWorld.id,
        key: 'underground-cavern',
        name: 'Crystal Cavern',
        description: 'A vast underground chamber filled with glowing crystals that pulse with magical energy.',
        biome: 'caves',
        connectionsJson: [
          { direction: 'up', targetKey: 'old-ruins', description: 'Stairs lead back to the surface.' },
        ],
      },
    ],
    skipDuplicates: true,
  });

  // Create sample mobs
  console.log('Creating sample mobs...');
  await prisma.mob.createMany({
    data: [
      {
        worldId: sampleWorld.id,
        key: 'forest-wolf',
        name: 'Shadow Wolf',
        level: 3,
        statsJson: {
          strength: 14,
          dexterity: 16,
          vitality: 12,
          health: 45,
          armor: 1,
          weaponDamage: 6,
        },
        dropsJson: [
          { archetypeSlug: 'wolf-pelt', weight: 60, minQuantity: 1, maxQuantity: 1 },
          { archetypeSlug: 'health-potion', weight: 25, minQuantity: 1, maxQuantity: 1 },
        ],
      },
      {
        worldId: sampleWorld.id,
        key: 'temple-guardian',
        name: 'Stone Guardian',
        level: 8,
        statsJson: {
          strength: 18,
          dexterity: 8,
          vitality: 20,
          health: 120,
          armor: 5,
          weaponDamage: 12,
          damageReduction: 3,
        },
        dropsJson: [
          { archetypeSlug: 'guardian-core', weight: 100, minQuantity: 1, maxQuantity: 1 },
          { archetypeSlug: 'iron-sword', weight: 15, minQuantity: 1, maxQuantity: 1 },
        ],
      },
    ],
    skipDuplicates: true,
  });

  // Create sample quests
  console.log('Creating sample quests...');
  await prisma.quest.createMany({
    data: [
      {
        worldId: sampleWorld.id,
        key: 'welcome-quest',
        name: 'Welcome to Millbrook',
        summary: 'Explore the village and meet the locals.',
        stepsJson: [
          {
            kind: 'talk',
            target: 'village-elder',
            count: 1,
            description: 'Speak with the Village Elder',
          },
          {
            kind: 'visit',
            target: 'village-shop',
            count: 1,
            description: 'Visit the Village Shop',
          },
        ],
        rewardsJson: {
          experience: 100,
          gold: 50,
          items: [
            { archetypeSlug: 'health-potion', quantity: 2 },
          ],
        },
      },
      {
        worldId: sampleWorld.id,
        key: 'forest-threat',
        name: 'The Forest Threat',
        summary: 'Investigate the strange sounds coming from Shadowmere Forest.',
        stepsJson: [
          {
            kind: 'visit',
            target: 'dark-forest',
            count: 1,
            description: 'Enter Shadowmere Forest',
          },
          {
            kind: 'defeat',
            target: 'forest-wolf',
            count: 3,
            description: 'Defeat 3 Shadow Wolves',
          },
        ],
        rewardsJson: {
          experience: 300,
          gold: 150,
          items: [
            { archetypeSlug: 'iron-sword', quantity: 1 },
          ],
        },
      },
    ],
    skipDuplicates: true,
  });

  // Create player state
  console.log('Creating player state...');
  await prisma.playerState.upsert({
    where: {
      userId_worldId: {
        userId: testUser.id,
        worldId: sampleWorld.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      worldId: sampleWorld.id,
      currentLocationKey: 'starting-village',
      level: 1,
      experience: 0,
      statsJson: {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
        wisdom: 10,
        charisma: 10,
        luck: 5,
      },
      healthJson: {
        current: 100,
        max: 100,
      },
      manaJson: {
        current: 50,
        max: 50,
      },
      gold: 100,
      activeQuestsJson: [
        {
          questKey: 'welcome-quest',
          progress: {},
          startedAt: new Date().toISOString(),
        },
      ],
      completedQuestsJson: [],
    },
  });

  // Create some item instances for the player
  console.log('Creating item instances...');
  const starterSword = await prisma.itemInstance.create({
    data: {
      archetypeSlug: 'iron-sword',
      mintWorldId: sampleWorld.id,
      rollDataJson: {
        quality: 1.0,
        durability: {
          current: 100,
          max: 100,
        },
      },
      metadataJson: {
        source: 'starter-kit',
      },
    },
  });

  const healthPotions = await prisma.itemInstance.create({
    data: {
      archetypeSlug: 'health-potion',
      mintWorldId: sampleWorld.id,
      rollDataJson: {
        quality: 1.0,
      },
      metadataJson: {
        source: 'starter-kit',
      },
    },
  });

  // Add items to inventory
  const inventory = await prisma.inventory.findUnique({
    where: { userId: testUser.id },
  });

  if (inventory) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          inventoryId: inventory.id,
          itemInstanceId: starterSword.id,
          quantity: 1,
          equipped: true,
        },
        {
          inventoryId: inventory.id,
          itemInstanceId: healthPotions.id,
          quantity: 5,
          equipped: false,
        },
      ],
      skipDuplicates: true,
    });
  }

  // Create a sample market order
  console.log('Creating sample market order...');
  const marketItem = await prisma.itemInstance.create({
    data: {
      archetypeSlug: 'leather-armor',
      mintWorldId: sampleWorld.id,
      rollDataJson: {
        quality: 1.1,
        stats: {
          armor: 1, // Bonus armor from quality
        },
        durability: {
          current: 100,
          max: 100,
        },
      },
      metadataJson: {
        source: 'mob:forest-wolf',
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: testUser.id,
      type: 'LIMIT',
      side: 'SELL',
      status: 'PENDING',
      itemInstanceId: marketItem.id,
      quantity: 1,
      quantityFilled: 0,
      price: 85,
      totalValue: 85,
      currencyId: goldCurrency.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  console.log('✅ Database seeding completed!');
  console.log(`
📊 Created:
- 1 Currency (GOLD)
- 1 Test User (test@example.com / password123)
- 3 Item Archetypes (sword, potion, armor)
- 1 Sample World (The Forgotten Realms)
- 5 Locations (village, forest, ruins, temple, cavern)
- 2 Mobs (wolf, guardian)
- 2 Quests (welcome, forest threat)
- 1 Player State
- 2 Item Instances in inventory
- 1 Market listing

🎮 You can now:
- Login with test@example.com / password123
- Explore the world starting at Millbrook Village
- Complete quests and fight monsters
- Use the marketplace

🚀 Start the application with: docker compose up
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
