"use client";

import { ScanRecord, updateScanStatus, ScanStatus } from "@/actions/scan-actions";
import QRCode from "react-qr-code";
import { useState } from "react";

export default function QRCodeItem({
    scan,
    onStatusChange
}: {
    scan: ScanRecord,
    onStatusChange: (id: string, newStatus: ScanStatus) => void
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async (newStatus: ScanStatus) => {
        setIsUpdating(true);
        const { success } = await updateScanStatus(scan.id, newStatus);
        if (success) {
            onStatusChange(scan.id, newStatus);
        }
        setIsUpdating(false);
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-all hover:shadow-md">
            {/* QR Code Presentation */}
            <div className="shrink-0 bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
                <QRCode
                    value={scan.qr_data}
                    size={120}
                    level="M"
                />
            </div>

            {/* Details & Actions */}
            <div className="flex-1 flex flex-col justify-between w-full h-full gap-4">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider
                ${scan.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                ${scan.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                ${scan.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
              `}>
                            {scan.status}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                            {new Date(scan.created_at).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                        </span>
                    </div>

                    <p className="font-medium text-lg text-zinc-900 dark:text-zinc-100 break-words mb-1">
                        {scan.qr_data.startsWith('http') ? (
                            <a href={scan.qr_data} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {scan.qr_data}
                            </a>
                        ) : (
                            scan.qr_data
                        )}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono">ID: {scan.id.split('-')[0]}...</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                    <button
                        onClick={() => handleUpdate('approved')}
                        disabled={scan.status === 'approved' || isUpdating}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${scan.status === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-300 dark:text-emerald-800 cursor-not-allowed border border-transparent'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600'
                            }`}
                    >
                        {isUpdating && scan.status !== 'approved' ? '...' : 'Approve'}
                    </button>

                    <button
                        onClick={() => handleUpdate('rejected')}
                        disabled={scan.status === 'rejected' || isUpdating}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${scan.status === 'rejected'
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-300 dark:text-rose-800 cursor-not-allowed border border-transparent'
                                : 'bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600'
                            }`}
                    >
                        {isUpdating && scan.status !== 'rejected' ? '...' : 'Reject'}
                    </button>

                    {scan.status !== 'pending' && (
                        <button
                            onClick={() => handleUpdate('pending')}
                            disabled={isUpdating}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700"
                            title="Reset to Pending"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
