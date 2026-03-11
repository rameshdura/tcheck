"use server";

import { prisma } from "@/lib/local-db";
import { localRedis } from "@/lib/local-redis";

// ---- Sync SQLite → local Redis ----

export async function offlineSyncDbToRedis(expirationHours: number) {
    if (!expirationHours || expirationHours <= 0) {
        return { success: false, error: "Invalid expiration hours" };
    }

    try {
        // Fetch all tickets from SQLite
        const tickets = await prisma.tkt.findMany({
            select: { qr: true, type: true, valid: true, vendor: true, updated_at: true },
        });

        if (tickets.length === 0) {
            return { success: false, error: "No tickets found in local database to sync." };
        }

        const pipeline = localRedis.pipeline();
        const expirationSeconds = expirationHours * 60 * 60;

        for (const ticket of tickets) {
            if (!ticket.qr) continue;
            const key = `ticket:${ticket.qr}`;
            const value = JSON.stringify({
                type: ticket.type,
                valid: ticket.valid,
                vendor: ticket.vendor,
                updated_at: ticket.updated_at ? ticket.updated_at.toISOString() : null,
            });
            pipeline.set(key, value, "EX", expirationSeconds);
        }

        await pipeline.exec();
        return { success: true, count: tickets.length };
    } catch (error: any) {
        console.error("Offline Redis sync error:", error);
        return { success: false, error: error.message || "Failed to sync to local Redis" };
    }
}

// ---- Clear local Redis cache (only DB 1 / our keys) ----

export async function offlineClearRedisCache() {
    try {
        await localRedis.flushdb();
        return { success: true };
    } catch (error: any) {
        console.error("Offline Redis clear error:", error);
        return { success: false, error: error.message || "Failed to clear local Redis cache" };
    }
}
