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
        const before = await prisma.serviceRecord.findUnique({ where: { id } });

        const record = await prisma.serviceRecord.update({
            where: { id },
            data: {
                dateTime: body.dateTime ? new Date(body.dateTime) : undefined,
                employeeId: body.employeeId,
                serviceCatalogId: body.serviceCatalogId || null,
                customServiceName: body.customServiceName || null,
                quantity: body.quantity != null ? Number(body.quantity) : undefined,
                unitPrice: body.unitPrice != null ? Number(body.unitPrice) : undefined,
                discountAmount: body.discountAmount != null ? Number(body.discountAmount) : undefined,
                finalPrice: body.finalPrice != null ? Number(body.finalPrice) : undefined,
                paymentMethod: body.paymentMethod,
                notes: body.notes,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'UPDATE',
            entityType: 'ServiceRecord',
            entityId: id,
            beforeJson: before,
            afterJson: record,
        });

        return NextResponse.json(record);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const before = await prisma.serviceRecord.findUnique({ where: { id } });

        const record = await prisma.serviceRecord.update({
            where: { id },
            data: { deleted: true },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'SOFT_DELETE',
            entityType: 'ServiceRecord',
            entityId: id,
            beforeJson: before,
            afterJson: record,
        });

        return NextResponse.json(record);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
