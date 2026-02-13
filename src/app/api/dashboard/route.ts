import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const period = searchParams.get('period') || 'today';

        // Calculate date range
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (from && to) {
            startDate = new Date(from);
            endDate = new Date(to + 'T23:59:59.999Z');
        } else {
            switch (period) {
                case 'week': {
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    startDate = new Date(now.getFullYear(), now.getMonth(), diff);
                    break;
                }
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default: // today
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }
        }

        // Get all active employees
        const employees = await prisma.employee.findMany({
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
        });

        // Get service records for each employee
        const employeeStats = await Promise.all(
            employees.map(async (emp) => {
                const records = await prisma.serviceRecord.findMany({
                    where: {
                        employeeId: emp.id,
                        deleted: false,
                        dateTime: { gte: startDate, lte: endDate },
                    },
                });

                const payouts = await prisma.payout.findMany({
                    where: {
                        employeeId: emp.id,
                        deleted: false,
                        dateTime: { gte: startDate, lte: endDate },
                    },
                });

                const grossRevenue = records.reduce((sum, r) => sum + r.finalPrice, 0);
                const visitCount = records.length;
                const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
                const netPosition = grossRevenue - totalPayouts;

                return {
                    employee: emp,
                    grossRevenue,
                    visitCount,
                    totalPayouts,
                    netPosition,
                };
            })
        );

        // Totals
        const totalRevenue = employeeStats.reduce((sum, s) => sum + s.grossRevenue, 0);
        const totalVisits = employeeStats.reduce((sum, s) => sum + s.visitCount, 0);
        const totalAllPayouts = employeeStats.reduce((sum, s) => sum + s.totalPayouts, 0);
        const totalNet = totalRevenue - totalAllPayouts;

        // Recent activity
        const recentRecords = await prisma.serviceRecord.findMany({
            where: { deleted: false, dateTime: { gte: startDate, lte: endDate } },
            include: { employee: true, serviceCatalog: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totals: { totalRevenue, totalVisits, totalPayouts: totalAllPayouts, totalNet },
            employeeStats,
            recentRecords,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
    }
}
