"use server";

import { supabase } from "@/lib/supabase";
import { redis } from "@/lib/redis";
import { getTypeName, getVendorName } from "@/lib/ticket-types";

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
    phone?: string;
    typeid: string;
    type: number;
    created: string;
    userid: string;
    transactionid: string;
    valid: number;
    vendor: number;
    updated_at?: string;
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

export async function getTicketDetails(qr: string): Promise<{ success: boolean; data?: TicketRecord; error?: string }> {
    if (!qr) return { success: false, error: "QR code is required." };

    try {
        const { data, error } = await supabase
            .from('tkt')
            .select('*')
            .eq('qr', qr)
            .single();

        if (error) {
            console.error("Error fetching ticket details:", error);
            // If it's a "no rows found" error, return a specific message
            if (error.code === 'PGRST116') {
                return { success: false, error: "Ticket not found in database." };
            }
            return { success: false, error: "Failed to fetch ticket from database." };
        }

        return { success: true, data: data as TicketRecord };
    } catch (err) {
        console.error("Unexpected error fetching ticket details:", err);
        return { success: false, error: "An unexpected error occurred." };
    }
}

// ---------------------------------------------------------
// NEW REDIS-BASED VALIDATION LOGIC
// ---------------------------------------------------------

export interface ValidationSummary {
    total: number;
    validCount: number;
    invalidCount: number;
    notFoundCount: number;
    types: Record<string, number>;
}

export interface TicketValidationResult {
    qr: string;
    status: 'VALID' | 'USED' | 'NOT_FOUND' | 'ERROR';
    type?: string;
    vendor?: string;
}


export async function validateTicketsBulk(stagedQRs: string[]): Promise<{ success: boolean; results?: TicketValidationResult[]; summary?: ValidationSummary; error?: string }> {
    if (!stagedQRs || stagedQRs.length === 0) {
        return { success: false, error: "No QR codes provided to validate." };
    }

    try {
        const pipeline = redis.pipeline();
        for (const qr of stagedQRs) {
            pipeline.get(`ticket:${qr}`);
        }

        const redisResults = await pipeline.exec();
        const validationResults: TicketValidationResult[] = [];
        const updatePipeline = redis.pipeline();

        const summary: ValidationSummary = {
            total: stagedQRs.length,
            validCount: 0,
            invalidCount: 0,
            notFoundCount: 0,
            types: {} // e.g {"VIP": 2, "STANDARD": 1}
        };

        const pendingUpdates: string[] = [];

        for (let i = 0; i < stagedQRs.length; i++) {
            const qr = stagedQRs[i];
            const rawRedisResult = redisResults[i] as unknown;

            if (!rawRedisResult) {
                // Key doesn't exist
                validationResults.push({ qr, status: 'NOT_FOUND' });
                summary.notFoundCount++;
                continue;
            }

            let ticketData;
            if (typeof rawRedisResult === 'string') {
                try { ticketData = JSON.parse(rawRedisResult); } catch (e) { /* ignore */ }
            } else {
                ticketData = rawRedisResult;
            }

            if (!ticketData) {
                validationResults.push({ qr, status: 'ERROR' });
                summary.invalidCount++;
                continue;
            }

            const typeName = getTypeName(ticketData.type);
            const vendorName = getVendorName(ticketData.vendor);

            if (ticketData.valid === 1) {
                // Ticket is valid and unused! Mark as used.
                validationResults.push({ qr, status: 'VALID', type: typeName, vendor: vendorName });
                summary.validCount++;

                // Track type count for the summary phrasing
                if (!summary.types[typeName]) summary.types[typeName] = 0;
                summary.types[typeName]++;

                // 1. Update Redis instantly so it can't be scanned again
                ticketData.valid = 0;

                // Add timestamp
                const checkedTime = new Date().toISOString();
                ticketData.updated_at = checkedTime;

                // Preserve expiration - we assume it has one, for simplicity we'll set it to 24h if we overwrite
                updatePipeline.set(`ticket:${qr}`, JSON.stringify(ticketData), { ex: 24 * 60 * 60 });

                // 2. Queue for database sync later, passing both qr and checked time
                pendingUpdates.push(JSON.stringify({ qr, checked_time: checkedTime }));

            } else {
                // Ticket exists but is already marked as valid=0 (used)
                validationResults.push({ qr, status: 'USED', type: typeName, vendor: vendorName });
                summary.invalidCount++;
            }
        }

        // Execute any instant redis updates and queueing together
        if (pendingUpdates.length > 0) {
            // Push to the queue that the master DB sync function will read, on the same pipeline
            for (const updateStr of pendingUpdates) {
                updatePipeline.lpush('pending_ticket_updates', updateStr);
            }
            // One single round-trip for all cache updates AND queueing!
            await updatePipeline.exec();
        }

        return { success: true, results: validationResults, summary };

    } catch (err) {
        console.error("Error during bulk validation:", err);
        return { success: false, error: "An error occurred while validating tickets via Redis." };
    }
}

export async function syncTicketsToDatabase(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const pipeline = redis.pipeline();
        pipeline.lrange('pending_ticket_updates', 0, -1);
        pipeline.del('pending_ticket_updates');

        const results = await pipeline.exec();
        const pendingUpdates = results[0] as string[];

        if (!pendingUpdates || pendingUpdates.length === 0) {
            return { success: true, count: 0 };
        }

        // Parse and deduplicate (keeping the latest timestamp for each QR if there happens to be multiple)
        const updateMap = new Map<string, string>();
        for (const item of pendingUpdates) {
            let parsed;
            if (typeof item === 'string') {
                try {
                    parsed = JSON.parse(item);
                } catch (e) {
                    // Fallback for old simple string QR items still in queue
                    updateMap.set(item, new Date().toISOString());
                    continue;
                }
            } else {
                parsed = item; // auto-parsed by upstash-redis sometimes
            }

            if (parsed && typeof parsed === 'object' && parsed.qr) {
                updateMap.set(parsed.qr, parsed.checked_time || new Date().toISOString());
            } else if (typeof item === 'string') { // Just in case it's a raw string QR
                updateMap.set(item, new Date().toISOString());
            }
        }

        let syncedCount = 0;
        let hasError = false;

        // Perform individual updates because each ticket has a different checked_time.
        // Using Promise.all is fine for reasonable batch sizes.
        const updatePromises = Array.from(updateMap.entries()).map(async ([qr, checkedTime]) => {
            const { error } = await supabase
                .from('tkt')
                .update({ valid: 0, updated_at: checkedTime })
                .eq('qr', qr);

            if (error) {
                console.error(`Failed to sync used ticket ${qr} to DB:`, error);
                hasError = true;
                // Optional: individual retry push back could go here, but for now we'll track failure
            } else {
                syncedCount++;
            }
        });

        await Promise.all(updatePromises);

        if (hasError) {
            return { success: false, count: syncedCount, error: "Some tickets failed to sync to the database." };
        }

        return { success: true, count: syncedCount };
    } catch (err) {
        console.error("Unexpected error syncing used tickets to DB:", err);
        return { success: false, error: "An unexpected error occurred during DB sync." };
    }
}
