import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);

        // Date filters
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const period = searchParams.get('period');

        const where: any = {};
        if (from && to) {
            where.dateTime = {
                gte: new Date(from + 'T00:00:00.000+03:00'),
                lte: new Date(to + 'T23:59:59.999+03:00'),
            };
        } else if (period && period !== 'all') {
            const now = new Date();
            const istanbulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
            if (period === 'week') {
                const dayOfWeek = istanbulNow.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const weekStart = new Date(istanbulNow);
                weekStart.setDate(weekStart.getDate() - diff);
                weekStart.setHours(0, 0, 0, 0);
                where.dateTime = { gte: weekStart };
            } else if (period === 'month') {
                const monthStart = new Date(istanbulNow.getFullYear(), istanbulNow.getMonth(), 1);
                where.dateTime = { gte: monthStart };
            }
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { dateTime: 'desc' },
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Genel Giderler');

        // Headers
        const headers = ['Tarih/Saat', 'Başlık', 'Kategori', 'Tutar', 'Not'];
        const headerRow = sheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE2E8F0' },
            };
        });

        // Freeze top row
        sheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Data rows
        for (const exp of expenses) {
            sheet.addRow([
                new Date(exp.dateTime).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
                exp.title,
                exp.category || '',
                exp.amount,
                exp.notes || '',
            ]);
        }

        // Column widths
        sheet.getColumn(1).width = 20;
        sheet.getColumn(2).width = 30;
        sheet.getColumn(3).width = 15;
        sheet.getColumn(4).width = 15;
        sheet.getColumn(5).width = 30;

        // Currency format for amount column
        sheet.getColumn(4).numFmt = '#,##0.00 ₺';

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer as ArrayBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="genel-giderler-${new Date().toISOString().slice(0, 10)}.xlsx"`,
            },
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to export expenses' }, { status: 500 });
    }
}
