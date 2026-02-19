#!/bin/bash
# Deploy/Upgrade StealthPay on Aleo testnet
# Run from stealthpaycontract/ directory

set -e

echo "📦 Building stealthpay.aleo..."
leo build

echo ""
echo "🚀 Deploying/upgrading stealthpay.aleo..."
leo upgrade --broadcast --yes

echo ""
echo "✅ Done! Verify at:"
echo "   https://testnet.explorer.provable.com/program/stealthpay.aleo"
