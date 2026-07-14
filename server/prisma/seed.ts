import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding plans...');

  await prisma.plan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      maxInterviewsPerDay: 5,
      pdfExportEnabled: false,
      shareableLinksEnabled: false,
    },
  });

  await prisma.plan.upsert({
    where: { id: 'pro' },
    update: {},
    create: {
      id: 'pro',
      name: 'Pro',
      maxInterviewsPerDay: 9999,
      pdfExportEnabled: true,
      shareableLinksEnabled: true,
    },
  });

  console.log('Plans seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
