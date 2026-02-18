'use client';

import { useState, useEffect, useCallback } from 'react';
import StatCard from '@/components/StatCard';
import StaffPerformanceChart from '@/components/StaffPerformanceChart';

interface EmployeeStat {
    employee: { id: string; displayName: string };
    grossRevenue: number;
    visitCount: number;
    totalPayouts: number;
    netPosition: number;
}

interface DashboardData {
    period: string;
    totals: {
        totalRevenue: number;
        totalVisits: number;
        totalPayouts: number;
        totalNet: number;
    };
    employeeStats: EmployeeStat[];
    recentRecords: any[];
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [period, setPeriod] = useState('today');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard?period=${period}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
        setLoading(false);
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'dashboard-update') {
                    fetchData();
                }
            } catch (e) {
                console.error('SSE Error:', e);
            }
        };

        return () => {
            eventSource.close();
        };
    }, [fetchData]);

    // Auto-refresh every 30 seconds (fallback)
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(`/api/dashboard?period=${period}`)
                .then(res => res.json())
                .then(json => setData(json))
                .catch(() => { });
        }, 30000);
        return () => clearInterval(interval);
    }, [period]);

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Yükleniyor...</div>
            </div>
        );
    }

    const sortedStats = [...data.employeeStats].sort((a, b) => b.grossRevenue - a.grossRevenue);

    // Prepare chart data
    const chartData = sortedStats.map(s => ({
        name: s.employee.displayName,
        revenue: s.grossRevenue,
        payouts: s.totalPayouts
    }));

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Dashboard</h2>
                    <p>Salon performans özeti</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { value: 'today', label: 'Bugün' },
                        { value: 'week', label: 'Bu Hafta' },
                        { value: 'month', label: 'Bu Ay' },
                    ].map((p) => (
                        <button
                            key={p.value}
                            className={`btn ${period === p.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <StatCard
                    label="Toplam Gelir"
                    value={formatCurrency(data.totals.totalRevenue)}
                />
                <StatCard
                    label="Toplam İşlem"
                    value={data.totals.totalVisits}
                />
                <StatCard
                    label="Toplam Ödeme"
                    value={formatCurrency(data.totals.totalPayouts)}
                />
                <StatCard
                    label="Net Durum"
                    value={formatCurrency(data.totals.totalNet)}
                    valueStyle={{
                        background: data.totals.totalNet >= 0
                            ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                            : 'linear-gradient(135deg, #ef4444, #f87171)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                />
            </div>

            {/* Chart Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    📈 Performans Grafiği
                </h3>
                <StaffPerformanceChart data={chartData} />
            </div>

            {/* Leaderboard */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    🏆 Çalışan Performansı
                </h3>
                <div>
                    {sortedStats.map((stat, i) => (
                        <div key={stat.employee.id} className="leaderboard-row">
                            <div className={`leaderboard-rank ${i < 3 ? `rank-${i + 1}` : 'rank-other'}`}>
                                {i + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{stat.employee.displayName}</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                    {stat.visitCount} işlem
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                    {formatCurrency(stat.grossRevenue)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                <span
                                    className={`badge ${stat.netPosition >= 0 ? 'badge-success' : 'badge-danger'}`}
                                >
                                    Net: {formatCurrency(stat.netPosition)}
                                </span>
                            </div>
                        </div>
                    ))}
                    {sortedStats.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Bu dönem için veri bulunmuyor
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                    📋 Son İşlemler
                </h3>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Saat</th>
                                <th>Çalışan</th>
                                <th>Hizmet</th>
                                <th>Tutar</th>
                                <th>Kaynak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentRecords.map((rec: any) => (
                                <tr key={rec.id}>
                                    <td>{new Date(rec.dateTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td style={{ fontWeight: 500 }}>{rec.employee?.displayName}</td>
                                    <td>{rec.serviceCatalog?.name || rec.customServiceName || '-'}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(rec.finalPrice)}</td>
                                    <td>
                                        <span className={`badge ${rec.createdSource === 'ADMIN' ? 'badge-accent' : 'badge-info'}`}>
                                            {rec.createdSource === 'ADMIN' ? 'Admin' : 'Giriş'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.recentRecords.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Bu dönem için kayıt yok</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
