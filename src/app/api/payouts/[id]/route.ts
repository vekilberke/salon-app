import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const before = await prisma.payout.findUnique({ where: { id } });

        const payout = await prisma.payout.update({
            where: { id },
            data: { deleted: true },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'SOFT_DELETE',
            entityType: 'Payout',
            entityId: id,
            beforeJson: before,
            afterJson: payout,
        });

        return NextResponse.json(payout);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to delete payout' }, { status: 500 });
    }
}
