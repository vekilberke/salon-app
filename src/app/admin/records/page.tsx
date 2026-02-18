'use client';

import { useState, useEffect, useCallback } from 'react';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export default function RecordsPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ employeeId: '', from: '', to: '' });

    // Pagination state
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 50;

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.employeeId) params.set('employeeId', filters.employeeId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());

        try {
            const [recRes, empRes] = await Promise.all([
                fetch(`/api/service-records?${params}`),
                fetch('/api/employees'),
            ]);

            const recData = await recRes.json();
            if (recData.items) {
                setRecords(recData.items);
                setTotal(recData.meta.total);
                setTotalPages(recData.meta.totalPages);
            } else {
                setRecords(recData); // Fallback if API not updated yet
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

        window.open(`/api/service-records?${params}`, '_blank');
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/service-records/${id}`, { method: 'DELETE' });
        fetchData();
    };

    return (
        <div>
            <div className="page-header">
                <h2>İşlem Kayıtları</h2>
                <p>Tüm hizmet kayıtlarını görüntüle ve yönet</p>
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

            <div className="card">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Tarih/Saat</th>
                                        <th>Çalışan</th>
                                        <th>Hizmet</th>
                                        <th>Adet</th>
                                        <th>Birim Fiyat</th>
                                        <th>İndirim</th>
                                        <th>Toplam</th>
                                        <th>Ödeme</th>
                                        <th>Kaynak</th>
                                        <th>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((rec: any) => (
                                        <tr key={rec.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(rec.dateTime).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td style={{ fontWeight: 500 }}>{rec.employee?.displayName}</td>
                                            <td>{rec.serviceCatalog?.name || rec.customServiceName || '-'}</td>
                                            <td>{rec.quantity}</td>
                                            <td>{formatCurrency(rec.unitPrice)}</td>
                                            <td>{rec.discountAmount > 0 ? formatCurrency(rec.discountAmount) : '-'}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(rec.finalPrice)}</td>
                                            <td>
                                                <span className="badge badge-info">{rec.paymentMethod === 'cash' ? 'Nakit' : rec.paymentMethod === 'card' ? 'Kart' : rec.paymentMethod}</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${rec.createdSource === 'ADMIN' ? 'badge-accent' : 'badge-info'}`}>
                                                    {rec.createdSource === 'ADMIN' ? 'Admin' : 'Giriş'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rec.id)}>Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Kayıt bulunamadı</td></tr>
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
        </div>
    );
}
