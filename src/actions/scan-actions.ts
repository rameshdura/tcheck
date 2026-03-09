"use server";

import { supabase } from "@/lib/supabase";
import { redis } from "@/lib/redis";

export type ScanStatus = 'pending' | 'approved' | 'rejected';

export interface ScanRecord {
    id: string;
    qr_data: string;
    status: ScanStatus;
    user_id: string | null;
    created_at: string;
    updated_at: string;
}

export async function saveScan(qrData: string): Promise<{ success: boolean; data?: ScanRecord; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('scans')
            .insert([
                { qr_data: qrData, status: 'pending' }
            ])
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            return { success: false, error: error.message };
        }

        // Log to Redis and invalidate cache
        try {
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] NEW SCAN: ${qrData}`);
            // Keep only the last 100 logs
            await redis.ltrim('qr_scan_logs', 0, 99);

            // Invalidate cache if a new scan happens
            await redis.del('all_scans_cache');
        } catch (e) {
            console.error("Redis error:", e);
        }

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error saving scan:", err);
        return { success: false, error: "An unexpected error occurred while saving." };
    }
}

export async function updateScanStatus(id: string, status: ScanStatus): Promise<{ success: boolean; data?: ScanRecord; error?: string }> {
    try {
        // Log to Redis
        try {
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] QUEUED UPDATE: Scan ${id} marked as ${status.toUpperCase()}`);
            await redis.ltrim('qr_scan_logs', 0, 99);
        } catch (e) {
            console.error("Redis log error:", e);
        }

        // Update the cache if it exists
        const cachedData = await redis.get<ScanRecord[]>('all_scans_cache');
        let updatedScan: ScanRecord | undefined;

        if (cachedData) {
            const updatedCache = cachedData.map(scan => {
                if (scan.id === id) {
                    updatedScan = { ...scan, status };
                    return updatedScan;
                }
                return scan;
            });
            await redis.set('all_scans_cache', updatedCache);
        } else {
            // If cache doesn't exist, we can't easily update it in place without knowing the full record.
            // Ideally we'd fetch it, but it's okay, we just queue the update.
        }

        // Add to pending updates queue
        await redis.lpush('pending_status_updates', { id, status });

        // If we didn't have it in cache, we just return success without full data.
        return { success: true, data: updatedScan };
    } catch (err) {
        console.error("Unexpected error queueing scan status update:", err);
        return { success: false, error: "An unexpected error occurred while queueing update." };
    }
}

export async function getAllScans(): Promise<{ success: boolean; data?: ScanRecord[]; error?: string }> {
    try {
        // 1. Try fetching from Redis first
        const cachedData = await redis.get<ScanRecord[]>('all_scans_cache');
        if (cachedData) {
            console.log("Returning scans from Redis cache");
            return { success: true, data: cachedData };
        }

        // 2. Fetch from Supabase if not in cache
        console.log("Fetching scans from Supabase Database");
        const { data, error } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return { success: false, error: error.message };
        }

        // 3. Cache the full result in Redis (since the data is mostly fixed)
        if (data) {
            // Caching indefinitely, will be cleared/invalidated if an update happens
            await redis.set('all_scans_cache', data);
        }

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error fetching scans:", err);
        return { success: false, error: "An unexpected error occurred while fetching." };
    }
}

export async function forceCacheAll(): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return { success: false, error: error.message };
        }

        if (data) {
            await redis.set('all_scans_cache', data);

            // Log to Redis
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] ADMIN: Forced cache refresh from database.`);
            await redis.ltrim('qr_scan_logs', 0, 99);
        }

        return { success: true };
    } catch (err) {
        console.error("Unexpected error forcing cache:", err);
        return { success: false, error: "An unexpected error occurred while forcing cache." };
    }
}

export async function clearCache(): Promise<{ success: boolean; error?: string }> {
    try {
        await redis.del('all_scans_cache');

        // Log to Redis
        await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] ADMIN: Cache manually cleared.`);
        await redis.ltrim('qr_scan_logs', 0, 99);

        return { success: true };
    } catch (err) {
        console.error("Unexpected error clearing cache:", err);
        return { success: false, error: "An unexpected error occurred while clearing cache." };
    }
}

export async function syncCacheToDatabase(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        // Fetch pending updates
        const pendingUpdatesObj = await redis.lrange('pending_status_updates', 0, -1);
        if (!pendingUpdatesObj || pendingUpdatesObj.length === 0) {
            return { success: true, count: 0 };
        }

        let count = 0;
        const updatesMap = new Map<string, ScanStatus>();

        for (const item of pendingUpdatesObj) {
            let parsed;
            if (typeof item === 'string') {
                try { parsed = JSON.parse(item); } catch (e) { continue; }
            } else {
                parsed = item; // usually @upstash/redis auto-parses objects
            }

            if (parsed && typeof parsed === 'object' && parsed.id && parsed.status) {
                if (!updatesMap.has(parsed.id)) {
                    updatesMap.set(parsed.id, parsed.status);
                }
            }
        }

        for (const [id, status] of updatesMap.entries()) {
            const { error } = await supabase
                .from('scans')
                .update({ status })
                .eq('id', id);

            if (error) {
                console.error(`Failed to update ${id} to ${status}:`, error);
            } else {
                count++;
            }
        }

        // Log to Redis
        await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] ADMIN: Synced ${count} cached updates to Supabase.`);
        await redis.ltrim('qr_scan_logs', 0, 99);

        // Clear the pending updates list
        await redis.del('pending_status_updates');

        return { success: true, count };
    } catch (err) {
        console.error("Unexpected error syncing to database:", err);
        return { success: false, error: "An unexpected error occurred while syncing." };
    }
}
