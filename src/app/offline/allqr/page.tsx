import { offlineGetPaginatedTickets } from "@/actions/offline-scan-actions";
import Link from "next/link";
import OfflineQRList from "./OfflineQRList";

export const revalidate = 0;

export default async function OfflineAllQRsPage(props: { searchParams: Promise<{ page?: string }> }) {
    const searchParams = await props.searchParams;
    const currentPage = parseInt(searchParams.page || "1", 10);
    const pageSize = 10;

    const { success, data, count, error } = await offlineGetPaginatedTickets(currentPage, pageSize);

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans p-4 justify-center">
            <main className="w-full max-w-4xl py-12 px-6 sm:px-12 bg-white dark:bg-black rounded-3xl shadow-sm sm:shadow-lg sm:border border-zinc-200 dark:border-zinc-800 mt-4">

                <div className="flex justify-between items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            All Tickets <span className="text-amber-500 text-lg font-normal ml-1">— Local SQLite</span>
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            {count ?? 0} tickets stored in the local SQLite database.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/offline/import"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors text-sm"
                        >
                            Import CSV
                        </Link>
                        <Link
                            href="/offline"
                            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-sm border border-zinc-200 dark:border-zinc-800"
                        >
                            ← Scanner
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 border border-red-200">
                        <strong>Error loading tickets:</strong> {error}
                    </div>
                )}

                {!success && !error && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xl mb-6 border border-amber-200 dark:border-amber-800">
                        <strong>Local database not ready.</strong> Run <code className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded font-mono text-xs">npx prisma migrate dev</code> to initialize the SQLite database.
                    </div>
                )}

                <OfflineQRList
                    tickets={data || []}
                    totalCount={count || 0}
                    currentPage={currentPage}
                    pageSize={pageSize}
                />
            </main>
        </div>
    );
}
