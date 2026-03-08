import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
    try {
        // Upstash Redis lrange to get the last 50 logs of our list
        const logs = await redis.lrange('qr_scan_logs', 0, 50);
        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("Redis fetch error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch Redis logs" }, { status: 500 });
    }
}
