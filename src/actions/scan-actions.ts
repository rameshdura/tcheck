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

        // Log to Redis
        try {
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] NEW SCAN: ${qrData}`);
            // Keep only the last 100 logs
            await redis.ltrim('qr_scan_logs', 0, 99);
        } catch (e) {
            console.error("Redis log error:", e);
        }

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error saving scan:", err);
        return { success: false, error: "An unexpected error occurred while saving." };
    }
}

export async function updateScanStatus(id: string, status: ScanStatus): Promise<{ success: boolean; data?: ScanRecord; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('scans')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            return { success: false, error: error.message };
        }

        // Log to Redis
        try {
            await redis.lpush('qr_scan_logs', `[${new Date().toISOString()}] UPDATE: Scan ${id} marked as ${status.toUpperCase()}`);
            await redis.ltrim('qr_scan_logs', 0, 99);
        } catch (e) {
            console.error("Redis log error:", e);
        }

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error updating scan status:", err);
        return { success: false, error: "An unexpected error occurred while updating status." };
    }
}

export async function getAllScans(): Promise<{ success: boolean; data?: ScanRecord[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error fetching scans:", err);
        return { success: false, error: "An unexpected error occurred while fetching." };
    }
}
