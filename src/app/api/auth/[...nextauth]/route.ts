import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                // Rate Limiting
                // Note: In NextAuth v4, `req` might be unavailable or different depending on adapter/strategy.
                // However, for CredentialsProvider, we can try to access headers if passed, 
                // but commonly we act on username/IP if available.
                // For this MVP, we will try to use a global limiter key based on username to prevent brute force on a specific account,
                // or if we can get IP, use that. NextAuth standard flow makes getting IP tricky inside authorize without advanced config.
                // We will limit by USERNAME to prevent brute force on the 'admin' account.

                if (credentials?.username) {
                    const { pinRateLimiter } = await import('@/lib/rate-limit');
                    // We use a prefix 'login:' to separate from PIN attempts
                    const limitKey = `login:${credentials.username}`;
                    if (!pinRateLimiter.check(limitKey)) {
                        throw new Error('Too many login attempts. Please wait.');
                    }
                }

                if (!credentials?.username || !credentials?.password) return null;
                const user = await prisma.adminUser.findUnique({
                    where: { username: credentials.username },
                });
                if (!user || !user.active) return null;
                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!isValid) return null;
                return { id: user.id, name: user.username, role: user.role };
            },
        }),
    ],
    session: { strategy: 'jwt' },
    pages: { signIn: '/admin/login' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.userId = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.userId;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET || 'salon-app-secret-key-change-in-production',
};

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    console.warn('⚠️  SECURITY WARNING: Using default NEXTAUTH_SECRET in production. Please set NEXTAUTH_SECRET environment variable.');
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
