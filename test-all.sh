#!/bin/bash

# Comprehensive Test Script for QuipoWallet
# Tests all components: CLI, contracts, frontend, cross-chain

echo "🧪 QuipoWallet Comprehensive Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_command() {
    local name=$1
    local cmd=$2
    
    echo -n "Testing $name... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "📦 1. CLI Tests"
echo "---------------"

# Test CLI build
test_command "CLI build" "cd cli && npm run build"

# Test CLI commands
test_command "CLI help" "cd cli && node dist/index.js --help"

test_command "CLI chains command" "cd cli && node dist/index.js chains"

test_command "CLI balance help" "cd cli && node dist/index.js balance --help"

test_command "CLI bridge help" "cd cli && node dist/index.js bridge --help"

test_command "CLI send help" "cd cli && node dist/index.js send --help"

echo ""
echo "📜 2. Smart Contract Tests"
echo "-------------------------"

# Test contract compilation
test_command "Contract compilation" "npm run compile"

# Test contract tests
if [ -f "test/Paymaster.test.ts" ]; then
    test_command "Paymaster tests" "npm run test -- test/Paymaster.test.ts"
fi

echo ""
echo "🌐 3. Configuration Tests"
echo "------------------------"

# Test network config
test_command "Network config exists" "[ -f config/networks.ts ]"

# Test env file exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  .env file not found (optional)${NC}"
fi

echo ""
echo "🔧 4. Dependencies Tests"
echo "----------------------"

test_command "Node.js installed" "node --version"

test_command "npm installed" "npm --version"

test_command "TypeScript installed" "cd cli && npm list typescript > /dev/null"

test_command "ethers.js installed" "cd cli && npm list ethers > /dev/null"

test_command "axios installed" "cd cli && npm list axios > /dev/null"

echo ""
echo "📱 5. Frontend Tests"
echo "-------------------"

if [ -d "frontend" ]; then
    test_command "Frontend build" "cd frontend && npm run build > /dev/null 2>&1"
    
    test_command "Frontend Next.js config" "[ -f frontend/next.config.js ]"
    
    test_command "Frontend components exist" "[ -d frontend/components ]"
fi

echo ""
echo "🔗 6. Integration Tests"
echo "---------------------"

# Test OrdinalsBot integration
test_command "OrdinalsBot client exists" "[ -f cli/src/ordinalsbot.ts ]"

test_command "Bitcoin integration exists" "[ -f cli/src/bitcoin.ts ]"

test_command "Bridge integration exists" "[ -f cli/src/bridge.ts ]"

echo ""
echo "📚 7. Documentation Tests"
echo "------------------------"

test_command "README exists" "[ -f README.md ]"

test_command "HACKATHON.md exists" "[ -f HACKATHON.md ]"

test_command "SUBMISSION_CHECKLIST.md exists" "[ -f SUBMISSION_CHECKLIST.md ]"

echo ""
echo "========================================"
echo "📊 Test Results"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review output above.${NC}"
    exit 1
fi

