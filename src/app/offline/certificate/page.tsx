import Link from "next/link";

export default function CertificatePage() {
    const lanIp = process.env.LAN_IP || "192.168.x.x";

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="border-b border-zinc-800 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Local HTTPS Certificates
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Install the root CA on your mobile device so browsers trust the local HTTPS server (required for camera access).
                    </p>
                </div>

                {/* Why needed */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                    <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-2">Why is this needed?</h2>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        Browsers block camera access on non-HTTPS pages. When running the scanner locally on your LAN, the server uses a self-signed cert from <strong>mkcert</strong>.
                        Your phone needs to trust the <em>mkcert root CA</em> for the certificate to be accepted.
                        Once installed, visit <code className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-amber-300 text-xs">https://{lanIp}:3001/offline</code> from your phone.
                    </p>
                </div>

                {/* Step 0 — Run Setup */}
                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Step 0 — Generate Certs (Mac)</h2>
                    <p className="text-sm text-zinc-400">Run this once after installing mkcert + redis:</p>
                    <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">
                        {`brew install mkcert redis
bash scripts/setup-certs.sh
npm run dev:offline    # starts HTTPS on port 3001`}
                    </pre>
                </section>

                {/* Download cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* iOS */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl">
                                🍎
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-100">iPhone / iPad</h3>
                                <p className="text-xs text-zinc-500">iOS 12+ · Safari / Chrome</p>
                            </div>
                        </div>

                        <a
                            href="/offline/certificate/download?type=ios"
                            download="rootCA.pem"
                            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-xl text-center text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download rootCA.pem
                        </a>

                        <div className="space-y-2 text-xs text-zinc-400">
                            <p className="font-semibold text-zinc-300">Install steps:</p>
                            <ol className="list-decimal list-inside space-y-1.5">
                                <li>Open this page on your iPhone in Safari</li>
                                <li>Tap <strong>Download rootCA.pem</strong></li>
                                <li>Tap <em>Allow</em> when prompted to download config</li>
                                <li>Go to <strong>Settings → General → VPN & Device Management</strong></li>
                                <li>Tap the profile and tap <strong>Install</strong></li>
                                <li>Go to <strong>Settings → General → About → Certificate Trust Settings</strong></li>
                                <li>Enable full trust for <em>mkcert…</em></li>
                            </ol>
                        </div>
                    </div>

                    {/* Android */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl">
                                🤖
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-100">Android</h3>
                                <p className="text-xs text-zinc-500">Android 7+ · Chrome</p>
                            </div>
                        </div>

                        <a
                            href="/offline/certificate/download?type=android"
                            download="rootCA.crt"
                            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-xl text-center text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download rootCA.crt
                        </a>

                        <div className="space-y-2 text-xs text-zinc-400">
                            <p className="font-semibold text-zinc-300">Install steps:</p>
                            <ol className="list-decimal list-inside space-y-1.5">
                                <li>Open this page on your Android in Chrome</li>
                                <li>Tap <strong>Download rootCA.crt</strong></li>
                                <li>Open the downloaded file from notifications</li>
                                <li>Name it <em>mkcert</em>, choose <strong>VPN and apps</strong> usage</li>
                                <li>Tap <strong>OK</strong></li>
                                <li>Restart Chrome and visit the HTTPS URL</li>
                            </ol>
                            <p className="text-amber-400 mt-2">
                                ⚠️ On Android 14+, go to <strong>Settings → Security → More security → Encryption & credentials → Install a certificate</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Verify */}
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <h2 className="font-bold text-zinc-100">Verify Connection</h2>
                    <p className="text-sm text-zinc-400">
                        After installing the cert, open this URL on your phone (replace with your Mac&apos;s local IP):
                    </p>
                    <div className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 font-mono text-amber-300 text-sm break-all">
                        https://{lanIp}:3001/offline
                    </div>
                    <p className="text-xs text-zinc-500">
                        Find your Mac&apos;s IP: <code className="font-mono bg-zinc-800 px-1 rounded">ipconfig getifaddr en0</code> (WiFi) or set <code className="font-mono bg-zinc-800 px-1 rounded">LAN_IP</code> in .env.local
                    </p>
                </section>

                <div className="text-center">
                    <Link href="/offline" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                        ← Back to Offline Scanner
                    </Link>
                </div>
            </div>
        </div>
    );
}
