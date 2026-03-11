import OfflineQRScanner from "@/components/OfflineQRScanner";

export default function OfflinePage() {
    return (
        <div className="flex min-h-[calc(100vh-40px)] items-center justify-center bg-zinc-950 font-sans px-4 py-8">
            <main className="flex w-full max-w-sm flex-col items-center">
                <div className="flex flex-col items-center gap-2 text-center w-full mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                        QR Scanner
                    </h1>
                    <p className="text-sm text-amber-400 font-medium">Offline Mode — Powered by local Redis</p>
                </div>
                <div className="w-full">
                    <OfflineQRScanner />
                </div>
            </main>
        </div>
    );
}
