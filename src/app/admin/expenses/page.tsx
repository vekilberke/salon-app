'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

const CATEGORIES = ['Sarf', 'Kira', 'Bakım', 'Fatura', 'Diğer'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ title: '', category: '', amount: '', notes: '', dateTime: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (period === 'custom' && customFrom && customTo) {
            params.set('from', customFrom);
            params.set('to', customTo);
        } else {
            params.set('period', period);
        }
        params.set('page', page.toString());
        params.set('pageSize', '25');

        try {
            const res = await fetch(`/api/expenses?${params}`);
            const data = await res.json();
            setExpenses(data.items || []);
            setTotalPages(data.meta?.totalPages || 1);
            setTotal(data.meta?.total || 0);
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
        }
        setLoading(false);
    }, [period, customFrom, customTo, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [period, customFrom, customTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    category: form.category || null,
                    amount: parseFloat(form.amount),
                    notes: form.notes || null,
                    dateTime: form.dateTime || null,
                }),
            });

            if (res.ok) {
                setModalOpen(false);
                setForm({ title: '', category: '', amount: '', notes: '', dateTime: '' });
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || 'Gider eklenemedi');
            }
        } catch (err) {
            alert('Bir hata oluştu');
        }
        setSubmitting(false);
    };

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Genel Giderler</h2>
                    <p>Salon giderlerini kaydet ve takip et</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                    + Yeni Gider Ekle
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                        { value: 'week', label: 'Bu Hafta' },
                        { value: 'month', label: 'Bu Ay' },
                        { value: 'all', label: 'Tüm Zamanlar' },
                        { value: 'custom', label: 'Özel Tarih' },
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
                {period === 'custom' && (
                    <div className="form-grid" style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div className="form-group">
                            <label className="label">Başlangıç</label>
                            <input type="date" className="input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="label">Bitiş</label>
                            <input type="date" className="input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    {period === 'week' ? 'Bu Hafta' : period === 'month' ? 'Bu Ay' : period === 'all' ? 'Tüm Zamanlar' : 'Seçili Dönem'} Toplam Gider
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>
                    {formatCurrency(totalAmount)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {total} kayıt
                </div>
            </div>

            {/* Table */}
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
                                        <th>Başlık</th>
                                        <th>Kategori</th>
                                        <th>Tutar</th>
                                        <th>Not</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((exp) => (
                                        <tr key={exp.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(exp.dateTime).toLocaleString('tr-TR')}</td>
                                            <td style={{ fontWeight: 500 }}>{exp.title}</td>
                                            <td>
                                                {exp.category ? (
                                                    <span className="badge badge-info">{exp.category}</span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatCurrency(exp.amount)}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {exp.notes || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Gider kaydı bulunamadı</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Toplam {total} kayıt (Sayfa {page} / {totalPages})
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    ← Önceki
                                </button>
                                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    Sonraki →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add Expense Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Gider Ekle">
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="label">Başlık *</label>
                        <input
                            className="input"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Örn: Saç boyası"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Kategori</label>
                        <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                            <option value="">Seçiniz (opsiyonel)</option>
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Tutar (₺) *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Tarih</label>
                        <input
                            type="datetime-local"
                            className="input"
                            value={form.dateTime}
                            onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Not (opsiyonel)</label>
                        <input
                            className="input"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Opsiyonel açıklama..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting || !form.title || !form.amount}
                        style={{ width: '100%' }}
                    >
                        {submitting ? 'Kaydediliyor...' : '✓ Kaydet'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
