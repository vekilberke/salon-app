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
    const source = searchParams.get('source');

    const where: any = { deleted: false };
    if (employeeId) where.employeeId = employeeId;
    if (source) where.createdSource = source;
    if (from || to) {
      where.dateTime = {};
      if (from) where.dateTime.gte = new Date(from);
      if (to) where.dateTime.lte = new Date(to + 'T23:59:59.999Z');
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { employee: true, serviceCatalog: true, customer: true },
      orderBy: { dateTime: 'desc' },
    });
    return NextResponse.json(records);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      dateTime,
      employeeId,
      customerId,
      serviceCatalogId,
      customServiceName,
      quantity = 1,
      unitPrice,
      discountAmount = 0,
      finalPrice,
      paymentMethod = 'cash',
      notes,
      createdSource = 'ENTRY_SCREEN',
    } = body;

    if (!employeeId || unitPrice == null || finalPrice == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roundedFinalPrice = Math.round(Number(finalPrice) * 100) / 100;
    const roundedUnitPrice = Math.round(Number(unitPrice) * 100) / 100;
    const roundedDiscount = Math.round(Number(discountAmount) * 100) / 100;

    if (roundedFinalPrice < 0) {
      return NextResponse.json({ error: 'Final price cannot be negative' }, { status: 400 });
    }

    const session = await getAdminSession();
    // Enforce createdSource: only admins can override it. Entry screen users are forced to 'ENTRY_SCREEN'
    const safeCreatedSource = session ? createdSource : 'ENTRY_SCREEN';

    // If source is ENTRY_SCREEN, restrict to today only (Istanbul time)
    if (safeCreatedSource === 'ENTRY_SCREEN' && dateTime) {
      const entryDate = new Date(dateTime);
      // Get current date in Istanbul
      const nowInIstanbul = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Istanbul' });
      const entryInIstanbul = entryDate.toLocaleDateString('en-US', { timeZone: 'Europe/Istanbul' });

      if (entryInIstanbul !== nowInIstanbul) {
        return NextResponse.json({ error: 'Entry screen can only create records for today' }, { status: 400 });
      }
    }

    // Duplicate Check (prevent double-submit)
    // Look for a record with same employee, price, and created in last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const duplicate = await prisma.serviceRecord.findFirst({
      where: {
        employeeId,
        finalPrice: roundedFinalPrice,
        createdAt: { gte: fiveSecondsAgo },
        createdSource: safeCreatedSource
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Duplicate transaction detected' }, { status: 409 });
    }

    const record = await prisma.serviceRecord.create({
      data: {
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        employeeId,
        customerId: customerId || null,
        serviceCatalogId: serviceCatalogId || null,
        customServiceName: customServiceName || null,
        quantity: Number(quantity),
        unitPrice: roundedUnitPrice,
        discountAmount: roundedDiscount,
        finalPrice: roundedFinalPrice,
        paymentMethod,
        notes: notes || null,
        createdSource: safeCreatedSource,
      },
    });

    await createAuditLog({
      actorType: session ? 'ADMIN' : 'ENTRY_SCREEN',
      actorId: session?.userId || null,
      action: 'CREATE',
      entityType: 'ServiceRecord',
      entityId: record.id,
      afterJson: record,
    });

    // Notify dashboard
    salonEvents.emit('dashboard-update');

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Failed to create service record:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}
