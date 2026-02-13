import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getAdminSession, requireAdmin } from '@/lib/session';
import { salonEvents } from '@/lib/events';

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const type = searchParams.get('type');

        const where: any = { deleted: false };
        if (employeeId) where.employeeId = employeeId;
        if (type) where.type = type;
        if (from || to) {
            where.dateTime = {};
            if (from) where.dateTime.gte = new Date(from);
            if (to) where.dateTime.lte = new Date(to + 'T23:59:59.999Z');
        }

        const payouts = await prisma.payout.findMany({
            where,
            include: { employee: true, createdBy: { select: { username: true } } },
            orderBy: { dateTime: 'desc' },
        });
        return NextResponse.json(payouts);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const body = await request.json();
        const { dateTime, employeeId, amount, type = 'advance', notes } = body;

        if (!employeeId || amount == null || Number(amount) <= 0) {
            return NextResponse.json({ error: 'Valid employee and positive amount required' }, { status: 400 });
        }

        const payout = await prisma.payout.create({
            data: {
                dateTime: dateTime ? new Date(dateTime) : new Date(),
                employeeId,
                amount: Number(amount),
                type,
                notes: notes || null,
                createdByAdminId: admin.userId,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'CREATE',
            entityType: 'Payout',
            entityId: payout.id,
            afterJson: payout,
        });

        // Notify dashboard
        salonEvents.emit('dashboard-update');

        return NextResponse.json(payout, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 });
    }
}
