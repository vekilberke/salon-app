import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect /admin routes (except login page and api auth)
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET || 'salon-app-secret-key-change-in-production',
        });

        if (!token) {
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
