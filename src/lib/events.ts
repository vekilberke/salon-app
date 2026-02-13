import { EventEmitter } from 'events';

// Use globalThis to maintain the singleton instance across hot reloads in development
const globalForEvents = globalThis as unknown as { salonEvents: EventEmitter };

export const salonEvents = globalForEvents.salonEvents || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
    globalForEvents.salonEvents = salonEvents;
}
