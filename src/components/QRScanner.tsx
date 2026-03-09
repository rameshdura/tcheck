"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { saveScan } from "@/actions/scan-actions";

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(true);
  const [currentScan, setCurrentScan] = useState<string | null>(null);
  const [stagedScans, setStagedScans] = useState<string[]>([]);
  const [selectedScanIndex, setSelectedScanIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (!isScanning) return; // Prevent continuous scanning if already captured
    let qrValue = "";
    if (result && result.length > 0) qrValue = result[0].rawValue;
    else if (typeof result === "string") qrValue = result;

    if (!qrValue) return;

    setCurrentScan(qrValue);
    setIsScanning(false);
    setErrorDetails(null);
    setSuccessMessage(null);
  };

  const handleStageScan = () => {
    if (!currentScan) return;
    setStagedScans([...stagedScans, currentScan]);
    setCurrentScan(null);
    setIsScanning(true); // Auto-resume scanning after adding to bulk
    setSuccessMessage(null);
  };

  const handleScanClick = () => {
    setIsScanning(true);
    setCurrentScan(null);
    setSuccessMessage(null);
    setErrorDetails(null);
  };

  const handleRemoveStaged = (index: number) => {
    const newStaged = [...stagedScans];
    newStaged.splice(index, 1);
    setStagedScans(newStaged);
    setSelectedScanIndex(null);
  };

  const handleValidateBulk = async () => {
    if (stagedScans.length === 0) return;
    setIsProcessing(true);
    setErrorDetails(null);
    setSuccessMessage(null);

    let failCount = 0;
    for (const scan of stagedScans) {
      const { success, error } = await saveScan(scan);
      if (!success) {
        failCount++;
        console.error("Failed to save scan:", error);
      }
    }

    if (failCount > 0) {
      setErrorDetails(`Failed to validate ${failCount} scans.`);
      // We don't clear the staged scans if some failed, to allow retry
    } else {
      setSuccessMessage(`Successfully validated ${stagedScans.length} scans!`);
      setStagedScans([]);
      setSelectedScanIndex(null);
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col mt-4">
      {/* Camera Area */}
      <div className="w-full bg-black relative aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-3xl border-b-4 border-black dark:border-zinc-800">
        {isScanning ? (
          <Scanner
            onScan={handleScan}
            onError={(error) => console.error("QR Scan Error:", error)}
          />
        ) : (
          <div className="text-zinc-500 flex flex-col items-center justify-center p-6 text-center">
            <svg className="w-10 h-10 opacity-40 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" />
            </svg>
            <span className="text-base font-medium">Scanner Paused</span>
          </div>
        )}
      </div>

      {/* Control Area */}
      <div className="p-5 flex flex-col gap-5">

        {/* Result & Bulk Add */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 min-w-0 shadow-inner">
            <p className="text-zinc-900 dark:text-zinc-100 font-mono text-sm truncate">
              {currentScan || "Waiting for scan..."}
            </p>
          </div>
          <button
            onClick={handleStageScan}
            disabled={!currentScan}
            className="w-12 h-12 flex-shrink-0 bg-blue-600 disabled:bg-zinc-300 disabled:dark:bg-zinc-800 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center text-3xl font-light transition-all shadow-sm active:scale-95 disabled:active:scale-100"
          >
            +
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleScanClick}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 py-3.5 rounded-xl font-semibold transition-all active:scale-95 shadow-sm border border-zinc-200 dark:border-zinc-700"
          >
            Scan
          </button>
          <button
            onClick={handleValidateBulk}
            disabled={stagedScans.length === 0 || isProcessing}
            className="flex-[1.5] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span className="animate-pulse">Validating...</span>
            ) : (
              <>
                Validate {stagedScans.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{stagedScans.length}</span>}
              </>
            )}
          </button>
        </div>

        {/* Staged Scans Stack */}
        {stagedScans.length > 0 && (
          <div className="mt-1 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Staged Scans
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {stagedScans.map((scan, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedScanIndex(selectedScanIndex === idx ? null : idx)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900
                    ${selectedScanIndex === idx
                      ? "bg-emerald-700 text-white scale-110 shadow-lg ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-900"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                    }
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* Selected Scan Details */}
            {selectedScanIndex !== null && (
              <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ticket Details</span>
                  <button
                    onClick={() => handleRemoveStaged(selectedScanIndex)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-semibold px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 break-all font-mono leading-relaxed">
                    {stagedScans[selectedScanIndex]}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Messages */}
        {errorDetails && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-sm font-medium text-center animate-in fade-in">
            {errorDetails}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm font-medium text-center animate-in fade-in">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
