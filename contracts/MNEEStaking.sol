// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IERC20.sol";

/**
 * @title MNEEStaking (Legacy - Use MNEECreditPool instead)
 * @dev Legacy staking protocol for MNEE tokens with USDC borrowing
 * 
 * NOTE: This contract is kept for backward compatibility.
 * For new deployments, use MNEECreditPool which is MNEE-native.
 */
contract MNEEStaking is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable mneeToken;
    IERC20 public immutable usdcToken;
    
    // Staking parameters
    uint256 public totalStaked;
    uint256 public totalBorrowed;
    uint256 public constant MIN_STAKE_AMOUNT = 100e18; // 100 MNEE minimum
    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization required (1.5x)
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% - liquidate if below
    
    // Interest rates (basis points: 10000 = 100%)
    uint256 public stakingAPY = 500; // 5% APY
    uint256 public borrowingAPY = 1200; // 12% APY
    
    // Staker information
    struct Staker {
        uint256 stakedAmount;
        uint256 borrowedAmount;
        uint256 lastUpdateTime;
        uint256 rewardsAccrued;
        bool isActive;
    }
    
    mapping(address => Staker) public stakers;
    address[] public stakerList;
    
    // Liquidity hub integration
    address public liquidityHub;
    uint256 public liquidityReserve; // USDC available for borrowing
    
    // Events
    event Staked(address indexed staker, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed staker, uint256 amount, uint256 timestamp);
    event Borrowed(address indexed borrower, uint256 usdcAmount, uint256 timestamp);
    event Repaid(address indexed borrower, uint256 usdcAmount, uint256 timestamp);
    event RewardsClaimed(address indexed staker, uint256 amount, uint256 timestamp);
    event Liquidated(address indexed staker, uint256 mneeLiquidated, uint256 timestamp);
    
    constructor(
        address _mneeToken,
        address _usdcToken,
        address _liquidityHub,
        address initialOwner
    ) {
        mneeToken = IERC20(_mneeToken);
        usdcToken = IERC20(_usdcToken);
        liquidityHub = _liquidityHub;
        _transferOwnership(initialOwner);
    }
    
    /**
     * @dev Stake MNEE tokens
     * @param amount Amount of MNEE to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE_AMOUNT, "MNEEStaking: Amount below minimum");
        require(mneeToken.transferFrom(msg.sender, address(this), amount), "MNEEStaking: Transfer failed");
        
        Staker storage staker = stakers[msg.sender];
        
        // Update rewards if already staking
        if (staker.isActive && staker.stakedAmount > 0) {
            _updateRewards(msg.sender);
        } else {
            // New staker
            staker.isActive = true;
            stakerList.push(msg.sender);
        }
        
        staker.stakedAmount += amount;
        staker.lastUpdateTime = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Unstake MNEE tokens (only if no active borrow or sufficient collateral)
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        Staker storage staker = stakers[msg.sender];
        require(staker.isActive, "MNEEStaking: Not staking");
        require(staker.stakedAmount >= amount, "MNEEStaking: Insufficient staked");
        
        _updateRewards(msg.sender);
        
        // Check collateralization if borrowing
        if (staker.borrowedAmount > 0) {
            uint256 newStaked = staker.stakedAmount - amount;
            require(
                _isCollateralized(newStaked, staker.borrowedAmount),
                "MNEEStaking: Would be undercollateralized"
            );
        }
        
        staker.stakedAmount -= amount;
        totalStaked -= amount;
        
        require(mneeToken.transfer(msg.sender, amount), "MNEEStaking: Transfer failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Borrow USDC against staked MNEE
     * @param usdcAmount Amount of USDC to borrow
     */
    function borrow(uint256 usdcAmount) external nonReentrant whenNotPaused {
        Staker storage staker = stakers[msg.sender];
        require(staker.isActive, "MNEEStaking: Not staking");
        require(staker.stakedAmount > 0, "MNEEStaking: No staked amount");
        require(usdcAmount <= liquidityReserve, "MNEEStaking: Insufficient liquidity");
        
        _updateRewards(msg.sender);
        
        uint256 newBorrowed = staker.borrowedAmount + usdcAmount;
        require(
            _isCollateralized(staker.stakedAmount, newBorrowed),
            "MNEEStaking: Would be undercollateralized"
        );
        
        staker.borrowedAmount = newBorrowed;
        totalBorrowed += usdcAmount;
        liquidityReserve -= usdcAmount;
        
        require(usdcToken.transfer(msg.sender, usdcAmount), "MNEEStaking: USDC transfer failed");
        
        emit Borrowed(msg.sender, usdcAmount, block.timestamp);
    }
    
    /**
     * @dev Repay borrowed USDC
     * @param usdcAmount Amount of USDC to repay
     */
    function repay(uint256 usdcAmount) external nonReentrant {
        Staker storage staker = stakers[msg.sender];
        require(staker.borrowedAmount > 0, "MNEEStaking: No debt");
        require(usdcAmount <= staker.borrowedAmount, "MNEEStaking: Repay amount exceeds debt");
        
        require(usdcToken.transferFrom(msg.sender, address(this), usdcAmount), "MNEEStaking: USDC transfer failed");
        
        staker.borrowedAmount -= usdcAmount;
        totalBorrowed -= usdcAmount;
        liquidityReserve += usdcAmount;
        
        emit Repaid(msg.sender, usdcAmount, block.timestamp);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        Staker storage staker = stakers[msg.sender];
        require(staker.isActive, "MNEEStaking: Not staking");
        
        _updateRewards(msg.sender);
        
        uint256 rewards = staker.rewardsAccrued;
        require(rewards > 0, "MNEEStaking: No rewards");
        
        staker.rewardsAccrued = 0;
        require(mneeToken.transfer(msg.sender, rewards), "MNEEStaking: Reward transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }
    
    /**
     * @dev Liquidate undercollateralized position
     * @param stakerAddress Address of undercollateralized staker
     */
    function liquidate(address stakerAddress) external nonReentrant {
        Staker storage staker = stakers[stakerAddress];
        require(staker.isActive, "MNEEStaking: Not staking");
        require(staker.borrowedAmount > 0, "MNEEStaking: No debt");
        
        uint256 collateralValue = _getCollateralValue(staker.stakedAmount);
        uint256 debtValue = staker.borrowedAmount; // USDC is 1:1 with USD
        
        require(
            (collateralValue * 100) / debtValue < LIQUIDATION_THRESHOLD,
            "MNEEStaking: Not liquidatable"
        );
        
        // Liquidate: take staked MNEE, repay USDC debt
        uint256 mneeToLiquidate = staker.stakedAmount;
        uint256 usdcToRepay = staker.borrowedAmount;
        
        // Transfer liquidated MNEE to liquidator (with bonus)
        uint256 liquidatorBonus = (mneeToLiquidate * 5) / 100; // 5% bonus
        require(mneeToken.transfer(msg.sender, liquidatorBonus), "MNEEStaking: Transfer failed");
        
        // Repay debt
        staker.stakedAmount = 0;
        staker.borrowedAmount = 0;
        staker.isActive = false;
        
        totalStaked -= mneeToLiquidate;
        totalBorrowed -= usdcToRepay;
        liquidityReserve += usdcToRepay;
        
        emit Liquidated(stakerAddress, mneeToLiquidate, block.timestamp);
    }
    
    /**
     * @dev Get maximum borrowable USDC for a staker
     * @param stakerAddress Address of staker
     * @return Maximum USDC that can be borrowed
     */
    function getMaxBorrowable(address stakerAddress) external view returns (uint256) {
        Staker memory staker = stakers[stakerAddress];
        if (staker.stakedAmount == 0) return 0;
        
        uint256 collateralValue = _getCollateralValue(staker.stakedAmount);
        uint256 maxBorrow = (collateralValue * 100) / COLLATERAL_RATIO;
        
        // Subtract existing debt
        if (maxBorrow > staker.borrowedAmount) {
            return maxBorrow - staker.borrowedAmount;
        }
        return 0;
    }
    
    /**
     * @dev Get staker information
     */
    function getStakerInfo(address stakerAddress) external view returns (
        uint256 stakedAmount,
        uint256 borrowedAmount,
        uint256 rewardsAccrued,
        uint256 maxBorrowable,
        bool isActive
    ) {
        Staker memory staker = stakers[stakerAddress];
        return (
            staker.stakedAmount,
            staker.borrowedAmount,
            staker.rewardsAccrued + _calculateRewards(stakerAddress),
            this.getMaxBorrowable(stakerAddress),
            staker.isActive
        );
    }
    
    // Internal functions
    
    /**
     * @dev Update rewards for a staker
     */
    function _updateRewards(address stakerAddress) internal {
        Staker storage staker = stakers[stakerAddress];
        if (staker.stakedAmount == 0) return;
        
        uint256 newRewards = _calculateRewards(stakerAddress);
        staker.rewardsAccrued += newRewards;
        staker.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Calculate rewards since last update
     */
    function _calculateRewards(address stakerAddress) internal view returns (uint256) {
        Staker memory staker = stakers[stakerAddress];
        if (staker.stakedAmount == 0 || staker.lastUpdateTime == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - staker.lastUpdateTime;
        uint256 annualReward = (staker.stakedAmount * stakingAPY) / 10000;
        uint256 rewards = (annualReward * timeElapsed) / 365 days;
        
        return rewards;
    }
    
    /**
     * @dev Check if position is properly collateralized
     */
    function _isCollateralized(uint256 stakedAmount, uint256 borrowedAmount) internal view returns (bool) {
        if (borrowedAmount == 0) return true;
        
        uint256 collateralValue = _getCollateralValue(stakedAmount);
        uint256 requiredCollateral = (borrowedAmount * COLLATERAL_RATIO) / 100;
        
        return collateralValue >= requiredCollateral;
    }
    
    /**
     * @dev Get collateral value in USD (assuming 1 MNEE = 1 USD)
     * @param mneeAmount Amount of MNEE (with 18 decimals)
     * @return Value in USDC (with 6 decimals)
     */
    function _getCollateralValue(uint256 mneeAmount) internal pure returns (uint256) {
        // In production, this would use a price oracle (e.g., Chainlink)
        // For now, assuming 1 MNEE = 1 USD
        // MNEE has 18 decimals, USDC has 6 decimals
        // So 1 MNEE = 1e18 wei = 1 USD = 1e6 USDC units
        return (mneeAmount * 1e6) / 1e18; // Convert to USDC units (6 decimals)
    }
    
    // Admin functions
    
    /**
     * @dev Add liquidity to the pool (from liquidity hub)
     */
    function addLiquidity(uint256 usdcAmount) external {
        require(msg.sender == liquidityHub || msg.sender == owner(), "MNEEStaking: Unauthorized");
        require(usdcToken.transferFrom(msg.sender, address(this), usdcAmount), "MNEEStaking: Transfer failed");
        liquidityReserve += usdcAmount;
    }
    
    /**
     * @dev Set interest rates
     */
    function setRates(uint256 _stakingAPY, uint256 _borrowingAPY) external onlyOwner {
        require(_stakingAPY <= 5000, "MNEEStaking: Staking APY too high"); // Max 50%
        require(_borrowingAPY <= 5000, "MNEEStaking: Borrowing APY too high"); // Max 50%
        stakingAPY = _stakingAPY;
        borrowingAPY = _borrowingAPY;
    }
    
    /**
     * @dev Update liquidity hub address
     */
    function setLiquidityHub(address _liquidityHub) external onlyOwner {
        require(_liquidityHub != address(0), "MNEEStaking: Invalid address");
        liquidityHub = _liquidityHub;
    }
}

