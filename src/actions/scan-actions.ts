"use server";

import { supabase } from "@/lib/supabase";

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

        return { success: true, data };
    } catch (err) {
        console.error("Unexpected error updating scan status:", err);
        return { success: false, error: "An unexpected error occurred while updating status." };
    }
}
