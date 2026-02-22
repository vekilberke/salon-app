import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin();
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'month';
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '25');

        const where: any = {};

        if (from && to) {
            where.dateTime = {
                gte: new Date(from),
                lte: new Date(to + 'T23:59:59.999Z'),
            };
        } else {
            const now = new Date();
            const istanbulDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

            if (period === 'week') {
                const currentDate = new Date(istanbulDateStr + 'T00:00:00.000+03:00');
                const day = currentDate.getDay();
                const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
                const weekStart = new Date(currentDate);
                weekStart.setDate(diff);
                const weekStartStr = weekStart.toISOString().slice(0, 10);
                where.dateTime = {
                    gte: new Date(weekStartStr + 'T00:00:00.000+03:00'),
                    lte: new Date(istanbulDateStr + 'T23:59:59.999+03:00'),
                };
            } else if (period === 'month') {
                where.dateTime = {
                    gte: new Date(istanbulDateStr.slice(0, 7) + '-01T00:00:00.000+03:00'),
                    lte: new Date(istanbulDateStr + 'T23:59:59.999+03:00'),
                };
            }
            // period === 'all' — no date filter
        }

        const [items, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                orderBy: { dateTime: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.expense.count({ where }),
        ]);

        return NextResponse.json({
            items,
            meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const body = await request.json();
        const { dateTime, title, category, amount, notes } = body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            return NextResponse.json({ error: 'Tutar sıfır veya pozitif olmalıdır' }, { status: 400 });
        }

        const roundedAmount = Math.round(numAmount * 100) / 100;

        const expense = await prisma.expense.create({
            data: {
                dateTime: dateTime ? new Date(dateTime) : new Date(),
                title: title.trim(),
                category: category?.trim() || null,
                amount: roundedAmount,
                notes: notes?.trim() || null,
                createdBy: admin.username,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'CREATE',
            entityType: 'Expense',
            entityId: expense.id,
            afterJson: expense,
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Failed to create expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
