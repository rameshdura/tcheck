"use server";

import { prisma } from "@/lib/local-db";
import { localRedis } from "@/lib/local-redis";
import { getTypeName, getVendorName } from "@/lib/ticket-types";

// ---- Types ----

export interface OfflineTicketRecord {
    id: string;
    qr: string;
    name: string | null;
    phone: string | null;
    typeid: string | null;
    type: number | null;
    created: string | null;
    userId: string | null;
    transactionId: string | null;
    valid: number | null;
    vendor: number | null;
    updated_at: string | null;
}

export interface OfflineValidationSummary {
    total: number;
    validCount: number;
    invalidCount: number;
    notFoundCount: number;
    types: Record<string, number>;
}

export interface OfflineTicketValidationResult {
    qr: string;
    status: "VALID" | "USED" | "NOT_FOUND" | "ERROR";
    type?: string;
    vendor?: string;
}

// ---- Paginated ticket list from SQLite ----

export async function offlineGetPaginatedTickets(
    page: number,
    limit: number = 10
): Promise<{ success: boolean; data?: OfflineTicketRecord[]; count?: number; error?: string }> {
    try {
        const skip = (page - 1) * limit;
        const [tickets, total] = await Promise.all([
            prisma.tkt.findMany({
                skip,
                take: limit,
                orderBy: { created: "desc" },
            }),
            prisma.tkt.count(),
        ]);

        return {
            success: true,
            data: tickets.map((t) => ({
                id: t.id,
                qr: t.qr,
                name: t.name,
                phone: t.phone,
                typeid: t.typeid,
                type: t.type,
                created: t.created ? t.created.toISOString() : null,
                userId: t.userId,
                transactionId: t.transactionId,
                valid: t.valid,
                vendor: t.vendor,
                updated_at: t.updated_at ? t.updated_at.toISOString() : null,
            })),
            count: total,
        };
    } catch (error: any) {
        console.error("Offline paginated fetch error:", error);
        return { success: false, error: error.message || "Failed to fetch tickets" };
    }
}

// ---- Get single ticket details from SQLite ----

export async function offlineGetTicketDetails(
    qr: string
): Promise<{ success: boolean; data?: OfflineTicketRecord; error?: string }> {
    if (!qr) return { success: false, error: "QR code is required." };

    try {
        const ticket = await prisma.tkt.findUnique({ where: { qr } });

        if (!ticket) {
            return { success: false, error: "Ticket not found in local database." };
        }

        return {
            success: true,
            data: {
                id: ticket.id,
                qr: ticket.qr,
                name: ticket.name,
                phone: ticket.phone,
                typeid: ticket.typeid,
                type: ticket.type,
                created: ticket.created ? ticket.created.toISOString() : null,
                userId: ticket.userId,
                transactionId: ticket.transactionId,
                valid: ticket.valid,
                vendor: ticket.vendor,
                updated_at: ticket.updated_at ? ticket.updated_at.toISOString() : null,
            },
        };
    } catch (error: any) {
        console.error("Offline ticket details error:", error);
        return { success: false, error: "Failed to fetch ticket from local DB." };
    }
}

// ---- Bulk validation via local Redis ----

export async function offlineValidateTicketsBulk(stagedQRs: string[]): Promise<{
    success: boolean;
    results?: OfflineTicketValidationResult[];
    summary?: OfflineValidationSummary;
    error?: string;
}> {
    if (!stagedQRs || stagedQRs.length === 0) {
        return { success: false, error: "No QR codes provided." };
    }

    try {
        // Batch GET from local Redis
        const pipeline = localRedis.pipeline();
        for (const qr of stagedQRs) {
            pipeline.get(`ticket:${qr}`);
        }
        const redisResults = await pipeline.exec();

        const validationResults: OfflineTicketValidationResult[] = [];
        const updatePipeline = localRedis.pipeline();
        const pendingUpdates: string[] = [];

        const summary: OfflineValidationSummary = {
            total: stagedQRs.length,
            validCount: 0,
            invalidCount: 0,
            notFoundCount: 0,
            types: {},
        };

        for (let i = 0; i < stagedQRs.length; i++) {
            const qr = stagedQRs[i];
            // ioredis pipeline returns [error, value] tuples
            const [pipeErr, rawValue] = redisResults![i] as [Error | null, string | null];

            if (pipeErr || !rawValue) {
                validationResults.push({ qr, status: "NOT_FOUND" });
                summary.notFoundCount++;
                continue;
            }

            let ticketData: any;
            try {
                ticketData = JSON.parse(rawValue);
            } catch {
                validationResults.push({ qr, status: "ERROR" });
                summary.invalidCount++;
                continue;
            }

            const typeName = getTypeName(ticketData.type);
            const vendorName = getVendorName(ticketData.vendor);

            if (ticketData.valid === 1) {
                validationResults.push({ qr, status: "VALID", type: typeName, vendor: vendorName });
                summary.validCount++;

                if (!summary.types[typeName]) summary.types[typeName] = 0;
                summary.types[typeName]++;

                // Mark as used in local Redis instantly
                ticketData.valid = 0;
                const checkedTime = new Date().toISOString();
                ticketData.updated_at = checkedTime;
                updatePipeline.set(`ticket:${qr}`, JSON.stringify(ticketData), "EX", 24 * 60 * 60);

                // Queue for SQLite sync
                pendingUpdates.push(JSON.stringify({ qr, checked_time: checkedTime }));
            } else {
                validationResults.push({ qr, status: "USED", type: typeName, vendor: vendorName });
                summary.invalidCount++;
            }
        }

        if (pendingUpdates.length > 0) {
            for (const u of pendingUpdates) {
                updatePipeline.lpush("pending_ticket_updates", u);
            }
            await updatePipeline.exec();
        }

        return { success: true, results: validationResults, summary };
    } catch (error: any) {
        console.error("Offline bulk validation error:", error);
        return { success: false, error: "Validation failed: " + error.message };
    }
}

// ---- Sync pending used tickets from local Redis queue → SQLite ----

export async function offlineSyncTicketsToDatabase(): Promise<{
    success: boolean;
    count?: number;
    error?: string;
}> {
    try {
        const pipeline = localRedis.pipeline();
        pipeline.lrange("pending_ticket_updates", 0, -1);
        pipeline.del("pending_ticket_updates");
        const results = await pipeline.exec();

        const pendingRaw = (results![0][1] as string[]) || [];

        if (pendingRaw.length === 0) {
            return { success: true, count: 0 };
        }

        // Deduplicate — keep latest timestamp per QR
        const updateMap = new Map<string, string>();
        for (const item of pendingRaw) {
            try {
                const parsed = JSON.parse(item);
                if (parsed?.qr) {
                    updateMap.set(parsed.qr, parsed.checked_time || new Date().toISOString());
                }
            } catch {
                /* skip malformed */
            }
        }

        let syncedCount = 0;
        let hasError = false;

        await Promise.all(
            Array.from(updateMap.entries()).map(async ([qr, checkedTime]) => {
                try {
                    await prisma.tkt.update({
                        where: { qr },
                        data: { valid: 0, updated_at: new Date(checkedTime) },
                    });
                    syncedCount++;
                } catch (e) {
                    console.error(`Failed to sync ${qr} to SQLite:`, e);
                    hasError = true;
                }
            })
        );

        if (hasError) {
            return { success: false, count: syncedCount, error: "Some tickets failed to sync." };
        }

        return { success: true, count: syncedCount };
    } catch (error: any) {
        console.error("Offline DB sync error:", error);
        return { success: false, error: error.message || "Sync failed" };
    }
}
