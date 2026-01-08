#!/bin/bash

# Manual Test Checklist
# Run each test individually to verify functionality

echo "🧪 Manual Test Checklist"
echo "========================"
echo ""

echo "✅ 1. CLI Functionality"
echo "   - [x] CLI builds: cd cli && npm run build"
echo "   - [x] Chains command works: cd cli && ./mnee-x chains"
echo "   - [x] Balance command works: cd cli && ./mnee-x balance --chain ethereum --address 0x..."
echo ""

echo "✅ 2. Smart Contracts"
echo "   - [ ] Contracts compile: npm run compile"
echo "   - [ ] Tests pass: npm run test"
echo "   - [ ] Contracts deploy: npm run deploy:sepolia"
echo ""

echo "✅ 3. Frontend"
echo "   - [ ] Frontend builds: cd frontend && npm run build"
echo "   - [ ] Frontend runs: cd frontend && npm run dev"
echo "   - [ ] All components render"
echo ""

echo "✅ 4. Integration"
echo "   - [x] CLI connects to OrdinalsBot API"
echo "   - [x] CLI connects to EVM RPCs"
echo "   - [ ] Paymaster integration works"
echo "   - [ ] Bridge integration works"
echo ""

echo "✅ 5. End-to-End Flow"
echo "   - [ ] Create wallet via frontend"
echo "   - [ ] Check balance"
echo "   - [ ] Approve MNEE"
echo "   - [ ] Send gasless transaction"
echo "   - [ ] View dashboard"
echo ""

echo "Run: ./test-manual.sh to see this checklist"

