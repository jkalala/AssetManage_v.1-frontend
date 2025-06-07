const { PrismaClient } = require('@prisma/client');
const nodeCrypto = require('crypto');

const prisma = new PrismaClient();

const categories = [
  { name: 'Hardware', description: 'Computer hardware and peripherals' },
  { name: 'Software', description: 'Software licenses and subscriptions' },
  { name: 'Furniture', description: 'Office furniture and equipment' },
  { name: 'Vehicles', description: 'Company vehicles and transportation' },
  { name: 'Electronics', description: 'Electronic devices and accessories' },
];

// Start with the original 20 asset names
const baseAssetNames = [
  'Dell XPS 15 Laptop',
  'MacBook Pro 16"',
  'Microsoft Office 365 License',
  'Adobe Creative Cloud Subscription',
  'Ergonomic Office Chair',
  'Standing Desk',
  'Company Car - Toyota Camry',
  'Company Van - Ford Transit',
  'iPhone 14 Pro',
  'Samsung Galaxy S23',
  'Dell UltraSharp Monitor',
  'Logitech MX Master Mouse',
  'Mechanical Keyboard',
  'External SSD 1TB',
  'Network Printer',
  'Projector',
  'Conference Room TV',
  'Security Camera System',
  'UPS Battery Backup',
  'Wireless Router',
];

// Generate 50 more asset names
const assetNames = [
  ...baseAssetNames,
  ...Array.from({ length: 50 }, (_, i) => `Test Asset #${i + 21}`)
];

const statuses = ['active', 'maintenance', 'retired', 'lost'];

async function main() {
  console.log('Starting database seeding...');

  // Delete all assets and categories first for a clean seed
  await prisma.asset.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  console.log('Creating categories...');
  const createdCategories = await Promise.all(
    categories.map(async (category) => {
      return prisma.category.create({
        data: {
          id: nodeCrypto.randomUUID(),
          name: category.name,
          description: category.description,
          createdBy: null,
        },
      });
    })
  );

  console.log('Categories created:', createdCategories.length);

  // Create assets
  console.log('Creating assets...');
  const assets = await Promise.all(
    assetNames.map(async (name, index) => {
      const category = createdCategories[index % createdCategories.length];
      const value = Math.floor(Math.random() * 9000) + 1000;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      return prisma.asset.create({
        data: {
          id: nodeCrypto.randomUUID(),
          name,
          description: `Test asset ${index + 1}`,
          status,
          value,
          categoryId: category.id,
          createdBy: null,
        },
      });
    })
  );

  console.log('Assets created:', assets.length);
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 