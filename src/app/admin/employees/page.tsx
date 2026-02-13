'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';

interface Employee {
    id: string;
    displayName: string;
    active: boolean;
    sortOrder: number;
    createdAt: string;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({ displayName: '', sortOrder: 0 });
    const [showInactive, setShowInactive] = useState(false);

    const fetchEmployees = useCallback(async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        setEmployees(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
        const method = editingEmployee ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        setShowModal(false);
        setEditingEmployee(null);
        setFormData({ displayName: '', sortOrder: 0 });
        fetchEmployees();
    };

    const handleDeactivate = async (emp: Employee) => {
        if (!confirm(`"${emp.displayName}" adlı çalışanı pasife almak istediğinize emin misiniz?`)) return;
        await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
        fetchEmployees();
    };

    const handleReactivate = async (emp: Employee) => {
        await fetch(`/api/employees/${emp.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...emp, active: true }),
        });
        fetchEmployees();
    };

    const openEdit = (emp: Employee) => {
        setEditingEmployee(emp);
        setFormData({ displayName: emp.displayName, sortOrder: emp.sortOrder });
        setShowModal(true);
    };

    const openNew = () => {
        setEditingEmployee(null);
        setFormData({ displayName: '', sortOrder: employees.length });
        setShowModal(true);
    };

    if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>;

    const activeEmployees = employees.filter(e => e.active);
    const inactiveEmployees = employees.filter(e => !e.active);

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Çalışanlar</h2>
                    <p>Çalışan listesi ve yönetimi</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}>+ Yeni Çalışan</button>
            </div>

            {/* Active Employees */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sıra</th>
                                <th>İsim</th>
                                <th>Durum</th>
                                <th>Eklenme</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeEmployees.map((emp) => (
                                <tr key={emp.id}>
                                    <td>{emp.sortOrder + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{emp.displayName}</td>
                                    <td>
                                        <span className="badge badge-success">Aktif</span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {new Date(emp.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}>Düzenle</button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeactivate(emp)}
                                            >
                                                Pasife Al
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {activeEmployees.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Aktif çalışan yok</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inactive Employees - Collapsible */}
            {inactiveEmployees.length > 0 && (
                <div className="card" style={{ opacity: showInactive ? 1 : 0.7, transition: 'opacity 0.2s' }}>
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.25rem 0',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                        }}
                    >
                        <span>
                            📦 Pasif Çalışanlar ({inactiveEmployees.length})
                        </span>
                        <span style={{
                            transform: showInactive ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                            fontSize: '1.25rem',
                        }}>
                            ▾
                        </span>
                    </button>

                    {showInactive && (
                        <div style={{ marginTop: '1rem' }}>
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>İsim</th>
                                            <th>Durum</th>
                                            <th>Eklenme</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inactiveEmployees.map((emp) => (
                                            <tr key={emp.id} style={{ opacity: 0.7 }}>
                                                <td style={{ fontWeight: 500 }}>{emp.displayName}</td>
                                                <td>
                                                    <span className="badge badge-danger">Pasif</span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>
                                                    {new Date(emp.createdAt).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleReactivate(emp)}
                                                    >
                                                        Aktif Et
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">İsim</label>
                            <input
                                className="input"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="Çalışan adı"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Sıra No</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.sortOrder}
                                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                            />
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
