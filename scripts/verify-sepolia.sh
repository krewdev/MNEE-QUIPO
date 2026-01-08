#!/bin/bash

# Verify contracts on Sepolia Etherscan
# Requires ETHERSCAN_API_KEY in .env

echo "🔍 Verifying Contracts on Sepolia Etherscan"
echo "=========================================="
echo ""

# Check for API key
if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "❌ ETHERSCAN_API_KEY not found in .env"
    echo ""
    echo "📋 To get an API key:"
    echo "   1. Visit: https://etherscan.io/apis"
    echo "   2. Sign up / Log in"
    echo "   3. Create API key (free)"
    echo "   4. Add to .env: ETHERSCAN_API_KEY=your_key_here"
    echo ""
    exit 1
fi

echo "✅ API key found"
echo ""

# Verify Factory
echo "1️⃣ Verifying Agent Wallet Factory..."
echo "   Address: 0x906CE638DEFf6332969b7A6750A40B47907CC5f6"
echo "   Constructor args: EntryPoint, Owner"
echo ""

npx hardhat verify --network sepolia \
  0x906CE638DEFf6332969b7A6750A40B47907CC5f6 \
  0x0000000071727De22E5E9d8BAf0edAc6f37da032 \
  0xb000dFC8D1CB290834cc59BEe0fBC4e2fd5aD3E3

echo ""
echo ""

# Verify Paymaster
echo "2️⃣ Verifying MNEE Paymaster..."
echo "   Address: 0xB2C5b30F3865A90017D4f915AA90d4A21AbdC032"
echo "   Constructor args: EntryPoint, MNEE Token, Owner, Treasury, Rate"
echo ""

npx hardhat verify --network sepolia \
  0xB2C5b30F3865A90017D4f915AA90d4A21AbdC032 \
  0x0000000071727De22E5E9d8BAf0edAc6f37da032 \
  0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF \
  0xb000dFC8D1CB290834cc59BEe0fBC4e2fd5aD3E3 \
  0xb000dFC8D1CB290834cc59BEe0fBC4e2fd5aD3E3 \
  1000000000000000000

echo ""
echo "✅ Verification complete!"
echo ""
echo "🔗 View verified contracts:"
echo "   Factory: https://sepolia.etherscan.io/address/0x906CE638DEFf6332969b7A6750A40B47907CC5f6#code"
echo "   Paymaster: https://sepolia.etherscan.io/address/0xB2C5b30F3865A90017D4f915AA90d4A21AbdC032#code"

