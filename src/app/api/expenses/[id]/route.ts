import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;

        const expense = await prisma.expense.findUnique({ where: { id } });
        if (!expense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        await prisma.expense.delete({ where: { id } });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'DELETE',
            entityType: 'Expense',
            entityId: id,
            beforeJson: expense,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Failed to delete expense:', error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}
