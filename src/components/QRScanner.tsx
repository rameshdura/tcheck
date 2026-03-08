"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { saveScan, updateScanStatus, ScanRecord, ScanStatus } from "@/actions/scan-actions";

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [activeScan, setActiveScan] = useState<ScanRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleScan = async (result: any) => {
    let qrValue = "";
    if (result && result.length > 0) qrValue = result[0].rawValue;
    else if (typeof result === "string") qrValue = result;

    if (!qrValue) return;

    setIsScanning(false);
    setIsProcessing(true);
    setErrorDetails(null);

    const { success, data, error } = await saveScan(qrValue);

    if (success && data) {
      setActiveScan(data);
    } else {
      setErrorDetails(error || "Failed to save scan");
    }

    setIsProcessing(false);
  };

  const handleStatusUpdate = async (newStatus: ScanStatus) => {
    if (!activeScan) return;
    setIsProcessing(true);

    const { success, data, error } = await updateScanStatus(activeScan.id, newStatus);

    if (success && data) {
      setActiveScan(data);
    } else {
      setErrorDetails(error || "Failed to update status");
    }
    setIsProcessing(false);
  };

  const resetScan = () => {
    setActiveScan(null);
    setErrorDetails(null);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto mt-8">
      {isProcessing && (
        <div className="w-full p-4 flex justify-center text-zinc-500 animate-pulse">
          Processing...
        </div>
      )}

      {errorDetails && (
        <div className="w-full p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm mb-2 text-center">
          {errorDetails}
        </div>
      )}

      {activeScan && !isProcessing && (
        <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-500">Scan Result</span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
              ${activeScan.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
              ${activeScan.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : ''}
              ${activeScan.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
            `}>
              {activeScan.status}
            </span>
          </div>

          <div className="p-4">
            {activeScan.qr_data.startsWith("http") ? (
              <a href={activeScan.qr_data} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline text-lg font-medium break-all">
                {activeScan.qr_data}
              </a>
            ) : (
              <p className="text-lg font-medium select-all break-all text-zinc-900 dark:text-zinc-100">{activeScan.qr_data}</p>
            )}
          </div>

          <div className="p-4 bg-zinc-100 dark:bg-zinc-950/50 flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <button
                onClick={() => handleStatusUpdate('approved')}
                disabled={activeScan.status === 'approved'}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={activeScan.status === 'rejected'}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                Reject
              </button>
            </div>
            {activeScan.status !== 'pending' && (
              <button
                onClick={() => handleStatusUpdate('pending')}
                className="w-full py-2 bg-zinc-200 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm font-medium text-zinc-700 rounded-lg transition"
              >
                Mark Pending
              </button>
            )}
            <button
              onClick={resetScan}
              className="w-full py-2 mt-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm font-medium transition"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {!isScanning && !activeScan && !isProcessing && (
        <button
          onClick={() => setIsScanning(true)}
          className="flex items-center justify-center gap-2 w-full h-14 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md mt-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open Camera
        </button>
      )}

      {isScanning && !isProcessing && (
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
