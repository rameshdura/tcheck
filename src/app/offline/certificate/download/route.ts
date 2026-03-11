import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const certsDir = path.join(process.cwd(), "certs");

    // Determine file and content-disposition based on type
    let fileName: string;
    let downloadName: string;

    if (type === "android") {
        fileName = "rootCA.crt";
        downloadName = "mkcert-rootCA.crt";
    } else {
        // default: ios
        fileName = "rootCA.pem";
        downloadName = "mkcert-rootCA.pem";
    }

    const filePath = path.join(certsDir, fileName);

    if (!fs.existsSync(filePath)) {
        return new NextResponse(
            JSON.stringify({
                error:
                    "Certificate not found. Run 'bash scripts/setup-certs.sh' first to generate certificates.",
            }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": type === "android" ? "application/x-x509-ca-cert" : "application/x-pem-file",
                "Content-Disposition": `attachment; filename="${downloadName}"`,
                "Content-Length": fileBuffer.length.toString(),
            },
        });
    } catch (err) {
        console.error("Cert download error:", err);
        return new NextResponse(JSON.stringify({ error: "Failed to read certificate file." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
