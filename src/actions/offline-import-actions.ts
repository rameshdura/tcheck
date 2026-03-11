"use server";

import { prisma } from "@/lib/local-db";
import { localRedis } from "@/lib/local-redis";

// ---- Import tickets from CSV into SQLite ----

export interface OfflineTicketImport {
    qr: string;
    name?: string;
    phone?: string;
    typeid?: string;
    type?: number;
    created?: string;
    updated_at?: string;
    userId?: string;
    transactionId?: string;
    valid?: number;
    vendor?: number;
}

export async function offlineImportTickets(tickets: OfflineTicketImport[]) {
    if (!tickets || tickets.length === 0) {
        return { success: false, error: "No tickets provided" };
    }

    try {
        // Upsert so re-importing same CSV doesn't duplicate
        const ops = tickets.map((t) =>
            prisma.tkt.upsert({
                where: { qr: t.qr },
                create: {
                    qr: t.qr,
                    name: t.name || null,
                    phone: t.phone || null,
                    typeid: t.typeid || null,
                    type: t.type ?? 1,
                    created: t.created ? new Date(t.created) : new Date(),
                    updated_at: t.updated_at ? new Date(t.updated_at) : null,
                    userId: t.userId || null,
                    transactionId: t.transactionId || null,
                    valid: t.valid ?? 1,
                    vendor: t.vendor ?? 1,
                },
                update: {
                    name: t.name || null,
                    phone: t.phone || null,
                    typeid: t.typeid || null,
                    type: t.type ?? 1,
                    updated_at: t.updated_at ? new Date(t.updated_at) : null,
                    userId: t.userId || null,
                    transactionId: t.transactionId || null,
                    valid: t.valid ?? 1,
                    vendor: t.vendor ?? 1,
                },
            })
        );

        // Prisma doesn't support bulk upsert natively — batch with transaction
        const BATCH = 200;
        let count = 0;
        for (let i = 0; i < ops.length; i += BATCH) {
            await prisma.$transaction(ops.slice(i, i + BATCH));
            count += Math.min(BATCH, ops.length - i);
        }

        return { success: true, count };
    } catch (error: any) {
        console.error("Offline import error:", error);
        return { success: false, error: error.message || "Import failed" };
    }
}
