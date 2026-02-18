'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

const payoutTypes = [
    { value: 'advance', label: 'Avans' },
    { value: 'expense', label: 'Gider' },
    { value: 'bonus', label: 'Prim' },
    { value: 'other', label: 'Diğer' },
];

function getDateRange(period: string): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = today.toISOString().slice(0, 10);

    if (period === 'week') {
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return { from: monday.toISOString().slice(0, 10), to };
    }
    if (period === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: firstDay.toISOString().slice(0, 10), to };
    }
    // all time
    return { from: '', to: '' };
}

interface SummaryRow {
    employeeName: string;
    revenue: number;
    total: number;
}

export default function PayoutsPage() {
    const [payouts, setPayouts] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ employeeId: '', from: '', to: '' });
    const [formData, setFormData] = useState({
        employeeId: '', amount: '', type: 'advance', notes: '', dateTime: '',
    });

    // Pagination state
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 50;

    // Summary table state
    const [summaryPeriod, setSummaryPeriod] = useState('month');
    const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [summaryRevenue, setSummaryRevenue] = useState(0);
    const [summaryLoading, setSummaryLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.employeeId) params.set('employeeId', filters.employeeId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());

        try {
            const [payRes, empRes] = await Promise.all([
                fetch(`/api/payouts?${params}`),
                fetch('/api/employees'),
            ]);

            const payData = await payRes.json();
            if (payData.items) {
                setPayouts(payData.items);
                setTotal(payData.meta.total);
                setTotalPages(payData.meta.totalPages);
            } else {
                setPayouts(payData); // Fallback
            }

            const empData = await empRes.json();
            if (Array.isArray(empData)) {
                setEmployees(empData);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters.employeeId) params.set('employeeId', filters.employeeId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        params.set('export', 'excel');

        window.open(`/api/payouts?${params}`, '_blank');
    };

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const range = getDateRange(summaryPeriod);
            const payParams = new URLSearchParams();
            const recParams = new URLSearchParams();
            if (range.from) { payParams.set('from', range.from); recParams.set('from', range.from); }
            if (range.to) { payParams.set('to', range.to); recParams.set('to', range.to); }

            // Ensure we get all records for summary, or at least a large page if not implementing full aggregation endpoint yet
            // Ideally we should have a separate summary endpoint, but for now let's request a large page size for summary or handle pagination.
            // Actually, existing APIs support pagination. To get correct totals, we might need to fetch all or use a specific aggregation endpoint.
            // For now, let's assume we fetch a large batch or the API defaults.
            // Wait, the API defaults to 50. This summary will be wrong if we have > 50 items.
            // CORRECT FIX: We should probably export a 'getAll' or use a large pageSize for summary interactions if strictly client-side.
            // Let's set pageSize=1000 for summary purposes to stay simple for now.
            payParams.set('pageSize', '1000');
            recParams.set('pageSize', '1000');

            const [payRes, recRes] = await Promise.all([
                fetch(`/api/payouts?${payParams}`),
                fetch(`/api/service-records?${recParams}`),
            ]);
            const payData = await payRes.json();
            const recData = await recRes.json();

            const payItems = payData.items || (Array.isArray(payData) ? payData : []);
            const recItems = recData.items || (Array.isArray(recData) ? recData : []);

            // Aggregate by employee
            const empMap: Record<string, { employeeName: string; revenue: number; total: number }> = {};

            // Sum revenue from service records
            for (const r of recItems) {
                const empName = r.employee?.displayName || 'Bilinmeyen';
                if (!empMap[empName]) empMap[empName] = { employeeName: empName, revenue: 0, total: 0 };
                empMap[empName].revenue += r.finalPrice || 0;
            }

            // Sum payouts
            for (const p of payItems) {
                const empName = p.employee?.displayName || 'Bilinmeyen';
                if (!empMap[empName]) empMap[empName] = { employeeName: empName, revenue: 0, total: 0 };
                empMap[empName].total += p.amount;
            }

            const rows = Object.values(empMap).sort((a, b) => b.revenue - a.revenue);
            setSummaryData(rows);
            setSummaryTotal(rows.reduce((s, r) => s + r.total, 0));
            setSummaryRevenue(rows.reduce((s, r) => s + r.revenue, 0));
        } catch (error) {
            console.error('Summary fetch error:', error);
        } finally {
            setSummaryLoading(false);
        }
    }, [summaryPeriod]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'dashboard-update') {
                    fetchData();
                    fetchSummary();
                }
            } catch (e) {
                console.error('SSE Error:', e);
            }
        };

        return () => {
            eventSource.close();
        };
    }, [fetchData, fetchSummary]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
            fetchSummary();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchData, fetchSummary]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/payouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: formData.employeeId,
                amount: parseFloat(formData.amount),
                type: formData.type,
                notes: formData.notes,
                dateTime: formData.dateTime || undefined,
            }),
        });
        setShowModal(false);
        setFormData({ employeeId: '', amount: '', type: 'advance', notes: '', dateTime: '' });
        fetchData();
        fetchSummary();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/payouts/${id}`, { method: 'DELETE' });
        fetchData();
        fetchSummary();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Ödemeler / Avans</h2>
                    <p>Çalışan ödeme ve avans kayıtları</p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setFormData({ employeeId: employees[0]?.id || '', amount: '', type: 'advance', notes: '', dateTime: '' });
                    setShowModal(true);
                }}>+ Yeni Ödeme</button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="form-group">
                        <label className="label">Çalışan</label>
                        <select className="select" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
                            <option value="">Tümü</option>
                            {employees.map((emp: any) => (
                                <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Başlangıç</label>
                        <input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Bitiş</label>
                        <input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleExport()} style={{ width: '100%' }}>
                            Excel İndir
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Çalışan</th>
                                        <th>Tutar</th>
                                        <th>Tür</th>
                                        <th>Not</th>
                                        <th>Oluşturan</th>
                                        <th>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.dateTime).toLocaleDateString('tr-TR')}</td>
                                            <td style={{ fontWeight: 500 }}>{p.employee?.displayName}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{formatCurrency(p.amount)}</td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    {payoutTypes.find(t => t.value === p.type)?.label || p.type}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notes || '-'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{p.createdBy?.username || '-'}</td>
                                            <td>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {payouts.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Ödeme bulunamadı</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Toplam {total} kayıt (Sayfa {page} / {totalPages})
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    Önceki
                                </button>
                                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    Sonraki
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Employee Totals Summary */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                        📊 Çalışan Ödeme Özeti
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { value: 'week', label: 'Bu Hafta' },
                            { value: 'month', label: 'Bu Ay' },
                            { value: 'all', label: 'Tüm Zaman' },
                        ].map((p) => (
                            <button
                                key={p.value}
                                className={`btn ${summaryPeriod === p.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => setSummaryPeriod(p.value)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {summaryLoading ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Çalışan</th>
                                    <th style={{ textAlign: 'right' }}>Kazanç</th>
                                    <th style={{ textAlign: 'right' }}>Ödeme/Avans</th>
                                    <th style={{ textAlign: 'right' }}>Fark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 500 }}>{row.employeeName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                                            {formatCurrency(row.revenue)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--warning)' }}>
                                            {formatCurrency(row.total)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: (row.revenue - row.total) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {formatCurrency(row.revenue - row.total)}
                                        </td>
                                    </tr>
                                ))}
                                {summaryData.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Bu dönem için veri bulunamadı</td></tr>
                                )}
                            </tbody>
                            {summaryData.length > 0 && (
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                                        <td style={{ fontWeight: 700 }}>Genel Toplam</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: '1.125rem' }}>
                                            {formatCurrency(summaryRevenue)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--warning)', fontSize: '1.125rem' }}>
                                            {formatCurrency(summaryTotal)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: (summaryRevenue - summaryTotal) >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.125rem' }}>
                                            {formatCurrency(summaryRevenue - summaryTotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Yeni Ödeme / Avans"
            >
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Çalışan</label>
                            <select className="select" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} required>
                                <option value="">Seçiniz</option>
                                {employees.filter((e: any) => e.active).map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-grid" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Tutar (₺)</label>
                                <input type="number" step="0.01" min="0.01" className="input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="label">Tür</label>
                                <select className="select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    {payoutTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Tarih (opsiyonel)</label>
                            <input type="datetime-local" className="input" value={formData.dateTime} onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="label">Not</label>
                            <textarea className="textarea input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Opsiyonel not..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
