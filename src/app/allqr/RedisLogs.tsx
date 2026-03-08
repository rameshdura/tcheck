"use client";

import { useEffect, useState } from "react";

export default function RedisLogs() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchLogs = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/redis-logs');
            const data = await res.json();
            if (data.success && data.logs) {
                setLogs(data.logs);
            }
        } catch (e) {
            console.error(e);
        }
        setIsRefreshing(false);
    };

    useEffect(() => {
        fetchLogs();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-black rounded-3xl shadow-sm sm:shadow-lg sm:border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col h-[500px] lg:h-[calc(100vh-32px)] lg:sticky top-4">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        Redis Logs
                        {isRefreshing && <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Live updates from Upstash</p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={isRefreshing}
                    className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition"
                    title="Refresh Logs"
                >
                    ↻
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
                {logs.length === 0 ? (
                    <p className="text-zinc-500 italic text-center mt-10">No logs found.</p>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="p-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 break-words">
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
