import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { sortOrder: 'asc' },
        });
        return NextResponse.json(employees);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const body = await request.json();
        const { displayName, active = true, sortOrder = 0 } = body;

        if (!displayName?.trim()) {
            return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
        }

        const employee = await prisma.employee.create({
            data: { displayName: displayName.trim(), active, sortOrder },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'CREATE',
            entityType: 'Employee',
            entityId: employee.id,
            afterJson: employee,
        });

        return NextResponse.json(employee, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
}
