import Link from "next/link";
import type { ReactNode } from "react";

export default function OfflineLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-zinc-950 font-sans">
            {/* Top banner */}
            <nav className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-40 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-widest">⚡ Offline Mode</span>
                    <span className="text-xs opacity-75 hidden sm:inline">Local SQLite + Redis</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                    <Link
                        href="/offline"
                        className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Scanner
                    </Link>
                    <Link
                        href="/offline/allqr"
                        className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        All QR
                    </Link>
                    <Link
                        href="/offline/import"
                        className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Import
                    </Link>
                    <Link
                        href="/offline/certificate"
                        className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Certs
                    </Link>
                    <span className="mx-2 opacity-40">|</span>
                    <Link
                        href="/"
                        className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors opacity-75"
                    >
                        ← Live
                    </Link>
                </div>
            </nav>

            {children}
        </div>
    );
}
