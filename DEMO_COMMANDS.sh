#!/bin/bash
# QuipoWallet Hackathon Demo Commands
# Run these commands in order for the demo

set -e

echo "🎯 QuipoWallet Hackathon Demo"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Part 1: Bitcoin Balance Check
echo -e "${BLUE}Part 1: Checking Bitcoin MNEE Balance${NC}"
echo "----------------------------------------"
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
echo ""
read -p "Press Enter to continue..."
echo ""

# Part 2: Create Agent Wallet
echo -e "${BLUE}Part 2: Creating Agent Wallet${NC}"
echo "----------------------------------------"
echo "Creating wallet on Sepolia..."
WALLET_ADDRESS=$(./mnee-x create-wallet --chain sepolia 2>&1 | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
echo -e "${GREEN}Wallet Address: $WALLET_ADDRESS${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Part 3: Show Bridge Flow
echo -e "${BLUE}Part 3: Bridge Bitcoin → Sepolia${NC}"
echo "----------------------------------------"
echo "Setting up bridge..."
./mnee-x bridge \
  --from-chain btc \
  --to-chain sepolia \
  --amount 1 \
  --to "$WALLET_ADDRESS" || echo "Bridge setup shown (may require manual steps)"
echo ""
read -p "Press Enter to continue..."
echo ""

# Part 4: Check EVM Balance
echo -e "${BLUE}Part 4: Checking Sepolia Balance${NC}"
echo "----------------------------------------"
./mnee-x balance --chain sepolia --address "$WALLET_ADDRESS" || echo "Balance check (may be 0 if bridge not completed)"
echo ""
read -p "Press Enter to continue..."
echo ""

# Part 5: Show Contracts
echo -e "${BLUE}Part 5: Deployed Contracts${NC}"
echo "----------------------------------------"
echo "Contract addresses on Sepolia:"
cat DEPLOYMENT_SEPOLIA.json | jq '.' || cat DEPLOYMENT_SEPOLIA.json
echo ""

echo -e "${GREEN}✅ Demo Complete!${NC}"
echo ""
echo "Key Points:"
echo "  • MNEE SDK integration for Bitcoin"
echo "  • ERC-4337 Account Abstraction"
echo "  • Cross-chain bridging"
echo "  • Gasless transactions with MNEE"

