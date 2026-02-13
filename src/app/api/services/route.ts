import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';

export async function GET() {
    try {
        const services = await prisma.serviceCatalog.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(services);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const body = await request.json();
        const { name, defaultPrice, durationMinutes, active = true } = body;

        if (!name?.trim() || defaultPrice == null) {
            return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
        }

        const service = await prisma.serviceCatalog.create({
            data: {
                name: name.trim(),
                defaultPrice: Number(defaultPrice),
                durationMinutes: durationMinutes ? Number(durationMinutes) : null,
                active,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'CREATE',
            entityType: 'ServiceCatalog',
            entityId: service.id,
            afterJson: service,
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
    }
}
