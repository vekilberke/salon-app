import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Settings - Idempotent initialization
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {}, // No-op if exists
    create: {
      salonName: 'Elite Kuaför',
      currency: 'TRY',
      timezone: 'Europe/Istanbul',
      entryScreenEnabled: true,
      entryPinEnabled: false,
    },
  });

  // Admin Bootstrap
  // Check if ANY admin exists. If not, create the initial bootstrap admin.
  const adminCount = await prisma.adminUser.count();

  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || (process.env.NODE_ENV === 'development' ? 'admin' : undefined);
    const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'development' ? 'Kuafor2026Sistem' : undefined);

    if (!username || !password) {
      console.warn('⚠️  Skipping Admin Bootstrap: ADMIN_USERNAME and ADMIN_PASSWORD env vars not set in production.');
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.adminUser.create({
        data: {
          username,
          passwordHash,
          role: 'ADMIN',
        },
      });
      console.log(`✅ Bootstrap Admin created: ${username}`);
    }
  } else {
    console.log('ℹ️  Admin users already exist. Skipping bootstrap.');
  }

  // No demo employees, no records, no payouts.
  console.log('✅ System initialization completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
