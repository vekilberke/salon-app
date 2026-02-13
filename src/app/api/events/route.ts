import { NextResponse } from 'next/server';
import { salonEvents } from '@/lib/events';
import { getAdminSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getAdminSession();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const sendEvent = (data: any) => {
                const text = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(text));
            };

            // Send initial connection message
            sendEvent({ type: 'connected' });

            const onDashboardUpdate = () => {
                sendEvent({ type: 'dashboard-update', timestamp: Date.now() });
            };

            salonEvents.on('dashboard-update', onDashboardUpdate);

            // Keep connection alive with heartbeat
            const interval = setInterval(() => {
                sendEvent({ type: 'heartbeat' });
            }, 15000);

            request.signal.addEventListener('abort', () => {
                salonEvents.off('dashboard-update', onDashboardUpdate);
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
