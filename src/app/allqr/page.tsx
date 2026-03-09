import { getPaginatedTickets } from "@/actions/scan-actions";
import Link from "next/link";
import QRList from "./QRList";

export const revalidate = 0; // Force dynamic rendering

export default async function AllQRsPage(props: { searchParams: Promise<{ page?: string }> }) {
    const searchParams = await props.searchParams;
    const currentPage = parseInt(searchParams.page || "1", 10);
    const pageSize = 10;

    const { success, data, count, error } = await getPaginatedTickets(currentPage, pageSize);

    return (
        <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950 p-4 gap-4 flex-col lg:flex-row items-start justify-center">
            <main className="w-full max-w-4xl py-12 px-6 sm:px-12 bg-white dark:bg-black rounded-3xl shadow-sm sm:shadow-lg sm:border border-zinc-200 dark:border-zinc-800">

                <div className="flex justify-between items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Scanned QR Codes
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            Currently stored in your Supabase database.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/import"
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            Import CSV
                        </Link>
                        <Link
                            href="/"
                            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-sm border border-zinc-200 dark:border-zinc-800"
                        >
                            ← Back to Scanner
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 border border-red-200">
                        <strong>Error loading tickets:</strong> {error}
                    </div>
                )}

                <QRList
                    tickets={data || []}
                    totalCount={count || 0}
                    currentPage={currentPage}
                    pageSize={pageSize}
                />

            </main>
        </div>
    );
}
