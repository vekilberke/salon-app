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
        const type = searchParams.get('type');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '50');
        const isExport = searchParams.get('export') === 'excel';

        const where: any = { deleted: false };
        if (employeeId) where.employeeId = employeeId;
        if (type) where.type = type;
        if (from || to) {
            where.dateTime = {};
            if (from) where.dateTime.gte = new Date(from);
            if (to) where.dateTime.lte = new Date(to + 'T23:59:59.999Z');
        }

        // Export Logic
        if (isExport) {
            const payouts = await prisma.payout.findMany({
                where,
                include: { employee: true, createdBy: { select: { username: true } } },
                orderBy: { dateTime: 'desc' },
            });

            const ExcelJS = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Payouts');

            worksheet.columns = [
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Employee', key: 'employee', width: 20 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Notes', key: 'notes', width: 30 },
                { header: 'Created By', key: 'admin', width: 15 },
            ];

            worksheet.getRow(1).font = { bold: true };

            payouts.forEach(p => {
                worksheet.addRow({
                    date: new Date(p.dateTime).toLocaleString('tr-TR'),
                    employee: p.employee.displayName,
                    amount: p.amount,
                    type: p.type,
                    notes: p.notes || '',
                    admin: p.createdBy.username
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="payouts-${new Date().toISOString().slice(0, 10)}.xlsx"`
                }
            });
        }

        // Pagination Logic
        const total = await prisma.payout.count({ where });
        const payouts = await prisma.payout.findMany({
            where,
            include: { employee: true, createdBy: { select: { username: true } } },
            orderBy: { dateTime: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });

        return NextResponse.json({
            items: payouts,
            meta: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
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
