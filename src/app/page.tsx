import QRScanner from "@/components/QRScanner";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950 px-4 py-8">
      <main className="flex w-full max-w-sm flex-col items-center">

        <div className="flex flex-col items-center gap-2 text-center w-full mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            QR Scanner
          </h1>
        </div>

        <div className="w-full">
          <QRScanner />
        </div>

      </main>
    </div>
  );
}
