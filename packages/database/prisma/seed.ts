import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default currencies
  const goldCurrency = await prisma.currency.upsert({
    where: { code: 'GOLD' },
    update: {},
    create: {
      code: 'GOLD',
      name: 'Gold Coins',
      symbol: '🪙',
      decimals: 0,
      isActive: true
    }
  });

  const gemsCurrency = await prisma.currency.upsert({
    where: { code: 'GEMS' },
    update: {},
    create: {
      code: 'GEMS',
      name: 'Premium Gems',
      symbol: '💎',
      decimals: 0,
      isActive: true
    }
  });

  console.log('✅ Created default currencies');

  // Create global item archetypes
  const basicSword = await prisma.itemArchetype.upsert({
    where: { slug: 'iron-sword' },
    update: {},
    create: {
      slug: 'iron-sword',
      name: 'Iron Sword',
      description: 'A sturdy iron blade, well-balanced for combat.',
      rarity: 'COMMON',
      slot: 'WEAPON',
      stats: {
        attack: 10,
        durability: 100
      },
      tags: ['melee', 'one-handed'],
      value: 50,
      stackable: false,
      maxStack: 1
    }
  });

  const healthPotion = await prisma.itemArchetype.upsert({
    where: { slug: 'health-potion' },
    update: {},
    create: {
      slug: 'health-potion',
      name: 'Health Potion',
      description: 'A red liquid that restores health when consumed.',
      rarity: 'COMMON',
      slot: 'CONSUMABLE',
      stats: {
        healing: 50
      },
      tags: ['consumable', 'healing'],
      value: 25,
      stackable: true,
      maxStack: 10
    }
  });

  const leatherArmor = await prisma.itemArchetype.upsert({
    where: { slug: 'leather-armor' },
    update: {},
    create: {
      slug: 'leather-armor',
      name: 'Leather Armor',
      description: 'Basic protection made from cured leather.',
      rarity: 'COMMON',
      slot: 'CHEST',
      stats: {
        defense: 5,
        durability: 80
      },
      tags: ['armor', 'light'],
      value: 75,
      stackable: false,
      maxStack: 1
    }
  });

  console.log('✅ Created global item archetypes');

  // Create global crafting recipes
  await prisma.craftingRecipe.upsert({
    where: { slug: 'craft-health-potion' },
    update: {},
    create: {
      slug: 'craft-health-potion',
      name: 'Craft Health Potion',
      description: 'Brew a healing potion using herbs and water.',
      worldId: null, // global recipe
      ingredients: [
        { archetypeSlug: 'red-herb', quantity: 2 },
        { archetypeSlug: 'spring-water', quantity: 1 }
      ],
      outputs: [
        { archetypeSlug: 'health-potion', quantity: 1, chance: 1.0 }
      ],
      requirements: {
        skill: 'alchemy',
        skillLevel: 1
      },
      craftTime: 30
    }
  });

  console.log('✅ Created global crafting recipes');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ai-mmo.com' },
    update: {},
    create: {
      email: 'admin@ai-mmo.com',
      username: 'admin',
      displayName: 'System Administrator',
      passwordHash: '$2b$10$placeholder.hash.for.development', // Should be properly hashed in production
      role: 'ADMIN',
      isActive: true
    }
  });

  // Create admin wallets
  await prisma.wallet.upsert({
    where: {
      userId_currencyId: {
        userId: adminUser.id,
        currencyId: goldCurrency.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      currencyId: goldCurrency.id,
      balance: 1000000,
      lockedBalance: 0
    }
  });

  await prisma.wallet.upsert({
    where: {
      userId_currencyId: {
        userId: adminUser.id,
        currencyId: gemsCurrency.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      currencyId: gemsCurrency.id,
      balance: 10000,
      lockedBalance: 0
    }
  });

  console.log('✅ Created admin user and wallets');

  // Create global chat channel
  await prisma.chatChannel.upsert({
    where: { id: 'global-general' },
    update: {},
    create: {
      id: 'global-general',
      name: 'General',
      description: 'Global chat for all players',
      type: 'GLOBAL',
      isPublic: true,
      createdBy: adminUser.id,
      isActive: true
    }
  });

  console.log('✅ Created global chat channels');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });