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

        // Calculate date range (Istanbul Timezone)
        // Turkey is UTC+3 permanently.
        const now = new Date();
        const istanbulDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD

        let startDate: Date;
        let endDate: Date;

        if (from && to) {
            startDate = new Date(from);
            endDate = new Date(to + 'T23:59:59.999Z');
        } else {
            // Default: derive from Istanbul date
            // We construct ISO strings with +03:00 offset to ensure correct UTC conversion

            const currentIstanbulDate = new Date(istanbulDateStr + 'T00:00:00.000+03:00');
            endDate = new Date(istanbulDateStr + 'T23:59:59.999+03:00');

            switch (period) {
                case 'week': {
                    // Monday is start of week
                    const day = currentIstanbulDate.getDay(); // 0=Sun, 1=Mon...
                    const diff = currentIstanbulDate.getDate() - day + (day === 0 ? -6 : 1);
                    const weekStart = new Date(currentIstanbulDate);
                    weekStart.setDate(diff);
                    // Format back to YYYY-MM-DD to combine with offset
                    const weekStartStr = weekStart.toISOString().slice(0, 10);
                    startDate = new Date(weekStartStr + 'T00:00:00.000+03:00');
                    break;
                }
                case 'month':
                    startDate = new Date(istanbulDateStr.slice(0, 7) + '-01T00:00:00.000+03:00');
                    break;
                case 'year':
                    startDate = new Date(istanbulDateStr.slice(0, 4) + '-01-01T00:00:00.000+03:00');
                    break;
                default: // today
                    startDate = new Date(istanbulDateStr + 'T00:00:00.000+03:00');
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

        // Monthly expenses (always current month regardless of period)
        const monthStart = new Date(istanbulDateStr.slice(0, 7) + '-01T00:00:00.000+03:00');
        const monthEndStr = istanbulDateStr + 'T23:59:59.999+03:00';
        const monthlyExpenses = await prisma.expense.aggregate({
            where: {
                dateTime: { gte: monthStart, lte: new Date(monthEndStr) },
            },
            _sum: { amount: true },
        });

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totals: { totalRevenue, totalVisits, totalPayouts: totalAllPayouts, totalNet },
            monthlyExpensesTotal: monthlyExpenses._sum.amount || 0,
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
