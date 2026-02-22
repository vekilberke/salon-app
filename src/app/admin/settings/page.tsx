'use client';

import { useState, useEffect, useCallback } from 'react';
import Toast from '@/components/Toast';

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const fetchSettings = useCallback(async () => {
        const res = await fetch('/api/settings');
        setSettings(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        const body: any = {
            salonName: settings.salonName,
            currency: settings.currency,
            timezone: settings.timezone,
            entryScreenEnabled: settings.entryScreenEnabled,
            entryPinEnabled: settings.entryPinEnabled,
            adminTabTitle: settings.adminTabTitle || null,
        };

        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        setSaving(false);
        setToast({ message: 'Ayarlar kaydedildi ✓', type: 'success' });
        // Notify sidebar of salon name change
        window.dispatchEvent(new CustomEvent('salonNameChanged', { detail: settings.salonName }));
        window.dispatchEvent(new CustomEvent('adminTabTitleChanged', { detail: settings.adminTabTitle || '' }));
    };

    const handleSetPin = async () => {
        if (!newPin || newPin.length < 4) {
            setToast({ message: 'PIN en az 4 karakter olmalıdır', type: 'error' });
            return;
        }

        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryPin: newPin }),
        });

        setNewPin('');
        setToast({ message: 'PIN güncellendi ✓', type: 'success' });
        fetchSettings();
    };

    const handleClearPin = async () => {
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryPin: null }),
        });

        setToast({ message: 'PIN silindi ✓', type: 'success' });
        fetchSettings();
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
            setToast({ message: 'Sadece PNG, JPG veya WebP yükleyebilirsiniz', type: 'error' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setToast({ message: 'Logo en fazla 2MB olabilir', type: 'error' });
            return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            setSettings({ ...settings, salonLogoDataUrl: dataUrl });
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salonLogoDataUrl: dataUrl }),
            });
            setToast({ message: 'Logo güncellendi ✓', type: 'success' });
            window.dispatchEvent(new CustomEvent('salonLogoChanged', { detail: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleLogoRemove = async () => {
        setSettings({ ...settings, salonLogoDataUrl: null });
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salonLogoDataUrl: null }),
        });
        setToast({ message: 'Logo silindi ✓', type: 'success' });
        window.dispatchEvent(new CustomEvent('salonLogoChanged', { detail: null }));
    };

    if (loading || !settings) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>;

    return (
        <div>
            <div className="page-header">
                <h2>Ayarlar</h2>
                <p>Salon ve sistem ayarları</p>
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* General Settings */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>🏪 Genel Ayarlar</h3>
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label className="label">Salon Adı</label>
                        <input className="input" value={settings.salonName} onChange={(e) => setSettings({ ...settings, salonName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Para Birimi</label>
                        <select className="select" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}>
                            <option value="TRY">TRY (₺)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Saat Dilimi</label>
                        <select className="select" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                            <option value="Europe/Istanbul">Europe/Istanbul</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Sekme Başlığı</label>
                        <input className="input" value={settings.adminTabTitle || ''} onChange={(e) => setSettings({ ...settings, adminTabTitle: e.target.value })} placeholder="Salon Yönetim Paneli" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tarayıcı sekmesinde görünen başlık</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>

            {/* Logo Settings */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>🖼️ Salon Logosu</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Yönetim paneli başlığında görünecek logo (PNG, JPG veya WebP, maks 2MB)
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {settings.salonLogoDataUrl ? (
                        <div style={{ position: 'relative' }}>
                            <img
                                src={settings.salonLogoDataUrl}
                                alt="Salon Logo"
                                style={{
                                    width: '80px', height: '80px', objectFit: 'cover',
                                    borderRadius: 'var(--radius-md)', border: '2px solid var(--border)',
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{
                            width: '80px', height: '80px', borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--border)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
                            fontSize: '2rem',
                        }}>
                            🏪
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            📤 {settings.salonLogoDataUrl ? 'Logo Değiştir' : 'Logo Yükle'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleLogoUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                        {settings.salonLogoDataUrl && (
                            <button className="btn btn-danger btn-sm" onClick={handleLogoRemove}>
                                🗑️ Kaldır
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Entry Screen Settings */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>📱 Giriş Ekranı Ayarları</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.entryScreenEnabled}
                            onChange={(e) => {
                                setSettings({ ...settings, entryScreenEnabled: e.target.checked });
                            }}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontWeight: 500 }}>Giriş Ekranı Aktif</span>
                    </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.entryPinEnabled}
                            onChange={(e) => {
                                setSettings({ ...settings, entryPinEnabled: e.target.checked });
                            }}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontWeight: 500 }}>Giriş PIN Koruması</span>
                    </label>
                    <span className={`badge ${settings.entryPinEnabled ? 'badge-success' : 'badge-danger'}`}>
                        {settings.entryPinEnabled ? 'Açık' : 'Kapalı'}
                    </span>
                </div>

                {settings.entryPinEnabled && (
                    <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                PIN Durumu: {settings.hasEntryPin ?
                                    <span className="badge badge-success">Ayarlanmış</span> :
                                    <span className="badge badge-warning">Ayarlanmamış</span>
                                }
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Yeni PIN</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value)}
                                    placeholder="En az 4 karakter"
                                    minLength={4}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleSetPin}>PIN Ayarla</button>
                            {settings.hasEntryPin && (
                                <button className="btn btn-danger" onClick={handleClearPin}>Sil</button>
                            )}
                        </div>
                    </div>
                )}

                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </div>
    );
}
