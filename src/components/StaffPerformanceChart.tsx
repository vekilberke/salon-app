'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ChartProps {
    data: any[];
}

export default function StaffPerformanceChart({ data }: ChartProps) {
    if (!data || data.length === 0) {
        return (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Veri yok
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 400 }}>
            {/* 
        Custom tooltip style due to Recharts default being white 
        and our app being dark mode 
      */}
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis
                        dataKey="name"
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="var(--text-secondary)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₺${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)',
                            borderRadius: '8px'
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        cursor={{ fill: 'var(--bg-card-hover)' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Kazanç" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payouts" name="Ödeme/Avans" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
