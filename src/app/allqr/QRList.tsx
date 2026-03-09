"use client";

import { TicketRecord } from "@/actions/scan-actions";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

interface QRListProps {
    tickets: TicketRecord[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
}

export default function QRList({ tickets, totalCount, currentPage, pageSize }: QRListProps) {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    if (tickets.length === 0) {
        return (
            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                <p className="text-lg text-zinc-500 font-medium">No tickets found in the database.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 font-medium">QR / Code</th>
                                <th className="px-4 py-3 font-medium hidden sm:table-cell">Name</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium hidden md:table-cell">Vendor</th>
                                <th className="px-4 py-3 font-medium">Valid</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-[120px] sm:max-w-[150px]">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-1 rounded-md shrink-0">
                                                <QRCode
                                                    value={ticket.qr}
                                                    size={48}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    viewBox={`0 0 48 48`}
                                                />
                                            </div>
                                            <span className="truncate">{ticket.qr}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 truncate max-w-[150px] hidden sm:table-cell">
                                        {ticket.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded text-xs border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                            {ticket.typeid || ticket.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        {ticket.vendor}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${ticket.valid
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                            }`}>
                                            {ticket.valid ? "Yes" : "No"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Showing <span className="font-medium text-zinc-900 dark:text-white">{((currentPage - 1) * pageSize) + 1}</span> to <span className="font-medium text-zinc-900 dark:text-white">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium text-zinc-900 dark:text-white">{totalCount}</span> results
                    </p>

                    <div className="flex gap-2">
                        {currentPage > 1 ? (
                            <Link
                                href={`/allqr?page=${currentPage - 1}`}
                                className="inline-flex h-8 gap-1.5 px-3 items-center justify-center rounded-[min(var(--radius-md),12px)] text-[0.8rem] border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Link>
                        ) : (
                            <div className="inline-flex h-8 gap-1.5 px-3 items-center justify-center rounded-[min(var(--radius-md),12px)] text-[0.8rem] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 opacity-50 cursor-not-allowed">
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </div>
                        )}

                        {currentPage < totalPages ? (
                            <Link
                                href={`/allqr?page=${currentPage + 1}`}
                                className="inline-flex h-8 gap-1.5 px-3 items-center justify-center rounded-[min(var(--radius-md),12px)] text-[0.8rem] border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 transition-colors"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <div className="inline-flex h-8 gap-1.5 px-3 items-center justify-center rounded-[min(var(--radius-md),12px)] text-[0.8rem] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 opacity-50 cursor-not-allowed">
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
