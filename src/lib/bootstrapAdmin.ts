import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Ensures an admin user exists in the database.
 * If no admin user exists, it creates one using the environment variables
 * ADMIN_USERNAME (default: admin) and ADMIN_PASSWORD.
 * 
 * This function is idempotent and safe to call multiple times.
 */
export async function bootstrapAdmin() {
    try {
        // Check if any admin user exists
        const adminCount = await prisma.adminUser.count();

        if (adminCount > 0) {
            // Admin user already exists, nothing to do
            return;
        }

        console.log('No admin users found. Starting bootstrap process...');

        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD;

        if (!password) {
            console.error('❌ ADMIN_PASSWORD environment variable is not set. Cannot bootstrap admin user.');
            // We don't throw here to avoid crashing the app, but admin login won't work until fixed.
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.adminUser.create({
            data: {
                username,
                passwordHash,
                role: 'ADMIN',
                active: true,
            },
        });

        console.log(`✅ Admin user '${username}' created successfully.`);
    } catch (error) {
        console.error('❌ Error bootstrapping admin user:', error);
        // Don't rethrow, just log. Login will fail naturally if this failed.
    }
}
