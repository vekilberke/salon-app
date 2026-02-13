import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/session';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        return NextResponse.json(employee);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const body = await request.json();
        const before = await prisma.employee.findUnique({ where: { id } });

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                displayName: body.displayName,
                active: body.active,
                sortOrder: body.sortOrder,
            },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'UPDATE',
            entityType: 'Employee',
            entityId: id,
            beforeJson: before,
            afterJson: employee,
        });

        return NextResponse.json(employee);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;
        const before = await prisma.employee.findUnique({ where: { id } });

        // Soft-delete: deactivate employee (preserves revenue data)
        const employee = await prisma.employee.update({
            where: { id },
            data: { active: false },
        });

        await createAuditLog({
            actorType: 'ADMIN',
            actorId: admin.userId,
            action: 'DEACTIVATE',
            entityType: 'Employee',
            entityId: id,
            beforeJson: before,
            afterJson: employee,
        });

        return NextResponse.json(employee);
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
}
