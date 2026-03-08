import Image from "next/image";
import QRScanner from "@/components/QRScanner";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-xl flex-col items-center py-20 px-6 sm:px-12 bg-white dark:bg-black rounded-3xl shadow-sm sm:shadow-lg sm:border border-zinc-200 dark:border-zinc-800 m-4">
        <Image
          className="dark:invert mb-8"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={30}
          priority
        />

        <div className="flex flex-col items-center gap-2 text-center w-full mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            QR Scanner Demo
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Tap the button below to scan a QR code using your device camera.
          </p>
        </div>

        <div className="w-full">
          <QRScanner />
        </div>

      </main>
    </div>
  );
}
