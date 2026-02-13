import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const employeeId = searchParams.get('employeeId');
        const type = searchParams.get('type') || 'records'; // records | payouts | all

        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

        let csv = '';

        if (type === 'records' || type === 'all') {
            const where: any = { deleted: false };
            if (employeeId) where.employeeId = employeeId;
            if (from || to) where.dateTime = dateFilter;

            const records = await prisma.serviceRecord.findMany({
                where,
                include: { employee: true, serviceCatalog: true },
                orderBy: { dateTime: 'desc' },
            });

            csv += 'Tarih,Çalışan,Hizmet,Adet,Birim Fiyat,İndirim,Toplam,Ödeme Yöntemi,Not\n';
            for (const r of records) {
                const serviceName = r.serviceCatalog?.name || r.customServiceName || '-';
                const date = new Date(r.dateTime).toLocaleString('tr-TR');
                csv += `"${date}","${r.employee.displayName}","${serviceName}",${r.quantity},${r.unitPrice},${r.discountAmount},${r.finalPrice},"${r.paymentMethod}","${r.notes || ''}"\n`;
            }
        }

        if (type === 'payouts' || type === 'all') {
            if (type === 'all') csv += '\n';

            const where: any = { deleted: false };
            if (employeeId) where.employeeId = employeeId;
            if (from || to) where.dateTime = dateFilter;

            const payouts = await prisma.payout.findMany({
                where,
                include: { employee: true },
                orderBy: { dateTime: 'desc' },
            });

            csv += 'Tarih,Çalışan,Tutar,Tür,Not\n';
            for (const p of payouts) {
                const date = new Date(p.dateTime).toLocaleString('tr-TR');
                csv += `"${date}","${p.employee.displayName}",${p.amount},"${p.type}","${p.notes || ''}"\n`;
            }
        }

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="salon-export-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }
}
