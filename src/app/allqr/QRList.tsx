"use client";

import { useEffect, useState } from "react";
import { ScanRecord, ScanStatus } from "@/actions/scan-actions";
import { supabase } from "@/lib/supabase";
import QRCodeItem from "./QRCodeItem";

export default function QRList({ initialScans }: { initialScans: ScanRecord[] }) {
    const [scans, setScans] = useState<ScanRecord[]>(initialScans);

    useEffect(() => {
        // Listen for new inserts and updates on the 'scans' table
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scans',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newScan = payload.new as ScanRecord;
                        setScans((prev) => [newScan, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedScan = payload.new as ScanRecord;
                        setScans((prev) =>
                            prev.map(scan => scan.id === updatedScan.id ? updatedScan : scan)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setScans((prev) => prev.filter(scan => scan.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOptimisticUpdate = (id: string, newStatus: ScanStatus) => {
        setScans(prev =>
            prev.map(scan => scan.id === id ? { ...scan, status: newStatus } : scan)
        );
    };

    if (scans.length === 0) {
        return (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                <p className="text-lg text-zinc-500 font-medium">No QR codes scanned yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {scans.map((scan) => (
                <QRCodeItem
                    key={scan.id}
                    scan={scan}
                    onStatusChange={handleOptimisticUpdate}
                />
            ))}
        </div>
    );
}
