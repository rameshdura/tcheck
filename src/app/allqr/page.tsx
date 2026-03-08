import { getAllScans } from "@/actions/scan-actions";
import Link from "next/link";
import RedisLogs from "./RedisLogs";

export const revalidate = 0; // Force dynamic rendering

export default async function AllQRsPage() {
    const { success, data, error } = await getAllScans();

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
                    <Link
                        href="/"
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-sm border border-zinc-200 dark:border-zinc-800"
                    >
                        ← Back to Scanner
                    </Link>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 border border-red-200">
                        <strong>Error loading scans:</strong> {error}
                    </div>
                )}

                {!data || data.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                        <p className="text-lg text-zinc-500 font-medium">No QR codes scanned yet.</p>
                        <Link href="/" className="text-blue-500 hover:text-blue-600 mt-2 inline-block">
                            Go scan one now!
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
                            <thead className="text-xs uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">QR Data</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Scanned At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-transparent">
                                {data.map((scan) => (
                                    <tr key={scan.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
                        ${scan.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                        ${scan.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
                        ${scan.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
                      `}>
                                                {scan.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 break-all max-w-[300px]">
                                            {scan.qr_data.startsWith('http') ? (
                                                <a href={scan.qr_data} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                    {scan.qr_data}
                                                </a>
                                            ) : (
                                                scan.qr_data
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                                            {new Date(scan.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </main>

            {/* Redis Live Logs Sidebar */}
            <RedisLogs />
        </div>
    );
}
