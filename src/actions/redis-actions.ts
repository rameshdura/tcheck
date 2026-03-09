"use server";

import { redis } from "@/lib/redis";
import { supabase } from "@/lib/supabase";

interface TicketRedisPayload {
    qr: string;
    type: number;
    valid: number;
    vendor: number;
}

export async function bulkImportToRedis(tickets: TicketRedisPayload[], expirationHours: number) {
    if (!tickets || tickets.length === 0) {
        return { success: false, error: "No tickets provided for import" };
    }

    if (!expirationHours || expirationHours <= 0) {
        return { success: false, error: "Invalid expiration hours" };
    }

    try {
        const pipeline = redis.pipeline();

        // TTL in seconds
        const expirationSeconds = expirationHours * 60 * 60;

        for (const ticket of tickets) {
            const key = `ticket:${ticket.qr}`;
            const value = JSON.stringify({
                type: ticket.type,
                valid: ticket.valid,
                vendor: ticket.vendor
            });

            // Set key with EXPIRE
            pipeline.set(key, value, { ex: expirationSeconds });
        }

        // Execute the pipeline which batches all SET commands into a single round-trip
        await pipeline.exec();

        return { success: true, count: tickets.length };
    } catch (error: any) {
        console.error("Redis bulk import error:", error);
        return { success: false, error: error.message || "Failed to import to Redis" };
    }
}

export async function syncSupabaseToRedis(expirationHours: number) {
    if (!expirationHours || expirationHours <= 0) {
        return { success: false, error: "Invalid expiration hours" };
    }

    try {
        // Fetch all tickets from Supabase. We only cache valid ones!
        // You could remove the .eq filter if you want to cache invalid ones too.
        const { data: tickets, error: supaError } = await supabase
            .from("tkt")
            .select("qr, type, vendor, valid, updated_at");
        // .eq("valid", 1); // Only fetch valid tickets to save cache space (optional)

        if (supaError) {
            throw new Error(`Supabase error: ${supaError.message}`);
        }

        if (!tickets || tickets.length === 0) {
            return { success: false, error: "No tickets found in database to sync." };
        }

        const pipeline = redis.pipeline();
        const expirationSeconds = expirationHours * 60 * 60;

        for (const ticket of tickets) {
            if (!ticket.qr) continue;

            const key = `ticket:${ticket.qr}`;
            const value = JSON.stringify({
                type: ticket.type,
                valid: ticket.valid,
                vendor: ticket.vendor,
                updated_at: ticket.updated_at
            });

            // Set key with EXPIRE. This OVERWRITES existing keys, naturally avoiding duplicates.
            pipeline.set(key, value, { ex: expirationSeconds });
        }

        await pipeline.exec();

        return { success: true, count: tickets.length };
    } catch (error: any) {
        console.error("Redis sync error:", error);
        return { success: false, error: error.message || "Failed to sync Supabase to Redis" };
    }
}

export async function clearRedisCache() {
    try {
        await redis.flushdb();
        return { success: true };
    } catch (error: any) {
        console.error("Redis clear cache error:", error);
        return { success: false, error: error.message || "Failed to clear Redis cache" };
    }
}
