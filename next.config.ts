import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all local network IPs (needed when accessing from mobile over LAN)
  // No changes needed - Next.js dev server binds to 0.0.0.0 by default
};

export default nextConfig;
