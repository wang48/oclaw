#!/bin/bash

# Post-installation script for Oclaw on Linux

set -e

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi

# Create symbolic link for Oclaw app binary
if [ -x /opt/Oclaw/oclaw ]; then
    ln -sf /opt/Oclaw/oclaw /usr/local/bin/oclaw 2>/dev/null || true
fi

# Create symbolic link for openclaw CLI
OPENCLAW_WRAPPER="/opt/Oclaw/resources/cli/openclaw"
if [ -f "$OPENCLAW_WRAPPER" ]; then
    chmod +x "$OPENCLAW_WRAPPER" 2>/dev/null || true
    ln -sf "$OPENCLAW_WRAPPER" /usr/local/bin/openclaw 2>/dev/null || true
fi

echo "Oclaw has been installed successfully."
