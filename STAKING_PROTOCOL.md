# 🏦 MNEE Staking Protocol with USDC Borrowing

## Overview

The MNEE Staking Protocol allows users to:
1. **Stake MNEE tokens** and earn rewards
2. **Borrow USDC** against staked MNEE (collateralized lending)
3. **Use borrowed USDC** for agentic operations
4. **Integrate with liquidity hubs** for capital efficiency

---

## 🎯 Key Features

### 1. Staking
- Stake MNEE tokens (minimum 100 MNEE)
- Earn staking rewards (configurable APY, default 5%)
- Automatic reward accrual
- Claim rewards anytime

### 2. Borrowing
- Borrow USDC against staked MNEE
- 150% collateralization ratio required (1.5x)
- Liquidation threshold at 120%
- Interest rate: 12% APY (configurable)

### 3. Agent Integration
- Agent wallets can stake and borrow in one transaction
- Borrowed USDC available immediately for operations
- Seamless integration with existing AgentWallet

### 4. Liquidity Hub
- External liquidity providers can add USDC
- Enables borrowing capacity
- Integration with Wallet Base and other DeFi protocols

---

## 📊 Architecture

```
┌─────────────┐
│   User      │
│  (Agent)    │
└──────┬──────┘
       │
       │ Stake MNEE
       ↓
┌─────────────┐         ┌──────────────┐
│ MNEEStaking │────────▶│ Liquidity Hub│
│  Contract   │         │  (USDC Pool) │
└──────┬──────┘         └──────────────┘
       │
       │ Borrow USDC
       ↓
┌─────────────┐
│   Agent     │
│  Wallet     │
│ (Operations)│
└─────────────┘
```

---

## 🔧 Contract Details

### MNEEStaking.sol

**Key Functions:**
- `stake(uint256 amount)` - Stake MNEE tokens
- `unstake(uint256 amount)` - Unstake MNEE (if properly collateralized)
- `borrow(uint256 usdcAmount)` - Borrow USDC against staked MNEE
- `repay(uint256 usdcAmount)` - Repay borrowed USDC
- `claimRewards()` - Claim staking rewards
- `liquidate(address staker)` - Liquidate undercollateralized positions

**Parameters:**
- Minimum stake: 100 MNEE
- Collateral ratio: 150% (1.5x)
- Liquidation threshold: 120%
- Staking APY: 5% (configurable)
- Borrowing APY: 12% (configurable)

### AgentWalletStaking.sol

**Key Functions:**
- `stakeAndBorrow(uint256 mneeAmount, uint256 usdcBorrowAmount)` - Stake and borrow in one tx
- `getMaxBorrowable()` - Get maximum borrowable USDC
- `repayBorrow(uint256 usdcAmount)` - Repay borrowed USDC
- `claimStakingRewards()` - Claim rewards

---

## 💡 Use Cases

### 1. Agent Needs USDC for Operations

```
1. Agent stakes 1000 MNEE
2. Agent borrows 666 USDC (within 150% ratio)
3. Agent uses USDC for operations
4. Agent repays USDC + interest
5. Agent unstakes MNEE + claims rewards
```

### 2. Long-term Staking with Borrowing

```
1. User stakes 10,000 MNEE
2. User borrows 6,666 USDC
3. User uses USDC for DeFi operations
4. Staking rewards accrue over time
5. User repays USDC when ready
```

### 3. Agentic Automation

```
1. Agent wallet automatically stakes MNEE
2. Agent borrows USDC at moment of need
3. Agent executes operations with USDC
4. Agent repays from operation profits
```

---

## 🔒 Security Features

1. **Collateralization Checks**
   - Must maintain 150% collateralization
   - Cannot unstake if it would break ratio

2. **Liquidation Protection**
   - Liquidate if collateral drops below 120%
   - 5% bonus for liquidators

3. **Reentrancy Protection**
   - All external calls protected
   - NonReentrant modifiers

4. **Pausable**
   - Owner can pause in emergencies
   - Protects against exploits

---

## 📈 Economic Model

### Staking Rewards
- **Source**: Protocol fees, yield farming, treasury
- **Distribution**: Pro-rata based on stake amount
- **APY**: 5% (configurable by owner)

