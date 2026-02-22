import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
        if (!settings) {
            return NextResponse.json({
                salonName: 'Salon',
                currency: 'TRY',
                timezone: 'Europe/Istanbul',
                entryScreenEnabled: true,
                entryPinEnabled: false,
                hasEntryPin: false,
            });
        }
        return NextResponse.json({
            ...settings,
            entryPinHash: undefined,
            hasEntryPin: !!settings.entryPinHash,
        });
    } catch (error: any) {
        console.error('Settings API Error:', error);
        // P2025: Record to update not found.
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Settings not initialized. Please run seed.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const admin = await requireAdmin();
        const body = await request.json();
        const before = await prisma.settings.findUnique({ where: { id: 'singleton' } });

        const data: any = {};
        if (body.salonName !== undefined) data.salonName = body.salonName;
        if (body.currency !== undefined) data.currency = body.currency;
        if (body.timezone !== undefined) data.timezone = body.timezone;
        if (body.entryScreenEnabled !== undefined) data.entryScreenEnabled = body.entryScreenEnabled;
        if (body.entryPinEnabled !== undefined) data.entryPinEnabled = body.entryPinEnabled;

        if (body.entryPin !== undefined) {
            if (body.entryPin === null || body.entryPin === '') {
                data.entryPinHash = null;
            } else {
                data.entryPinHash = await bcrypt.hash(String(body.entryPin), 10);
            }
        }

        // Logo: accept base64 data URL or null to clear
        if (body.salonLogoDataUrl !== undefined) {
            if (body.salonLogoDataUrl === null || body.salonLogoDataUrl === '') {
                data.salonLogoDataUrl = null;
            } else {
                const logo = String(body.salonLogoDataUrl);
                // Validate: must be data URL, max ~2.7MB (base64 of 2MB)
                if (!logo.startsWith('data:image/')) {
                    return NextResponse.json({ error: 'Invalid logo format' }, { status: 400 });
                }
                if (logo.length > 2_800_000) {
                    return NextResponse.json({ error: 'Logo too large (max 2MB)' }, { status: 400 });
                }
                data.salonLogoDataUrl = logo;
            }
        }

        const settings = await prisma.settings.upsert({
            where: { id: 'singleton' },
            update: data,
            create: { id: 'singleton', ...data },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'UPDATE',
            entityType: 'Settings',
            entityId: 'singleton',
            beforeJson: { ...before, entryPinHash: before?.entryPinHash ? '***' : null },
            afterJson: { ...settings, entryPinHash: settings.entryPinHash ? '***' : null },
        });

        return NextResponse.json({
            ...settings,
            entryPinHash: undefined,
            hasEntryPin: !!settings.entryPinHash,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
