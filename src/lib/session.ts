import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getAdminSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return {
        userId: (session.user as any).id as string,
        username: session.user.name as string,
        role: (session.user as any).role as string,
    };
}

export async function requireAdmin() {
    const admin = await getAdminSession();
    if (!admin) {
        throw new Error('Unauthorized');
    }
    return admin;
}
