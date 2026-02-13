'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Providers from '@/components/Providers';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/employees', label: 'Çalışanlar', icon: '👥' },
    { href: '/admin/services', label: 'Hizmetler', icon: '✂️' },
    { href: '/admin/records', label: 'İşlem Kayıtları', icon: '📋' },
    { href: '/admin/payouts', label: 'Ödemeler / Avans', icon: '💰' },
    { href: '/admin/reports', label: 'Raporlar', icon: '📈' },
    { href: '/admin/audit-log', label: 'İşlem Günlüğü', icon: '🔍' },
    { href: '/admin/settings', label: 'Ayarlar', icon: '⚙️' },
];

function AdminSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [salonName, setSalonName] = useState('');

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => setSalonName(data.salonName || 'Salon'))
            .catch(() => setSalonName('Salon'));
    }, []);

    // Listen for custom event when salon name changes in settings
    useEffect(() => {
        const handler = (e: CustomEvent) => setSalonName(e.detail);
        window.addEventListener('salonNameChanged', handler as EventListener);
        return () => window.removeEventListener('salonNameChanged', handler as EventListener);
    }, []);

    return (
        <>
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menü"
            >
                {mobileOpen ? '✕' : '☰'}
            </button>

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <h1>{salonName || 'Salon'}</h1>
                    <span>Yönetim Paneli</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => signOut({ callbackUrl: '/admin/login' })}
                        className="sidebar-link"
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span className="icon">🚪</span>
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    // Don't show sidebar on login page
    if (isLoginPage) {
        return (
            <Providers>
                {children}
            </Providers>
        );
    }

    return (
        <Providers>
            <div className="admin-layout">
                <AdminSidebar />
                <main className="main-content">{children}</main>
            </div>
        </Providers>
    );
}
