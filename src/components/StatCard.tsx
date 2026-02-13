'use client';

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    valueStyle?: React.CSSProperties;
    className?: string;
}

export default function StatCard({ label, value, icon, trend, trendValue, valueStyle, className = '' }: StatCardProps) {
    return (
        <div className={`stat-card ${className}`}>
            {icon && <div className="stat-icon">{icon}</div>}
            <div className="stat-value" style={valueStyle}>{value}</div>
            <div className="stat-label">{label}</div>
            {trend && trendValue && (
                <div className={`stat-trend ${trend}`}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
                </div>
            )}
        </div>
    );
}
