'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Providers from '@/components/Providers';

const DEFAULT_TAB_TITLE = 'Salon Yönetim Paneli';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/employees', label: 'Çalışanlar', icon: '👥' },
    { href: '/admin/services', label: 'Hizmetler', icon: '✂️' },
    { href: '/admin/records', label: 'İşlem Kayıtları', icon: '📋' },
    { href: '/admin/payouts', label: 'Ödemeler / Avans', icon: '💰' },
    { href: '/admin/expenses', label: 'Genel Giderler', icon: '💸' },
    { href: '/admin/reports', label: 'Raporlar', icon: '📈' },
    { href: '/admin/audit-log', label: 'İşlem Günlüğü', icon: '🔍' },
    { href: '/admin/settings', label: 'Ayarlar', icon: '⚙️' },
];

function AdminSidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [salonName, setSalonName] = useState('');
    const [salonLogo, setSalonLogo] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSalonName(data.salonName || 'Salon');
                setSalonLogo(data.salonLogoDataUrl || null);
                // Set tab title
                document.title = data.adminTabTitle || DEFAULT_TAB_TITLE;
            })
            .catch(() => setSalonName('Salon'));
    }, []);

    // Listen for custom event when salon name changes in settings
    useEffect(() => {
        const handler = (e: CustomEvent) => setSalonName(e.detail);
        window.addEventListener('salonNameChanged', handler as EventListener);
        return () => window.removeEventListener('salonNameChanged', handler as EventListener);
    }, []);

    // Listen for logo changes
    useEffect(() => {
        const handler = (e: CustomEvent) => setSalonLogo(e.detail);
        window.addEventListener('salonLogoChanged', handler as EventListener);
        return () => window.removeEventListener('salonLogoChanged', handler as EventListener);
    }, []);

    // Listen for tab title changes
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            document.title = e.detail || DEFAULT_TAB_TITLE;
        };
        window.addEventListener('adminTabTitleChanged', handler as EventListener);
        return () => window.removeEventListener('adminTabTitleChanged', handler as EventListener);
    }, []);

    // Generate initials for fallback avatar
    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '✂';
    };

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
                    <div className="brand-chip">
                        {salonLogo ? (
                            <img
                                src={salonLogo}
                                alt="Logo"
                                className="brand-chip-logo"
                            />
                        ) : (
                            <div className="brand-chip-fallback">
                                {getInitials(salonName || 'Salon')}
                            </div>
                        )}
                        <span className="brand-chip-name">{salonName || 'Salon'}</span>
                    </div>
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
