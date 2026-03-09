"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { validateTicketsBulk, TicketValidationResult, ValidationSummary, getTicketDetails, TicketRecord } from "@/actions/scan-actions";

const TYPE_MAP: Record<number, string> = {
  1: 'STANDARD',
  2: 'VIP',
  3: 'EARLY BIRD'
};

const VENDOR_MAP: Record<number, string> = {
  1: 'ticketkhai',
  2: 'yohoticket'
};

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(true);
  const [currentScan, setCurrentScan] = useState<string | null>(null);
  const [stagedScans, setStagedScans] = useState<string[]>([]);
  const [selectedScanIndex, setSelectedScanIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<TicketRecord | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // New States for UI polish
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<TicketValidationResult[] | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);

  // Auto-hide duplicate warning after 3 seconds
  useEffect(() => {
    if (duplicateWarning) {
      const timer = setTimeout(() => setDuplicateWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [duplicateWarning]);

  const handleScan = (result: any) => {
    if (!isScanning) return;
    let qrValue = "";
    if (result && result.length > 0) qrValue = result[0].rawValue;
    else if (typeof result === "string") qrValue = result;

    if (!qrValue) return;

    if (stagedScans.includes(qrValue)) {
      setDuplicateWarning("QR Code already scanned in this batch!");
      // Don't stop scanning, let them keep going
      return;
    }

    setCurrentScan(qrValue);
    setIsScanning(false);
    setErrorDetails(null);
  };

  const handleStageScan = () => {
    if (!currentScan) return;
    setStagedScans([...stagedScans, currentScan]);
    setCurrentScan(null);
    setIsScanning(true);
  };

  const handleScanNewClick = () => {
    // Completely reset the flow for a new batch
    setIsScanning(true);
    setCurrentScan(null);
    setStagedScans([]);
    setSelectedScanIndex(null);
    setValidationResults(null);
    setValidationSummary(null);
    setErrorDetails(null);
    setDuplicateWarning(null);
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
    setValidationResults(null);
    setValidationSummary(null);

    const { success, results, summary, error } = await validateTicketsBulk(stagedScans);

    if (success && results && summary) {
      setValidationResults(results);
      setValidationSummary(summary);
      // We clear the staged stack visually, but we keep the results to display
      setStagedScans([]);
      setSelectedScanIndex(null);
      setIsScanning(false); // Stop camera to read results
    } else {
      setErrorDetails(error || "Validation failed.");
    }

    setIsProcessing(false);
  };

  const handleOpenDetails = async (qr: string) => {
    setDetailsModalOpen(true);
    setIsLoadingDetails(true);
    setSelectedTicketDetails(null);

    const { success, data, error } = await getTicketDetails(qr);
    if (success && data) {
      setSelectedTicketDetails(data);
    } else {
      // Display error nicely or close
      console.error(error);
    }
    setIsLoadingDetails(false);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedTicketDetails(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col mt-4">
      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-top-4 fade-in duration-300">
          {duplicateWarning}
        </div>
      )}

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

        {/* Result & Bulk Add - Hide if we are showing validation results */}
        {!validationResults && (
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
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleScanNewClick}
            className={`flex-1 ${validationResults ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"} py-3.5 rounded-xl font-semibold transition-all active:scale-95 shadow-sm border border-zinc-200 dark:border-zinc-700`}
          >
            Scan New
          </button>

          {!validationResults && (
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
          )}
        </div>

        {/* Validation Results UI */}
        {validationSummary && validationResults && (
          <div className="mt-2 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            {/* Summary Block */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                {validationSummary.validCount} Valid / {validationSummary.total} Scanned
              </h3>
              {Object.keys(validationSummary.types).length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {Object.entries(validationSummary.types).map(([type, count]) => (
                    <span key={type} className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded-md">
                      {count}x {type}
                    </span>
                  ))}
                </div>
              )}
              {validationSummary.invalidCount > 0 && (
                <p className="text-rose-600 dark:text-rose-400 text-xs font-semibold mt-2">
                  {validationSummary.invalidCount}x USED / INVALID
                </p>
              )}
            </div>

            {/* Detailed List */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {validationResults.map((res, idx) => (
                <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1
                  ${res.status === 'VALID' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' :
                    res.status === 'USED' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                      'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'}
                `}>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs text-zinc-500 truncate max-w-[150px]" title={res.qr}>{res.qr}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded
                      ${res.status === 'VALID' ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300' :
                        res.status === 'USED' ? 'bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300' :
                          'bg-rose-200 text-rose-800 dark:bg-rose-800/50 dark:text-rose-300'}
                    `}>
                      {res.status}
                    </span>
                  </div>
                  {(res.type || res.vendor) && (
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        {res.type && <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{res.type}</span>}
                        {res.vendor && <span className="text-xs text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">{res.vendor}</span>}
                      </div>

                      <button
                        onClick={() => handleOpenDetails(res.qr)}
                        className="text-[10px] font-bold uppercase tracking-wide bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                      >
                        Details
                      </button>
                    </div>
                  )}
                  {(!res.type && !res.vendor) && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleOpenDetails(res.qr)}
                        className="text-[10px] font-bold uppercase tracking-wide bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                      >
                        Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staged Scans Stack (only show if actively scanning/staging, not after validation) */}
        {!validationResults && stagedScans.length > 0 && (
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
      </div>

      {/* Details Modal Overlay */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Ticket Database Record</h3>
              <button onClick={closeDetailsModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-zinc-500">Fetching direct from Supabase...</p>
                </div>
              ) : selectedTicketDetails ? (
                <div className="flex flex-col gap-4">
                  {/* Status header */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3
                    ${selectedTicketDetails.valid === 1
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'}`}>
                    <div className={`w-3 h-3 rounded-full ${selectedTicketDetails.valid === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Status</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedTicketDetails.valid === 1 ? 'UNUSED & VALID' : 'USED / INVALID'}</p>
                    </div>
                  </div>

                  {/* Core Data Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 col-span-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Customer Name</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate" title={selectedTicketDetails.name}>{selectedTicketDetails.name || 'N/A'}</p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Type ID</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={selectedTicketDetails.typeid}>{selectedTicketDetails.typeid}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Ticket Type</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{TYPE_MAP[selectedTicketDetails.type] || `Type ${selectedTicketDetails.type}`}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Vendor</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{VENDOR_MAP[selectedTicketDetails.vendor] || `Vendor ${selectedTicketDetails.vendor}`}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">User ID</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={selectedTicketDetails.userid}>{selectedTicketDetails.userid || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Transaction ID</p>
                    <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 break-all">{selectedTicketDetails.transactionid || 'N/A'}</p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">QR Code Key</p>
                    <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 break-all">{selectedTicketDetails.qr}</p>
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Created At (JST):</span>
                      <span className="text-zinc-900 dark:text-zinc-300 font-mono">
                        {new Date(selectedTicketDetails.created).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Checked At (JST):</span>
                      <span className="text-zinc-900 dark:text-zinc-300 font-mono">
                        {selectedTicketDetails.updated_at
                          ? new Date(selectedTicketDetails.updated_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-rose-500">
                  <p>Could not load ticket data.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={closeDetailsModal}
                className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl font-bold transition-colors text-zinc-900 dark:text-zinc-100"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
