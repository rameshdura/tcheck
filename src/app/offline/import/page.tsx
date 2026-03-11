"use client";

import { useState } from "react";
import Papa from "papaparse";
import { FileUp, Save, AlertCircle, CheckCircle2, Loader2, DatabaseZap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offlineImportTickets, type OfflineTicketImport } from "@/actions/offline-import-actions";
import { offlineSyncDbToRedis, offlineClearRedisCache } from "@/actions/offline-redis-actions";
import { offlineSyncTicketsToDatabase } from "@/actions/offline-scan-actions";

export default function OfflineImportPage() {
    const [data, setData] = useState<OfflineTicketImport[]>([]);
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const [expirationHours, setExpirationHours] = useState(24);
    const [redisLoading, setRedisLoading] = useState(false);
    const [redisStatus, setRedisStatus] = useState<"idle" | "success" | "error">("idle");
    const [redisMessage, setRedisMessage] = useState("");
    const [clearingCache, setClearingCache] = useState(false);

    const [dbSyncLoading, setDbSyncLoading] = useState(false);
    const [dbSyncStatus, setDbSyncStatus] = useState<"idle" | "success" | "error">("idle");
    const [dbSyncMessage, setDbSyncMessage] = useState("");

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setStatus("idle");
        setMessage("");
        setRedisStatus("idle");
        setRedisMessage("");
        setDbSyncStatus("idle");
        setDbSyncMessage("");

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const transformed: OfflineTicketImport[] = results.data
                    .map((row) => ({
                        qr: String(row.qr || ""),
                        name: String(row.name || ""),
                        phone: row.phone ? String(row.phone) : undefined,
                        typeid: String(row.typeid || ""),
                        type: parseInt(row.type) || 1,
                        created: String(row.created || ""),
                        updated_at: row.updated_at ? String(row.updated_at) : undefined,
                        userId: String(row.userId || ""),
                        transactionId: String(row.transactionId || ""),
                        valid: parseInt(row.valid) === 1 ? 1 : 0,
                        vendor: parseInt(row.vendor) === 2 ? 2 : 1,
                    }))
                    .filter((r) => r.qr !== "");

                setData(transformed);
            },
            error: (error) => {
                setStatus("error");
                setMessage(`Error parsing CSV: ${error.message}`);
            },
        });
    };

    const importData = async () => {
        if (data.length === 0) return;
        setLoading(true);
        setStatus("idle");
        setMessage("");

        const result = await offlineImportTickets(data);

        if (result.success) {
            setStatus("success");
            setMessage(`Successfully imported ${result.count} tickets into local SQLite!`);
        } else {
            setStatus("error");
            setMessage(result.error || "Import failed.");
        }
        setLoading(false);
    };

    const syncToRedis = async () => {
        setRedisLoading(true);
        setRedisStatus("idle");
        setRedisMessage("");

        const result = await offlineSyncDbToRedis(expirationHours);

        if (result.success) {
            setRedisStatus("success");
            setRedisMessage(`Cached ${result.count} tickets from local DB → local Redis!`);
        } else {
            setRedisStatus("error");
            setRedisMessage(result.error || "Sync failed.");
        }
        setRedisLoading(false);
    };

    const handleClearCache = async () => {
        if (!window.confirm("Clear all keys from local Redis DB 1? Unsynced scan data may be lost!")) return;
        setClearingCache(true);
        setRedisStatus("idle");
        setRedisMessage("");

        const result = await offlineClearRedisCache();

        if (result.success) {
            setRedisStatus("success");
            setRedisMessage("Local Redis cache cleared.");
        } else {
            setRedisStatus("error");
            setRedisMessage(result.error || "Failed to clear cache.");
        }
        setClearingCache(false);
    };

    const syncToDatabase = async () => {
        setDbSyncLoading(true);
        setDbSyncStatus("idle");
        setDbSyncMessage("");

        const result = await offlineSyncTicketsToDatabase();

        if (result.success) {
            setDbSyncStatus("success");
            setDbSyncMessage(
                result.count === 0
                    ? "No new used tickets to sync."
                    : `Updated ${result.count} used tickets in local SQLite!`
            );
        } else {
            setDbSyncStatus("error");
            setDbSyncMessage(result.error || "Sync failed.");
        }
        setDbSyncLoading(false);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="border-b border-zinc-800 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Import Tickets <span className="text-amber-400 text-lg font-normal ml-2">— Offline</span></h1>
                    <p className="text-zinc-400 mt-1">Upload CSV → SQLite → prefetch to local Redis. All data stays on your machine.</p>
                </div>

                {/* SQLite → Redis */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <DatabaseZap className="text-amber-400" /> Cache Local DB → Local Redis
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1 max-w-lg">
                            Prefetch all tickets from local SQLite into local Redis for instant offline QR scanning. Overwrites existing keys.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-xl w-full sm:w-auto overflow-hidden">
                                <select
                                    className="bg-transparent text-sm min-w-32 text-white border-0 focus:ring-0 px-2 cursor-pointer outline-none"
                                    value={expirationHours}
                                    onChange={(e) => setExpirationHours(Number(e.target.value))}
                                >
                                    <option value={1} className="bg-zinc-900">1 Hour TTL</option>
                                    <option value={12} className="bg-zinc-900">12 Hours TTL</option>
                                    <option value={24} className="bg-zinc-900">24 Hours TTL</option>
                                    <option value={48} className="bg-zinc-900">48 Hours TTL</option>
                                    <option value={168} className="bg-zinc-900">7 Days TTL</option>
                                </select>
                            </div>

                            <Button
                                onClick={syncToRedis}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl px-6 w-full sm:w-auto"
                                disabled={redisLoading || redisStatus === "success" || clearingCache}
                            >
                                {redisLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : <><DatabaseZap className="mr-2 h-4 w-4" /> Sync to Cache</>}
                            </Button>

                            <Button
                                onClick={handleClearCache}
                                className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl px-6 w-full sm:w-auto"
                                disabled={clearingCache || redisLoading}
                            >
                                {clearingCache ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Clearing...</> : <><Trash2 className="mr-2 h-4 w-4" /> Clear Cache</>}
                            </Button>
                        </div>

                        {redisStatus === "error" && (
                            <div className="flex items-center gap-2 text-sm text-red-500 mt-1"><AlertCircle size={16} /><span>{redisMessage}</span></div>
                        )}
                        {redisStatus === "success" && (
                            <div className="flex items-center gap-2 text-sm text-amber-400 mt-1"><CheckCircle2 size={16} /><span>{redisMessage}</span></div>
                        )}
                    </div>
                </div>

                {/* Redis → SQLite (scan sync) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Save className="text-blue-400" /> Sync Scans → Local DB
                        </h2>
                        <p className="text-sm text-zinc-400 mt-1 max-w-lg">
                            Write newly scanned (used) tickets from local Redis queue back to local SQLite for permanent storage.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <Button
                            onClick={syncToDatabase}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-6 w-full sm:w-auto"
                            disabled={dbSyncLoading || dbSyncStatus === "success"}
                        >
                            {dbSyncLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : <><Save className="mr-2 h-4 w-4" /> Sync to DB</>}
                        </Button>

                        {dbSyncStatus === "error" && (
                            <div className="flex items-center gap-2 text-sm text-red-500 mt-1"><AlertCircle size={16} /><span>{dbSyncMessage}</span></div>
                        )}
                        {dbSyncStatus === "success" && (
                            <div className="flex items-center gap-2 text-sm text-blue-400 mt-1"><CheckCircle2 size={16} /><span>{dbSyncMessage}</span></div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-950 px-2 text-zinc-500">Or import new data from CSV</span>
                    </div>
                </div>

                {/* CSV Upload */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center border-dashed">
                    <label
                        htmlFor="csv-upload-offline"
                        className="flex flex-col items-center justify-center w-full max-w-md h-40 rounded-xl cursor-pointer hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700 focus-within:ring-2 focus-within:ring-amber-500"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-10 h-10 mb-3 text-amber-400" />
                            <p className="mb-2 text-sm text-zinc-300">
                                <span className="font-semibold text-white">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-zinc-500">CSV files only</p>
                        </div>
                        <input
                            id="csv-upload-offline"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>

                {status === "error" && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                        <AlertCircle size={20} /><p>{message}</p>
                    </div>
                )}
                {status === "success" && (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl">
                        <CheckCircle2 size={20} /><p>{message}</p>
                    </div>
                )}

                {/* Data Preview */}
                {data.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Preview Data</h2>
                                <p className="text-sm text-zinc-400">Found {data.length} valid tickets in {fileName}</p>
                            </div>
                            <Button
                                onClick={importData}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl px-6"
                                disabled={loading || status === "success"}
                            >
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : <><Save className="mr-2 h-4 w-4" /> Import to SQLite</>}
                            </Button>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/50 border-b border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">QR / Code</th>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Phone</th>
                                            <th className="px-4 py-3 font-medium">Type</th>
                                            <th className="px-4 py-3 font-medium">Vendor</th>
                                            <th className="px-4 py-3 font-medium">Valid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {data.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-amber-400 truncate max-w-[150px]">{row.qr}</td>
                                                <td className="px-4 py-3 truncate max-w-[150px]">{row.name}</td>
                                                <td className="px-4 py-3 truncate max-w-[150px]">{row.phone || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-zinc-800 px-2 py-1 rounded text-xs">{row.typeid} ({row.type})</span>
                                                </td>
                                                <td className="px-4 py-3">{row.vendor}</td>
                                                <td className="px-4 py-3">
                                                    <span className={row.valid ? "text-emerald-400" : "text-zinc-500"}>
                                                        {row.valid ? "Yes" : "No"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.length > 10 && (
                                <div className="bg-zinc-950/50 px-4 py-3 text-center text-xs text-zinc-500 border-t border-zinc-800">
                                    Showing first 10 of {data.length} rows
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
