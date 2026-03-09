"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { FileUp, Save, AlertCircle, CheckCircle2, Loader2, ArrowLeft, DatabaseZap, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { syncSupabaseToRedis, clearRedisCache } from "@/actions/redis-actions";
import { syncTicketsToDatabase } from "@/actions/scan-actions";

interface TicketData {
    qr: string;
    name: string;
    phone?: string;
    typeid: string;
    type: number;
    created: string;
    updated_at?: string;
    userid: string;
    transactionid: string;
    valid: number;
    vendor: number;
}

export default function ImportPage() {
    const [data, setData] = useState<TicketData[]>([]);
    const [fileName, setFileName] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Redis states
    const [expirationHours, setExpirationHours] = useState<number>(24);
    const [redisLoading, setRedisLoading] = useState(false);
    const [redisStatus, setRedisStatus] = useState<"idle" | "success" | "error">("idle");
    const [redisMessage, setRedisMessage] = useState("");
    const [clearingCache, setClearingCache] = useState(false);

    // Upstash to DB sync states
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
                // Transform and validate the parsed data
                const transformedData: TicketData[] = results.data.map((row) => {
                    const ticket: TicketData = {
                        qr: String(row.qr || ""),
                        name: String(row.name || ""),
                        typeid: String(row.typeid || ""),
                        type: parseInt(row.type) || 1,
                        created: String(row.created || ""),
                        userid: String(row.userId || ""),
                        transactionid: String(row.transactionId || ""),
                        valid: parseInt(row.valid) === 1 ? 1 : 0,
                        vendor: parseInt(row.vendor) === 2 ? 2 : 1,
                    };
                    if (row.phone) ticket.phone = String(row.phone);
                    if (row.updated_at) ticket.updated_at = String(row.updated_at);
                    return ticket;
                }).filter(row => row.qr !== ""); // Basic validation: require QR

                setData(transformedData);
            },
            error: (error) => {
                setStatus("error");
                setMessage(`Error parsing CSV: ${error.message}`);
            }
        });
    };

    const importData = async () => {
        if (data.length === 0) return;

        setLoading(true);
        setStatus("idle");
        setMessage("");

        try {
            // supabase insert automatically handles arrays for bulk insert
            const { error } = await supabase.from("tkt").insert(data);

            if (error) {
                throw new Error(error.message || "Failed to insert data");
            }

            setStatus("success");
            setMessage(`Successfully imported ${data.length} tickets!`);
            // Optional: clear data after successful import
            // setData([]); 
        } catch (error: any) {
            console.error("Import error:", error);
            setStatus("error");
            setMessage(error.message || "An unexpected error occurred during import.");
        } finally {
            setLoading(false);
        }
    };

    const syncToRedis = async () => {
        setRedisLoading(true);
        setRedisStatus("idle");
        setRedisMessage("");

        try {
            const result = await syncSupabaseToRedis(expirationHours);

            if (!result.success) {
                throw new Error(result.error);
            }

            setRedisStatus("success");
            setRedisMessage(`Successfully cached ${result.count} tickets from database to Redis!`);
        } catch (error: any) {
            console.error("Redis sync error:", error);
            setRedisStatus("error");
            setRedisMessage(error.message || "Failed to cache in Redis.");
        } finally {
            setRedisLoading(false);
        }
    };

    const handleClearCache = async () => {
        if (!window.confirm("Are you sure you want to clear the Redis cache? We might loose changes!")) {
            return;
        }

        setClearingCache(true);
        setRedisStatus("idle");
        setRedisMessage("");

        try {
            const result = await clearRedisCache();

            if (!result.success) {
                throw new Error(result.error);
            }

            setRedisStatus("success");
            setRedisMessage("Redis cache cleared successfully");
        } catch (error: any) {
            console.error("Redis clear cache error:", error);
            setRedisStatus("error");
            setRedisMessage(error.message || "Failed to clear cache.");
        } finally {
            setClearingCache(false);
        }
    };

    const syncToDatabase = async () => {
        setDbSyncLoading(true);
        setDbSyncStatus("idle");
        setDbSyncMessage("");

        try {
            const result = await syncTicketsToDatabase();

            if (!result.success) {
                throw new Error(result.error);
            }

            setDbSyncStatus("success");
            setDbSyncMessage(result.count === 0
                ? "No new used tickets to sync."
                : `Successfully updated ${result.count} used tickets back to database!`);
        } catch (error: any) {
            console.error("DB sync error:", error);
            setDbSyncStatus("error");
            setDbSyncMessage(error.message || "Failed to sync to database.");
        } finally {
            setDbSyncLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                    <Link href="/allqr" className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Import Tickets</h1>
                        <p className="text-neutral-400 mt-1">Upload a CSV file to bulk add tickets to the database</p>
                    </div>
                </div>

                {/* Database to Redis Sync Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <DatabaseZap className="text-emerald-500" /> Cache Database to Redis
                        </h2>
                        <p className="text-sm text-neutral-400 mt-1 max-w-lg">
                            Fetch all tickets from your Supabase database and preload them into your Upstash Redis cache for instant QR scanning. Avoids duplicates automatically by overwriting previous entries.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-1 rounded-xl w-full sm:w-auto overflow-hidden">
                                <select
                                    className="bg-transparent text-sm min-w-32 text-white border-0 focus:ring-0 px-2 cursor-pointer outline-none"
                                    value={expirationHours}
                                    onChange={(e) => setExpirationHours(Number(e.target.value))}
                                >
                                    <option value={1} className="bg-neutral-900">1 Hour TTL</option>
                                    <option value={12} className="bg-neutral-900">12 Hours TTL</option>
                                    <option value={24} className="bg-neutral-900">24 Hours TTL</option>
                                    <option value={48} className="bg-neutral-900">48 Hours TTL</option>
                                    <option value={168} className="bg-neutral-900">7 Days TTL</option>
                                </select>
                            </div>

                            <Button
                                onClick={syncToRedis}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-6 w-full sm:w-auto shrink-0 transition-all"
                                disabled={redisLoading || redisStatus === "success" || clearingCache}
                            >
                                {redisLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
                                ) : (
                                    <><DatabaseZap className="mr-2 h-4 w-4" /> Sync to Cache</>
                                )}
                            </Button>

                            <Button
                                onClick={handleClearCache}
                                className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl px-6 w-full sm:w-auto shrink-0 transition-all"
                                disabled={clearingCache || redisLoading}
                            >
                                {clearingCache ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Clearing...</>
                                ) : (
                                    <><Trash2 className="mr-2 h-4 w-4" /> Clear Cache</>
                                )}
                            </Button>
                        </div>

                        {/* Redis Status Messages */}
                        {redisStatus === "error" && (
                            <div className="flex items-center gap-2 text-sm text-red-500 mt-1">
                                <AlertCircle size={16} />
                                <span>{redisMessage}</span>
                            </div>
                        )}
                        {redisStatus === "success" && (
                            <div className="flex items-center gap-2 text-sm text-emerald-500 mt-1">
                                <CheckCircle2 size={16} />
                                <span>{redisMessage}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upstash to Database Sync Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Save className="text-blue-500" /> Cache to Database
                        </h2>
                        <p className="text-sm text-neutral-400 mt-1 max-w-lg">
                            Sync newly scanned (used) tickets from your Upstash Redis cache back to the Supabase database for permanent storage.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <Button
                            onClick={syncToDatabase}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-6 w-full sm:w-auto shrink-0 transition-all"
                            disabled={dbSyncLoading || dbSyncStatus === "success"}
                        >
                            {dbSyncLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Sync to DB</>
                            )}
                        </Button>

                        {/* DB Sync Status Messages */}
                        {dbSyncStatus === "error" && (
                            <div className="flex items-center justify-end gap-2 text-sm text-red-500 mt-1">
                                <AlertCircle size={16} />
                                <span>{dbSyncMessage}</span>
                            </div>
                        )}
                        {dbSyncStatus === "success" && (
                            <div className="flex items-center justify-end gap-2 text-sm text-blue-500 mt-1">
                                <CheckCircle2 size={16} />
                                <span>{dbSyncMessage}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-neutral-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-neutral-950 px-2 text-neutral-500">Or import new data</span>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center border-dashed">
                    <label
                        htmlFor="csv-upload"
                        className="flex flex-col items-center justify-center w-full max-w-md h-40 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-700 focus-within:ring-2 focus-within:ring-emerald-500"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-10 h-10 mb-3 text-emerald-500" />
                            <p className="mb-2 text-sm text-neutral-300">
                                <span className="font-semibold text-white">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-neutral-500">CSV files only</p>
                        </div>
                        <input
                            id="csv-upload"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>

                {/* Status Messages */}
                {status === "error" && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl">
                        <AlertCircle size={20} />
                        <p>{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl">
                        <CheckCircle2 size={20} />
                        <p>{message}</p>
                    </div>
                )}

                {/* Data Preview */}
                {data.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Preview Data</h2>
                                <p className="text-sm text-neutral-400">Found {data.length} valid tickets in {fileName}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={importData}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-6"
                                    disabled={loading || status === "success"}
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> Import to DB</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/50 border-b border-neutral-800">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">QR / Code</th>
                                            <th className="px-4 py-3 font-medium">Name</th>
                                            <th className="px-4 py-3 font-medium">Phone</th>
                                            <th className="px-4 py-3 font-medium">Type</th>
                                            <th className="px-4 py-3 font-medium">Vendor</th>
                                            <th className="px-4 py-3 font-medium">Valid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {data.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-neutral-800/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-emerald-400 truncate max-w-[150px]">{row.qr}</td>
                                                <td className="px-4 py-3 truncate max-w-[150px]">{row.name}</td>
                                                <td className="px-4 py-3 truncate max-w-[150px]">{row.phone || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-neutral-800 px-2 py-1 rounded text-xs">{row.typeid} ({row.type})</span>
                                                </td>
                                                <td className="px-4 py-3">{row.vendor}</td>
                                                <td className="px-4 py-3">
                                                    <span className={row.valid ? "text-emerald-500" : "text-neutral-500"}>
                                                        {row.valid ? "Yes" : "No"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.length > 10 && (
                                <div className="bg-neutral-950/50 px-4 py-3 text-center text-xs text-neutral-500 border-t border-neutral-800">
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
