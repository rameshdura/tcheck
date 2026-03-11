"use client";

import Link from "next/link";
import { type OfflineTicketRecord } from "@/actions/offline-scan-actions";
import { getTypeName, getVendorName } from "@/lib/ticket-types";

interface OfflineQRListProps {
    tickets: OfflineTicketRecord[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
}

export default function OfflineQRList({ tickets, totalCount, currentPage, pageSize }: OfflineQRListProps) {
    const totalPages = Math.ceil(totalCount / pageSize);

    if (tickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-500">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                </div>
                <p className="text-lg font-semibold">No tickets in local SQLite</p>
                <p className="text-sm text-zinc-400">Import a CSV first via the Import page.</p>
                <Link
                    href="/offline/import"
                    className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-sm"
                >
                    Go to Import
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-sm text-zinc-500">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} tickets
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">QR Code</th>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Phone</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Vendor</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {tickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 truncate max-w-[160px]" title={ticket.qr}>
                                    {ticket.qr}
                                </td>
                                <td className="px-4 py-3 truncate max-w-[120px] text-zinc-900 dark:text-zinc-100">
                                    {ticket.name || <span className="text-zinc-400">—</span>}
                                </td>
                                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                    {ticket.phone || <span className="text-zinc-400">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded text-xs font-medium">
                                            {getTypeName(ticket.type || 0)}
                                        </span>
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                                    {getVendorName(ticket.vendor || 0)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                    ${ticket.valid === 1
                                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                            : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${ticket.valid === 1 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                        {ticket.valid === 1 ? "Unused" : "Used"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-nowrap">
                                    {ticket.created
                                        ? new Date(ticket.created).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false }).slice(0, 16)
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                    <Link
                        href={`/offline/allqr?page=${currentPage - 1}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${currentPage <= 1
                                ? "opacity-40 pointer-events-none bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            }`}
                        aria-disabled={currentPage <= 1}
                    >
                        ← Prev
                    </Link>
                    <span className="text-sm text-zinc-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Link
                        href={`/offline/allqr?page=${currentPage + 1}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${currentPage >= totalPages
                                ? "opacity-40 pointer-events-none bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                            }`}
                        aria-disabled={currentPage >= totalPages}
                    >
                        Next →
                    </Link>
                </div>
            )}
        </div>
    );
}