### Borrowing Costs
- **Interest Rate**: 12% APY (configurable)
- **Payment**: Paid in USDC when repaying
- **Purpose**: Incentivize liquidity providers

### Liquidation
- **Threshold**: 120% collateralization
- **Bonus**: 5% to liquidator
- **Purpose**: Maintain protocol solvency

---

## 🚀 Integration with Wallet Base

### Wallet Base Integration

```solidity
// In Wallet Base compatible contract
interface IWalletBase {
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount) external;
}

// MNEEStaking can integrate with Wallet Base
function depositToWalletBase(uint256 usdcAmount) external {
    // Transfer USDC to Wallet Base
    usdcToken.approve(walletBase, usdcAmount);
    IWalletBase(walletBase).deposit(address(usdcToken), usdcAmount);
}
```

### Liquidity Hub Integration

```solidity
// Liquidity providers can add USDC
function addLiquidity(uint256 usdcAmount) external {
    // Adds USDC to borrowing pool
    stakingContract.addLiquidity(usdcAmount);
}
```

---

## 📝 Deployment Steps

1. **Deploy USDC Token** (or use existing)
   ```bash
   # Use existing USDC on Sepolia or deploy mock
   ```

2. **Deploy MNEEStaking**
   ```solidity
   new MNEEStaking(
       mneeTokenAddress,
       usdcTokenAddress,
       liquidityHubAddress,
       ownerAddress
   )
   ```

3. **Deploy AgentWalletStaking** (optional)
   ```solidity
   new AgentWalletStaking(
       entryPoint,
       stakingContract,
       usdcToken
   )
   ```

4. **Fund Liquidity Hub**
   ```solidity
   stakingContract.addLiquidity(initialUSDCAmount);
   ```

---

## 🧪 Testing

### Test Scenarios

1. **Stake and Borrow**
   ```javascript
   // Stake 1000 MNEE
   await staking.stake(ethers.parseEther("1000"));
   
   // Borrow 666 USDC (within 150% ratio)
   await staking.borrow(ethers.parseUnits("666", 6));
   ```

2. **Claim Rewards**
   ```javascript
   // Wait for rewards to accrue
   await time.increase(365 * 24 * 60 * 60); // 1 year
   
   // Claim rewards
   await staking.claimRewards();
   ```

3. **Liquidation**
   ```javascript
   // If collateral drops below 120%, liquidate
   await staking.liquidate(undercollateralizedStaker);
   ```

---

## 🔗 Integration Points

### With Existing QuipoWallet

1. **Paymaster Integration**
   - Agents can use borrowed USDC to pay for gas
   - Convert USDC to MNEE if needed

2. **Bridge Integration**
   - Stake MNEE from Bitcoin bridge
   - Borrow USDC for operations

3. **Agent Wallet Integration**
   - Seamless staking from agent wallet
   - Automatic borrowing at moment of need

---

## 📊 Example Flow

### Agent Stakes and Borrows

```
1. Agent has 1000 MNEE
   ↓
2. Agent calls: stakeAndBorrow(1000 MNEE, 666 USDC)
   ↓
3. Contract:
   - Stakes 1000 MNEE
   - Borrows 666 USDC (150% ratio)
   - Transfers USDC to agent
   ↓
4. Agent uses 666 USDC for operations
   ↓
5. Agent repays 666 USDC + interest
   ↓
6. Agent can unstake 1000 MNEE + rewards
```

---

## ⚠️ Important Notes

1. **Price Oracle**: Currently assumes 1 MNEE = 1 USD. In production, use Chainlink or similar oracle.

2. **Liquidity**: Requires liquidity hub to provide USDC for borrowing.

3. **Interest Accrual**: Interest accrues continuously, must be repaid.

4. **Liquidation Risk**: If MNEE price drops, positions may be liquidated.

---

## 🎯 Next Steps

1. Deploy contracts to Sepolia
2. Integrate with Wallet Base
3. Set up liquidity hub
4. Add price oracle integration
5. Test with agent wallets
6. Deploy to mainnet

---

**This staking protocol enables agents to leverage their MNEE holdings while maintaining liquidity for operations!** 🚀

