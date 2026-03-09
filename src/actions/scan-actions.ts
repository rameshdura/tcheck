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
        const tempId = crypto.randomUUID();
        const now = new Date().toISOString();
        const newRecord: ScanRecord = {
            id: tempId,
            qr_data: qrData,
            status: 'pending',
            user_id: null,
            created_at: now,
            updated_at: now,
        };

        // Queue for background insertion
        try {
            await redis.lpush('pending_scan_inserts', newRecord);

            // Log to Redis
            await redis.lpush('qr_scan_logs', `[${now}] QUEUED INSERT: ${qrData}`);
            await redis.ltrim('qr_scan_logs', 0, 99);

            // Update cache immediately for "instant" feel
            const cachedData = await redis.get<ScanRecord[]>('all_scans_cache') || [];
            await redis.set('all_scans_cache', [newRecord, ...cachedData]);
        } catch (e) {
            console.error("Redis error in saveScan:", e);
        }

        return { success: true, data: newRecord };
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
        let count = 0;

        // Atomically fetch and clear pending lists using a pipeline to prevent 
        // duplicate insertions if the user clicks "Sync" multiple times quickly.
        const pipeline = redis.pipeline();
        pipeline.lrange('pending_scan_inserts', 0, -1);
        pipeline.del('pending_scan_inserts');
        pipeline.lrange('pending_status_updates', 0, -1);
        pipeline.del('pending_status_updates');

        const results = await pipeline.exec();

        // results[0] is the result of lrange 'pending_scan_inserts'
        // results[2] is the result of lrange 'pending_status_updates'
        const pendingInsertsObj = results[0] as unknown[];
        const pendingUpdatesObj = results[2] as unknown[];

        // 1. Process pending inserts
        if (pendingInsertsObj && pendingInsertsObj.length > 0) {
            const insertsToProcess: ScanRecord[] = [];

            for (const item of pendingInsertsObj) {
                let parsed;
                if (typeof item === 'string') {
                    try { parsed = JSON.parse(item); } catch (e) { continue; }
                } else {
                    parsed = item; // auto-parsed
                }

                if (parsed && typeof parsed === 'object' && parsed.id && parsed.qr_data) {
                    insertsToProcess.push(parsed as ScanRecord);
                }
            }

            if (insertsToProcess.length > 0) {
                // Reverse since lpush puts newest at index 0, we want to insert oldest first
                insertsToProcess.reverse();

                const { error } = await supabase
                    .from('scans')
                    .insert(insertsToProcess.map(scan => ({
                        id: scan.id,
                        qr_data: scan.qr_data,
                        status: scan.status,
                        user_id: scan.user_id,
                        created_at: scan.created_at,
                        updated_at: scan.updated_at
                    })));

                if (error) {
                    console.error("Failed to insert pending scans:", error);
                    // If it totally fails, we should ideally put it back in Redis,
                    // but for simplicity in this demo we might just lose the retry state
                    // Let's at least push them back so they aren't lost completely.
                    const restorePipeline = redis.pipeline();
                    for (const item of insertsToProcess) {
                        restorePipeline.lpush('pending_scan_inserts', item);
                    }
                    await restorePipeline.exec();
                    return { success: false, error: "Database error during insert sync." };
                } else {
                    count += insertsToProcess.length;
                }
            }
        }

        // 2. Process pending updates
        if (pendingUpdatesObj && pendingUpdatesObj.length > 0) {
            const updatesMap = new Map<string, ScanStatus>();

            for (const item of pendingUpdatesObj) {
                let parsed;
                if (typeof item === 'string') {
                    try { parsed = JSON.parse(item); } catch (e) { continue; }
                } else {
                    parsed = item; // auto-parsed
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
        }

        if (count > 0) {
            // Log to Redis
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] ADMIN: Synced ${count} cached operations to Supabase.`);
            await redis.ltrim('qr_scan_logs', 0, 99);
        }

        return { success: true, count };
    } catch (err) {
        console.error("Unexpected error syncing to database:", err);
        return { success: false, error: "An unexpected error occurred while syncing." };
    }
}

// NEW Paginatable Fetcher for the new 'tkt' table
export interface TicketRecord {
    id: string;
    qr: string;
    name: string;
    typeid: string;
    type: number;
    created: string;
    userid: string;
    transactionid: string;
    valid: number;
    vendor: number;
}

export async function getPaginatedTickets(page: number, limit: number = 10): Promise<{ success: boolean; data?: TicketRecord[]; count?: number; error?: string }> {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('tkt')
            .select('*', { count: 'exact' })
            .order('created', { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Supabase paginated fetch error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data as TicketRecord[], count: count || 0 };
    } catch (err) {
        console.error("Unexpected error fetching paginated tickets:", err);
        return { success: false, error: "An unexpected error occurred while fetching." };
    }
}
