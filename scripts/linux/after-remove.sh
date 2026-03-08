#!/bin/bash

# Post-removal script for Oclaw on Linux

set -e

# Remove symbolic links
rm -f /usr/local/bin/oclaw 2>/dev/null || true
rm -f /usr/local/bin/openclaw 2>/dev/null || true

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi

echo "Oclaw has been removed."

# Remove AppArmor profile
APPARMOR_PROFILE_TARGET='/etc/apparmor.d/oclaw'
if [ -f "$APPARMOR_PROFILE_TARGET" ]; then
    rm -f "$APPARMOR_PROFILE_TARGET"
fi

echo "Oclaw has been removed."
