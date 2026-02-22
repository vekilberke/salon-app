'use client';

import { useState, useEffect, useCallback } from 'react';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

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
    monthlyExpensesTotal: number;
    employeeStats: EmployeeStat[];
    recentRecords: any[];
}

interface Employee {
    id: string;
    displayName: string;
    active: boolean;
}

interface Service {
    id: string;
    name: string;
    defaultPrice: number;
    active: boolean;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [period, setPeriod] = useState('today');
    const [loading, setLoading] = useState(true);

    // Quick Entry state
    const [showQuickEntry, setShowQuickEntry] = useState(false);
    const [entryStep, setEntryStep] = useState<'selectEmployee' | 'entryForm' | 'success'>('selectEmployee');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        serviceCatalogId: '',
        customServiceName: '',
        quantity: 1,
        unitPrice: '' as string | number,
        discountAmount: 0,
        paymentMethod: 'cash',
        notes: '',
        dateTime: '',
    });
    const [finalPrice, setFinalPrice] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

    // Auto-calculate final price for quick entry
    useEffect(() => {
        const price = typeof formData.unitPrice === 'string' ? parseFloat(formData.unitPrice) || 0 : formData.unitPrice;
        const total = (formData.quantity * price) - formData.discountAmount;
        const rounded = Math.round(total * 100) / 100;
        setFinalPrice(Math.max(0, rounded));
    }, [formData.quantity, formData.unitPrice, formData.discountAmount]);

    // Fetch employees and services when modal opens
    const openQuickEntry = async () => {
        setShowQuickEntry(true);
        setEntryStep('selectEmployee');
        setSelectedEmployee(null);
        try {
            const [empRes, svcRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/services'),
            ]);
            const empData = await empRes.json();
            const svcData = await svcRes.json();
            setEmployees(Array.isArray(empData) ? empData.filter((e: Employee) => e.active) : []);
            setServices(Array.isArray(svcData) ? svcData.filter((s: Service) => s.active) : []);
        } catch (err) {
            console.error('Failed to fetch data for quick entry:', err);
        }
    };

    const selectEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setFormData({
            serviceCatalogId: '',
            customServiceName: '',
            quantity: 1,
            unitPrice: '',
            discountAmount: 0,
            paymentMethod: 'cash',
            notes: '',
            dateTime: '',
        });
        setEntryStep('entryForm');
    };

    const handleServiceChange = (serviceCatalogId: string) => {
        const svc = services.find(s => s.id === serviceCatalogId);
        setFormData({
            ...formData,
            serviceCatalogId,
            customServiceName: '',
            unitPrice: svc ? svc.defaultPrice : formData.unitPrice,
        });
    };

    const handleQuickEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting || !selectedEmployee) return;
        setSubmitting(true);

        const price = typeof formData.unitPrice === 'string' ? parseFloat(formData.unitPrice) || 0 : formData.unitPrice;
        try {
            const res = await fetch('/api/service-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee.id,
                    serviceCatalogId: formData.serviceCatalogId || null,
                    customServiceName: formData.customServiceName || null,
                    quantity: formData.quantity,
                    unitPrice: price,
                    discountAmount: formData.discountAmount,
                    finalPrice,
                    paymentMethod: formData.paymentMethod,
                    notes: formData.notes || null,
                    dateTime: formData.dateTime || null,
                    createdSource: 'ADMIN',
                }),
            });

            if (res.ok) {
                setEntryStep('success');
                setToast({ message: 'İşlem başarıyla kaydedildi ✓', type: 'success' });
                setTimeout(() => setToast(null), 3000);
                fetchData();
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Kayıt başarısız', type: 'error' });
                setTimeout(() => setToast(null), 3000);
            }
        } catch (err) {
            setToast({ message: 'Bir hata oluştu', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
        setSubmitting(false);
    };

    const closeQuickEntry = () => {
        setShowQuickEntry(false);
        setEntryStep('selectEmployee');
        setSelectedEmployee(null);
    };

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Yükleniyor...</div>
            </div>
        );
    }

    const sortedStats = [...data.employeeStats].sort((a, b) => b.grossRevenue - a.grossRevenue);

    return (
        <div>
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Dashboard</h2>
                    <p>Salon performans özeti</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                    <button
                        className="btn btn-primary"
                        onClick={openQuickEntry}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            marginLeft: '0.5rem',
                        }}
                        title="Hızlı İşlem Ekle"
                    >
                        +
                    </button>
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
                <StatCard
                    label="Aylık Gider"
                    value={formatCurrency(data.monthlyExpensesTotal)}
                    valueStyle={{
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                />
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

            {/* Quick Entry Modal */}
            <Modal isOpen={showQuickEntry} onClose={closeQuickEntry} title="Hızlı İşlem Ekle">
                <div style={{ padding: '1.5rem' }}>
                    {/* Employee Selection Step */}
                    {entryStep === 'selectEmployee' && (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>Çalışan seçiniz</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {employees.map((emp) => (
                                    <button
                                        key={emp.id}
                                        className="btn btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
                                        onClick={() => selectEmployee(emp)}
                                    >
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0,
                                        }}>
                                            {emp.displayName.charAt(0)}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{emp.displayName}</span>
                                    </button>
                                ))}
                                {employees.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Çalışan bulunamadı</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Entry Form Step */}
                    {entryStep === 'entryForm' && selectedEmployee && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.125rem', fontWeight: 700, color: 'white',
                                }}>
                                    {selectedEmployee.displayName.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{selectedEmployee.displayName}</div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEntryStep('selectEmployee')}
                                        style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                                    >
                                        Değiştir
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleQuickEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Hizmet</label>
                                    <select
                                        className="select"
                                        value={formData.serviceCatalogId}
                                        onChange={(e) => handleServiceChange(e.target.value)}
                                    >
                                        <option value="">Özel hizmet adı girin...</option>
                                        {services.map(svc => (
                                            <option key={svc.id} value={svc.id}>
                                                {svc.name} — {formatCurrency(svc.defaultPrice)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {!formData.serviceCatalogId && (
                                    <div className="form-group">
                                        <label className="label">Özel Hizmet Adı</label>
                                        <input
                                            className="input"
                                            value={formData.customServiceName}
                                            onChange={(e) => setFormData({ ...formData, customServiceName: e.target.value })}
                                            placeholder="Hizmet adını yazın"
                                            required={!formData.serviceCatalogId}
                                        />
                                    </div>
                                )}

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="label">Adet</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Birim Fiyat (₺)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="input"
                                            value={formData.unitPrice}
                                            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                            placeholder="Fiyat giriniz"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="label">İndirim (₺)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="input"
                                            value={formData.discountAmount}
                                            onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Ödeme Yöntemi</label>
                                        <select
                                            className="select"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            <option value="cash">💵 Nakit</option>
                                            <option value="card">💳 Kart</option>
                                            <option value="transfer">🏦 Havale/EFT</option>
                                            <option value="mixed">🔄 Karışık</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label">Tarih/Saat (opsiyonel)</label>
                                    <input
                                        type="datetime-local"
                                        className="input"
                                        value={formData.dateTime}
                                        onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label">Not (opsiyonel)</label>
                                    <input
                                        className="input"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Opsiyonel not..."
                                    />
                                </div>

                                {/* Final Price Display */}
                                <div style={{
                                    padding: '1rem',
                                    background: 'var(--bg-input)',
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center',
                                    border: '2px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        Toplam Tutar
                                    </div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: finalPrice > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                                        {formatCurrency(finalPrice)}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={submitting || finalPrice <= 0}
                                >
                                    {submitting ? 'Kaydediliyor...' : '✓ Kaydet'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Success Step */}
                    {entryStep === 'success' && selectedEmployee && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'var(--success-light)', border: '3px solid var(--success)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem', fontSize: '2.5rem',
                                animation: 'scaleIn 0.3s ease',
                            }}>
                                ✓
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                İşlem Kaydedildi!
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                {selectedEmployee.displayName} için işlem başarıyla oluşturuldu.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                                    setFormData({
                                        serviceCatalogId: '', customServiceName: '', quantity: 1,
                                        unitPrice: '', discountAmount: 0, paymentMethod: 'cash', notes: '', dateTime: '',
                                    });
                                    setEntryStep('entryForm');
                                }}>
                                    + Yeni İşlem Ekle
                                </button>
                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => {
                                    setEntryStep('selectEmployee');
                                    setSelectedEmployee(null);
                                }}>
                                    👤 Çalışan Değiştir
                                </button>
                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={closeQuickEntry}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
