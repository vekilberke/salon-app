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
        const type = searchParams.get('type') || 'records';

        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();

        if (type === 'records' || type === 'all') {
            const where: any = { deleted: false };
            if (employeeId) where.employeeId = employeeId;
            if (from || to) where.dateTime = dateFilter;

            const records = await prisma.serviceRecord.findMany({
                where,
                include: { employee: true, serviceCatalog: true, customer: true },
                orderBy: { dateTime: 'desc' },
            });

            const ws = workbook.addWorksheet('Hizmet Kayıtları');
            ws.columns = [
                { header: 'Tarih', key: 'date', width: 20 },
                { header: 'Çalışan', key: 'employee', width: 20 },
                { header: 'Müşteri', key: 'customer', width: 20 },
                { header: 'Hizmet', key: 'service', width: 25 },
                { header: 'Adet', key: 'quantity', width: 10 },
                { header: 'Birim Fiyat (₺)', key: 'unitPrice', width: 15 },
                { header: 'İndirim (₺)', key: 'discount', width: 15 },
                { header: 'Toplam (₺)', key: 'finalPrice', width: 15 },
                { header: 'Ödeme Yöntemi', key: 'payment', width: 15 },
                { header: 'Not', key: 'notes', width: 30 },
            ];

            // Style header row
            const headerRow = ws.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };

            // Freeze top row
            ws.views = [{ state: 'frozen', ySplit: 1 }];

            for (const r of records) {
                ws.addRow({
                    date: new Date(r.dateTime).toLocaleString('tr-TR'),
                    employee: r.employee.displayName,
                    customer: r.customer?.name || '-',
                    service: r.serviceCatalog?.name || r.customServiceName || '-',
                    quantity: r.quantity,
                    unitPrice: r.unitPrice,
                    discount: r.discountAmount,
                    finalPrice: r.finalPrice,
                    payment: r.paymentMethod === 'cash' ? 'Nakit' : r.paymentMethod === 'card' ? 'Kart' : r.paymentMethod === 'transfer' ? 'Havale/EFT' : r.paymentMethod,
                    notes: r.notes || '',
                });
            }

            // Format currency columns
            ['unitPrice', 'discount', 'finalPrice'].forEach(key => {
                const col = ws.getColumn(key);
                col.numFmt = '#,##0.00 ₺';
            });
        }

        if (type === 'payouts' || type === 'all') {
            const where: any = { deleted: false };
            if (employeeId) where.employeeId = employeeId;
            if (from || to) where.dateTime = dateFilter;

            const payouts = await prisma.payout.findMany({
                where,
                include: { employee: true },
                orderBy: { dateTime: 'desc' },
            });

            const ws = workbook.addWorksheet('Ödeme Kayıtları');
            ws.columns = [
                { header: 'Tarih', key: 'date', width: 20 },
                { header: 'Çalışan', key: 'employee', width: 20 },
                { header: 'Tutar (₺)', key: 'amount', width: 15 },
                { header: 'Tür', key: 'type', width: 15 },
                { header: 'Not', key: 'notes', width: 30 },
            ];

            const headerRow = ws.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };

            ws.views = [{ state: 'frozen', ySplit: 1 }];

            for (const p of payouts) {
                ws.addRow({
                    date: new Date(p.dateTime).toLocaleString('tr-TR'),
                    employee: p.employee.displayName,
                    amount: p.amount,
                    type: p.type === 'advance' ? 'Avans' : p.type === 'salary' ? 'Maaş' : p.type,
                    notes: p.notes || '',
                });
            }

            ws.getColumn('amount').numFmt = '#,##0.00 ₺';
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `salon-rapor-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Failed to export Excel:', error);
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }
}
