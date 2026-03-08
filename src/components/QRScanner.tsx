"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      setScanResult(result[0].rawValue);
      setIsScanning(false);
    } else if (typeof result === "string") {
      setScanResult(result);
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto mt-8">
      {scanResult && (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg w-full text-center break-all border border-zinc-200 dark:border-zinc-700">
          <p className="font-semibold text-sm mb-2 opacity-70">Scanned Result</p>
          {scanResult.startsWith("http") ? (
            <a href={scanResult} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline text-lg font-medium break-words">
              {scanResult}
            </a>
          ) : (
            <p className="text-lg font-medium select-all">{scanResult}</p>
          )}
          <button 
            onClick={() => setScanResult(null)}
            className="mt-4 text-sm px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            Clear Result
          </button>
        </div>
      )}

      {!isScanning ? (
        <button
          onClick={() => setIsScanning(true)}
          className="flex items-center justify-center gap-2 w-full h-14 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open Camera
        </button>
      ) : (
        <div className="w-full flex justify-center mt-2 relative">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-blue-500 shadow-2xl relative bg-black">
            <Scanner 
              onScan={handleScan}
              onError={(error) => console.error("QR Scan Error:", error)}
            />
            <button
              onClick={() => setIsScanning(false)}
              className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/20"
              title="Close Camera"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-0 w-full text-center z-50 pointer-events-none">
              <span className="bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg border border-white/20">
                Point camera at QR code
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
