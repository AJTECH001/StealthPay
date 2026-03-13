#!/bin/bash
# Deploy / Upgrade StealthPay on Aleo testnet
# Run from contracts/stealthpay/ directory
#
# First-time deploy:   leo deploy --broadcast
# Upgrade (admin only): leo upgrade --broadcast --yes

set -e

PROGRAM_ID="stealthpay_usdcx_v4.aleo"
EXPLORER="https://testnet.explorer.provable.com"

echo "📦 Building ${PROGRAM_ID}..."
leo build

echo ""
# Check if the program is already deployed
echo "🔍 Checking if ${PROGRAM_ID} is already deployed..."
ENDPOINT="https://api.explorer.provable.com/v1"

if leo query program "${PROGRAM_ID}" --endpoint "${ENDPOINT}" >/dev/null 2>&1; then
    echo "   → Program found. Upgrading..."
    echo ""
    echo "🚀 Upgrading ${PROGRAM_ID}..."
    leo upgrade --broadcast --yes --endpoint "${ENDPOINT}"
else
    echo "   → Program not found. Deploying for first time..."
    echo ""
    echo "🚀 Deploying ${PROGRAM_ID}..."
    leo deploy --broadcast --yes --endpoint "${ENDPOINT}"
fi

echo ""
echo "✅ Done! Verify at:"
echo "   ${EXPLORER}/program/${PROGRAM_ID}"
