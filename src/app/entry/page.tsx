'use client';

import { useState, useEffect, useCallback } from 'react';
import Toast from '@/components/Toast';

interface Employee {
    id: string;
    displayName: string;
    active: boolean;
    sortOrder: number;
}

interface Service {
    id: string;
    name: string;
    defaultPrice: number;
    active: boolean;
}

interface Settings {
    entryPinEnabled: boolean;
    entryScreenEnabled: boolean;
    salonName: string;
    hasEntryPin: boolean;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

type Screen = 'pin' | 'selectEmployee' | 'entryForm' | 'success' | 'otherEmployee';

export default function EntryPage() {
    const [screen, setScreen] = useState<Screen>('selectEmployee');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [todayCount, setTodayCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // PIN state
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinVerified, setPinVerified] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        serviceCatalogId: '',
        customServiceName: '',
        quantity: 1,
        unitPrice: '' as string | number,
        discountAmount: 0,
        paymentMethod: 'cash',
        notes: '',
    });
    const [finalPrice, setFinalPrice] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Search for "Diğer" mode
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        const [empRes, svcRes, setRes] = await Promise.all([
            fetch('/api/employees'),
            fetch('/api/services'),
            fetch('/api/settings'),
        ]);
        const empData = await empRes.json();
        const svcData = await svcRes.json();
        const setData = await setRes.json();

        setEmployees(empData.filter((e: Employee) => e.active));
        setServices(svcData.filter((s: Service) => s.active));
        setSettings(setData);

        // Check if PIN is needed
        if (setData.entryPinEnabled && setData.hasEntryPin) {
            setScreen('pin');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-calculate final price
    useEffect(() => {
        const price = typeof formData.unitPrice === 'string' ? parseFloat(formData.unitPrice) || 0 : formData.unitPrice;
        const total = (formData.quantity * price) - formData.discountAmount;
        setFinalPrice(Math.max(0, total));
    }, [formData.quantity, formData.unitPrice, formData.discountAmount]);

    const verifyPin = async () => {
        setPinError('');
        const res = await fetch('/api/entry-pin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
        });
        const data = await res.json();
        if (data.valid) {
            setPinVerified(true);
            setScreen('selectEmployee');
        } else {
            setPinError('Geçersiz PIN');
        }
    };

    const selectEmployee = async (emp: Employee) => {
        setSelectedEmployee(emp);

        // Get today's count for this employee
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/service-records?employeeId=${emp.id}&from=${today}&to=${today}`);
        const records = await res.json();
        setTodayCount(Array.isArray(records) ? records.length : 0);

        // Reset form
        setFormData({
            serviceCatalogId: '',
            customServiceName: '',
            quantity: 1,
            unitPrice: '',
            discountAmount: 0,
            paymentMethod: 'cash',
            notes: '',
        });
        setScreen('entryForm');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        if (finalPrice < 0) return;

        setSubmitting(true);
        const price = typeof formData.unitPrice === 'string' ? parseFloat(formData.unitPrice) || 0 : formData.unitPrice;
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
                notes: formData.notes,
                createdSource: 'ENTRY_SCREEN',
            }),
        });

        setSubmitting(false);

        if (res.ok) {
            setTodayCount(prev => prev + 1);
            setScreen('success');
            showToast('İşlem başarıyla kaydedildi ✓', 'success');
        } else {
            const err = await res.json();
            showToast(err.error || 'Kayıt başarısız', 'error');
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleAddAnother = () => {
        setFormData({
            serviceCatalogId: '',
            customServiceName: '',
            quantity: 1,
            unitPrice: '',
            discountAmount: 0,
            paymentMethod: 'cash',
            notes: '',
        });
        setScreen('entryForm');
    };

    const handleChangeEmployee = () => {
        setSelectedEmployee(null);
        setScreen('selectEmployee');
    };

    if (loading) {
        return (
            <div className="entry-screen" style={{ justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✂️</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Yükleniyor...</div>
                </div>
            </div>
        );
    }

    // Quick-select employees: first 4 by sortOrder
    const quickEmployees = employees.slice(0, 4);
    const filteredOther = employees.filter(e =>
        e.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="entry-screen">
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* PIN Screen */}
            {screen === 'pin' && (
                <div className="pin-screen" style={{ background: 'transparent', width: '100%' }}>
                    <div className="pin-box">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            {settings?.salonName || 'Salon'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Giriş PIN kodunu giriniz</p>

                        <input
                            type="password"
                            className="pin-input"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
                            placeholder="• • • •"
                            maxLength={8}
                            autoFocus
                        />

                        {pinError && (
                            <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>{pinError}</div>
                        )}

                        <button className="btn btn-primary btn-xl" style={{ width: '100%', marginTop: '1.5rem' }} onClick={verifyPin}>
                            Giriş
                        </button>
                    </div>
                </div>
            )}

            {/* Employee Selection */}
            {screen === 'selectEmployee' && (
                <div style={{ width: '100%', maxWidth: '900px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '0.5rem',
                        }}>
                            ✂️ {settings?.salonName || 'Salon'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Çalışan seçiniz</p>
                    </div>

                    <div className="employee-grid">
                        {quickEmployees.map((emp) => (
                            <button
                                key={emp.id}
                                className="employee-btn"
                                onClick={() => selectEmployee(emp)}
                            >
                                <div className="avatar">{emp.displayName.charAt(0)}</div>
                                <div className="name">{emp.displayName}</div>
                            </button>
                        ))}

                        {employees.length > 4 && (
                            <button
                                className="employee-btn employee-btn-other"
                                onClick={() => {
                                    setSearchTerm('');
                                    setScreen('otherEmployee');
                                }}
                            >
                                <div className="avatar">+</div>
                                <div className="name">Diğer…</div>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Other Employee Search */}
            {screen === 'otherEmployee' && (
                <div style={{ width: '100%', maxWidth: '600px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Çalışan Ara</h2>
                    </div>

                    <input
                        className="input"
                        style={{ fontSize: '1.125rem', padding: '1rem', marginBottom: '1.5rem' }}
                        placeholder="İsim yazarak arayın..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredOther.map((emp) => (
                            <button
                                key={emp.id}
                                className="employee-btn"
                                style={{ flexDirection: 'row', minHeight: 'auto', padding: '1rem 1.5rem', justifyContent: 'flex-start' }}
                                onClick={() => selectEmployee(emp)}
                            >
                                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                    {emp.displayName.charAt(0)}
                                </div>
                                <div className="name" style={{ fontSize: '1rem' }}>{emp.displayName}</div>
                            </button>
                        ))}
                        {filteredOther.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Sonuç bulunamadı
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-secondary btn-lg"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        onClick={() => setScreen('selectEmployee')}
                    >
                        ← Geri
                    </button>
                </div>
            )}

            {/* Entry Form */}
            {screen === 'entryForm' && selectedEmployee && (
                <div style={{ width: '100%', maxWidth: '600px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.75rem', fontWeight: 700, color: 'white', margin: '0 auto 0.75rem',
                        }}>
                            {selectedEmployee.displayName.charAt(0)}
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedEmployee.displayName}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Bugün {todayCount} işlem girildi
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="card">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Service Selection */}
                            <div className="form-group">
                                <label className="label">Hizmet</label>
                                <select
                                    className="select"
                                    value={formData.serviceCatalogId}
                                    onChange={(e) => handleServiceChange(e.target.value)}
                                    style={{ fontSize: '1rem', padding: '0.75rem' }}
                                >
                                    <option value="">Özel hizmet adı girin...</option>
                                    {services.map(svc => (
                                        <option key={svc.id} value={svc.id}>
                                            {svc.name} — {formatCurrency(svc.defaultPrice)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Custom service name (if no catalog selected) */}
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

                            {/* Price Row */}
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

                            {/* Notes */}
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
                                padding: '1.25rem',
                                background: 'var(--bg-input)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                border: '2px solid var(--border)',
                            }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    Toplam Tutar
                                </div>
                                <div style={{
                                    fontSize: '2.25rem',
                                    fontWeight: 800,
                                    color: finalPrice > 0 ? '#4ade80' : 'var(--text-muted)',
                                }}>
                                    {formatCurrency(finalPrice)}
                                </div>
                            </div>


                            <button
                                type="submit"
                                className="btn btn-primary btn-xl"
                                style={{ width: '100%' }}
                                disabled={submitting || finalPrice <= 0}
                            >
                                {submitting ? 'Kaydediliyor...' : '✓ Kaydet'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={handleChangeEmployee}
                            >
                                ← Çalışan Değiştir
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Success Screen */}
            {screen === 'success' && selectedEmployee && (
                <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'var(--success-light)', border: '3px solid var(--success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem', fontSize: '3rem',
                        animation: 'scaleIn 0.3s ease',
                    }}>
                        ✓
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        İşlem Kaydedildi!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        {selectedEmployee.displayName} — Bugün toplam {todayCount} işlem
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn btn-primary btn-xl" style={{ width: '100%' }} onClick={handleAddAnother}>
                            + Yeni İşlem Ekle
                        </button>
                        <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={handleChangeEmployee}>
                            👤 Çalışan Değiştir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
