import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { pinRateLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        if (!pinRateLimiter.check(ip)) {
            return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
        }

        const body = await request.json();
        const { pin } = body;

        if (!pin) {
            return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
        }

        const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

        if (!settings || !settings.entryPinEnabled) {
            // PIN is not enabled, always allow
            return NextResponse.json({ valid: true });
        }

        if (!settings.entryPinHash) {
            // No PIN set but feature enabled - allow
            return NextResponse.json({ valid: true });
        }

        const isValid = await bcrypt.compare(String(pin), settings.entryPinHash);
        return NextResponse.json({ valid: isValid });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 });
    }
}
