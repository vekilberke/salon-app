'use client';

import { useState, useEffect } from 'react';

export default function ReportsPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [filters, setFilters] = useState({ employeeId: '', from: '', to: '' });

    useEffect(() => {
        fetch('/api/employees').then(r => r.json()).then(setEmployees);
    }, []);

    const exportExcel = async (type: string) => {
        const params = new URLSearchParams();
        params.set('type', type);
        if (filters.employeeId) params.set('employeeId', filters.employeeId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);

        const res = await fetch(`/api/export/excel?${params}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salon-rapor-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportExpenses = async () => {
        const params = new URLSearchParams();
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);

        const res = await fetch(`/api/export/expenses?${params}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genel-giderler-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="page-header">
                <h2>Raporlar</h2>
                <p>Verileri Excel olarak dışa aktar</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Filtreler</h3>
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
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Hizmet Kayıtları</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Tüm hizmet işlem kayıtlarını Excel olarak indir
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => exportExcel('records')}>
                        📥 Excel İndir
                    </button>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ödeme Kayıtları</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Tüm avans ve ödeme kayıtlarını Excel olarak indir
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => exportExcel('payouts')}>
                        📥 Excel İndir
                    </button>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tüm Veriler</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Hem hizmet hem ödeme kayıtlarını tek dosyada indir
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => exportExcel('all')}>
                        📥 Excel İndir
                    </button>
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Genel Giderler</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Salon gider kayıtlarını Excel olarak indir
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                        ℹ️ Çalışan filtresi giderlerde uygulanmaz
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={exportExpenses}>
                        📥 Excel İndir
                    </button>
                </div>
            </div>
        </div>
    );
}
