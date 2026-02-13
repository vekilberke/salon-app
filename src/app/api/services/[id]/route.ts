import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const body = await request.json();
        const before = await prisma.serviceCatalog.findUnique({ where: { id } });

        const service = await prisma.serviceCatalog.update({
            where: { id },
            data: {
                name: body.name,
                defaultPrice: body.defaultPrice != null ? Number(body.defaultPrice) : undefined,
                durationMinutes: body.durationMinutes !== undefined ? (body.durationMinutes ? Number(body.durationMinutes) : null) : undefined,
                active: body.active,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'UPDATE',
            entityType: 'ServiceCatalog',
            entityId: id,
            beforeJson: before,
            afterJson: service,
        });

        return NextResponse.json(service);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const before = await prisma.serviceCatalog.findUnique({ where: { id } });

        const service = await prisma.serviceCatalog.update({
            where: { id },
            data: { active: false },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'SOFT_DELETE',
            entityType: 'ServiceCatalog',
            entityId: id,
            beforeJson: before,
            afterJson: service,
        });

        return NextResponse.json(service);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
    }
}
