'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bg = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: bg,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            fontWeight: 500,
        }}>
            <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{message}</span>
        </div>
    );
}
