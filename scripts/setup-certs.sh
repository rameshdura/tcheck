#!/bin/bash
# setup-certs.sh — Generate local HTTPS certs using mkcert
# Run once: bash scripts/setup-certs.sh
# Setting JAVA_HOME="" suppresses the harmless "keytool" error when Java is not installed.

echo "📦 Installing mkcert CA into system trust stores..."
JAVA_HOME="" mkcert -install

echo "📂 Creating certs/ directory..."
mkdir -p certs

# Auto-detect LAN IP (works on macOS)
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

echo "🔐 Generating cert for localhost + LAN IP: ${LAN_IP:-'(none detected)'}..."
if [ -n "$LAN_IP" ]; then
  JAVA_HOME="" mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem \
    localhost 127.0.0.1 ::1 "$LAN_IP"
else
  JAVA_HOME="" mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem \
    localhost 127.0.0.1 ::1
fi

echo "📋 Copying root CA for download..."
CAROOT=$(JAVA_HOME="" mkcert -CAROOT)
cp "$CAROOT/rootCA.pem" certs/rootCA.pem
cp "$CAROOT/rootCA.pem" certs/rootCA.crt

echo ""
echo "✅ Done! Certs are in the certs/ directory."
echo "   • TLS cert:     certs/localhost.pem"
echo "   • TLS key:      certs/localhost-key.pem"
echo "   • iOS CA:       certs/rootCA.pem"
echo "   • Android CA:   certs/rootCA.crt"
if [ -n "$LAN_IP" ]; then
  echo ""
  echo "📱 Mobile URL: https://$LAN_IP:3001/offline"
  echo "   Add to .env.local: LAN_IP=$LAN_IP"
fi
echo ""
echo "Next: brew services start redis && npm run dev:offline"
