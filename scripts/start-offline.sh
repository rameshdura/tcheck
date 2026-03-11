#!/bin/bash
# start-offline.sh
# Run via: npm run dev:offline
#
# What this does every time:
#   1. Detects your current LAN IP(s)
#   2. Regenerates the TLS cert to include them (the rootCA stays the same — phones trust it forever)
#   3. Writes the discovered LAN_IP to .env.local so the /certificate page shows the correct URL
#   4. Starts Next.js with HTTPS on port 3001

set -e

CERTS_DIR="$(dirname "$0")/../certs"
ENV_FILE="$(dirname "$0")/../.env.local"

# ── 1. Check root CA exists ────────────────────────────────────────────────────
if [ ! -f "$CERTS_DIR/rootCA.pem" ]; then
  echo ""
  echo "❌  Root CA not found. Run this first:"
  echo "    bash scripts/setup-certs.sh"
  echo ""
  exit 1
fi

# ── 1b. Bootstrap SQLite DB if this is a fresh clone ─────────────────────────
DB_FILE="$(dirname "$0")/../prisma/tcheck-offline.db"
if [ ! -f "$DB_FILE" ]; then
  echo "🗄️  SQLite DB not found — running prisma db push to create it..."
  npx prisma db push --skip-generate
  echo "✅  Database created at prisma/tcheck-offline.db"
  echo ""
fi

# ── 2. Detect all active LAN IPs ─────────────────────────────────────────────
EXTRA_IPS=""
for iface in en0 en1 en2 bridge0 utun0; do
  IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [ -n "$IP" ]; then
    EXTRA_IPS="$EXTRA_IPS $IP"
    echo "📡 Found network interface $iface → $IP"
  fi
done

# Pick the first one as the "primary" LAN IP for the certificate page
PRIMARY_IP=$(echo "$EXTRA_IPS" | awk '{print $1}')

# ── 3. Regenerate TLS cert with current IPs ───────────────────────────────────
echo ""
echo "🔐 Generating TLS cert for: localhost 127.0.0.1 ::1$EXTRA_IPS"
JAVA_HOME="" mkcert \
  -cert-file "$CERTS_DIR/localhost.pem" \
  -key-file  "$CERTS_DIR/localhost-key.pem" \
  localhost 127.0.0.1 ::1 $EXTRA_IPS

# ── 4. Update LAN_IP in .env.local ───────────────────────────────────────────
if [ -n "$PRIMARY_IP" ]; then
  if grep -q "^LAN_IP=" "$ENV_FILE" 2>/dev/null; then
    # Replace existing line
    sed -i '' "s/^LAN_IP=.*/LAN_IP=$PRIMARY_IP/" "$ENV_FILE"
  else
    echo "LAN_IP=$PRIMARY_IP" >> "$ENV_FILE"
  fi
  echo "✅  LAN_IP set to $PRIMARY_IP in .env.local"
  echo "📱  Mobile URL: https://$PRIMARY_IP:3001/offline"
fi

echo ""
echo "🚀 Starting offline dev server (HTTPS on port 3001)..."
echo ""

# ── 5. Start Next.js with HTTPS ───────────────────────────────────────────────
exec node_modules/.bin/next dev \
  --experimental-https \
  --experimental-https-key "$CERTS_DIR/localhost-key.pem" \
  --experimental-https-cert "$CERTS_DIR/localhost.pem" \
  --port 3001
