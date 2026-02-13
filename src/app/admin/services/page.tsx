'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';

interface Service {
    id: string;
    name: string;
    defaultPrice: number;
    durationMinutes: number | null;
    active: boolean;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Service | null>(null);
    const [formData, setFormData] = useState({ name: '', defaultPrice: '', durationMinutes: '' });

    const fetchServices = useCallback(async () => {
        const res = await fetch('/api/services');
        setServices(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editing ? `/api/services/${editing.id}` : '/api/services';
        const method = editing ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.name,
                defaultPrice: parseFloat(formData.defaultPrice),
                durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
            }),
        });

        setShowModal(false);
        setEditing(null);
        setFormData({ name: '', defaultPrice: '', durationMinutes: '' });
        fetchServices();
    };

    const toggleActive = async (svc: Service) => {
        await fetch(`/api/services/${svc.id}`, {
            method: svc.active ? 'DELETE' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !svc.active }),
        });
        fetchServices();
    };

    const openEdit = (svc: Service) => {
        setEditing(svc);
        setFormData({
            name: svc.name,
            defaultPrice: String(svc.defaultPrice),
            durationMinutes: svc.durationMinutes ? String(svc.durationMinutes) : '',
        });
        setShowModal(true);
    };

    if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Hizmet Kataloğu</h2>
                    <p>Sunulan hizmetler ve fiyatları</p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setEditing(null);
                    setFormData({ name: '', defaultPrice: '', durationMinutes: '' });
                    setShowModal(true);
                }}>+ Yeni Hizmet</button>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Hizmet Adı</th>
                                <th>Fiyat</th>
                                <th>Süre (dk)</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((svc) => (
                                <tr key={svc.id}>
                                    <td style={{ fontWeight: 600 }}>{svc.name}</td>
                                    <td style={{ color: 'var(--success)' }}>{formatCurrency(svc.defaultPrice)}</td>
                                    <td>{svc.durationMinutes ? `${svc.durationMinutes} dk` : '-'}</td>
                                    <td>
                                        <span className={`badge ${svc.active ? 'badge-success' : 'badge-danger'}`}>
                                            {svc.active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(svc)}>Düzenle</button>
                                            <button
                                                className={`btn btn-sm ${svc.active ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => toggleActive(svc)}
                                            >
                                                {svc.active ? 'Deaktif' : 'Aktif Et'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Hizmet Düzenle' : 'Yeni Hizmet'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Hizmet Adı</label>
                            <input className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="label">Fiyat (₺)</label>
                                <input type="number" step="0.01" className="input" value={formData.defaultPrice} onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="label">Süre (dakika)</label>
                                <input type="number" className="input" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} placeholder="Opsiyonel" />
                            </div>
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
