#!/bin/bash
set -eu

echo "=== Starting gfarm-http-gateway container ==="

# Setup gfarm2.conf
if [ -f /config/gfarm2.conf ]; then
    echo "[INFO] Linking /config/gfarm2.conf to /usr/local/etc/gfarm2.conf"
    ln -sf /config/gfarm2.conf /usr/local/etc/gfarm2.conf
else
    echo "[WARN] /config/gfarm2.conf not found"
fi

# Copy certificate files
if [ -d /config/certs ]; then
    echo "[INFO] Copying certs from /config/certs to /etc/pki/tls/certs/gfarm/"
    mkdir -p /etc/pki/tls/certs/gfarm
    cp -u /config/certs/* /etc/pki/tls/certs/gfarm/
else
    echo "[WARN] /config/certs not found"
fi

# Setup gfarm-http.conf
if [ -f /config/gfarm-http.conf ]; then
    echo "[INFO] Linking /config/gfarm-http.conf to /app/gfarm-http-gateway/gfarm-http.conf"
    ln -sf /config/gfarm-http.conf /app/gfarm-http-gateway/gfarm-http.conf
else
    echo "[WARN] /config/gfarm-http.conf not found"
fi

# Trust custom CA
if [ -f /config/dev_ca.crt ]; then
    echo "[INFO] Custom CA found at /config/dev_ca.crt — installing"
    cp /config/dev_ca.crt /usr/local/share/ca-certificates/dev_ca.crt
    update-ca-certificates
fi

# Launch gateway
echo "[INFO] Launching gfarm-http-gateway..."
exec /app/gfarm-http-gateway/bin/gfarm-http-gateway.sh --proxy-headers "$@"
