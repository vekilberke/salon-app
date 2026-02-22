'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/audit-log?page=${page}&limit=25`);
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
    }, [page]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const actionLabels: Record<string, string> = {
        CREATE: 'Oluşturma',
        UPDATE: 'Güncelleme',
        SOFT_DELETE: 'Silme',
        SEED: 'Başlangıç Verisi',
    };

    return (
        <div>
            <div className="page-header">
                <h2>İşlem Günlüğü</h2>
                <p>Tüm sistem işlemlerinin kaydı</p>
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
                                        <th>Kaynak</th>
                                        <th>İşlem</th>
                                        <th>Varlık</th>
                                        <th>Detay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log: any) => (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                                            <td>
                                                <span className={`badge ${log.actorType === 'ADMIN' ? 'badge-accent' : 'badge-info'}`}>
                                                    {log.actorType === 'ADMIN' ? 'Admin' : 'Giriş Ekranı'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${log.action === 'CREATE' ? 'badge-success' : log.action === 'SOFT_DELETE' ? 'badge-danger' : 'badge-warning'}`}>
                                                    {actionLabels[log.action] || log.action}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{log.entityType}</td>
                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                {log.afterJson ? JSON.stringify(JSON.parse(log.afterJson)).slice(0, 100) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Günlük kaydı bulunamadı</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Önceki</button>
                                <span style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki →</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
