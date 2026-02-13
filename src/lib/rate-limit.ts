export class RateLimiter {
    private requests: Map<string, number[]>;
    private limit: number;
    private windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.requests = new Map();
        this.limit = limit;
        this.windowMs = windowMs;

        // Cleanup interval
        setInterval(() => this.cleanup(), 60000);
    }

    check(key: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(key) || [];

        // Filter out old requests
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

        if (validTimestamps.length >= this.limit) {
            return false;
        }

        validTimestamps.push(now);
        this.requests.set(key, validTimestamps);
        return true;
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, timestamps] of this.requests.entries()) {
            const valid = timestamps.filter(t => now - t < this.windowMs);
            if (valid.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, valid);
            }
        }
    }
}

// Global instance for PIN verification (5 attempts per minute)
export const pinRateLimiter = new RateLimiter(5, 60000);
