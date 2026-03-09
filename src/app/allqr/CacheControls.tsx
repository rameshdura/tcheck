"use client";

import { useState } from "react";
import { forceCacheAll, clearCache, syncCacheToDatabase } from "@/actions/scan-actions";
import { useRouter } from "next/navigation";

export default function CacheControls() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState("");

    const handleForceCache = async () => {
        setIsLoading(true);
        setStatusText("Caching database to Redis...");
        const res = await forceCacheAll();
        if (res.success) {
            setStatusText("✅ Successfully cached to Redis.");
            router.refresh();
        } else {
            setStatusText(`❌ Error: ${res.error}`);
        }
        setIsLoading(false);
    };

    const handleClearCache = async () => {
        setIsLoading(true);
        setStatusText("Clearing Redis cache...");
        const res = await clearCache();
        if (res.success) {
            setStatusText("✅ Cache cleared.");
            router.refresh();
        } else {
            setStatusText(`❌ Error: ${res.error}`);
        }
        setIsLoading(false);
    };

    const handleSync = async () => {
        setIsLoading(true);
        setStatusText("Syncing changes to database...");
        const res = await syncCacheToDatabase();
        if (res?.success) {
            setStatusText(`✅ Synced ${res.count} changes to database.`);
            router.refresh();
        } else {
            setStatusText(`❌ Error: ${res?.error || 'Unknown error'}`);
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-zinc-100 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-8 mx-0 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 items-center flex gap-2">
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        Upstash Cache Controls
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage caching and syncing between Supabase and Redis.</p>
                </div>

                {statusText && (
                    <div className="text-sm font-medium px-3 py-1.5 bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm">
                        {statusText}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                    onClick={handleForceCache}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Force Cache
                </button>
                <button
                    onClick={handleClearCache}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 transition disabled:opacity-50"
                >
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Cache
                </button>
                <button
                    onClick={handleSync}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync to DB
                </button>
            </div>
        </div>
    );
}
