// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract AgentFriendlyMintingContract is ERC20Permit, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_BATCH_SIZE = 20; // Prevent gas limit DoS

    // State variables
    IERC20Permit public immutable mnee;
    IERC20 public immutable mneeAsERC20; // Same token as IERC20 for SafeERC20
    IERC20 public feeToken; // Token used for fees (e.g., USDC or MNEE)
    uint256 public mneeRate;
    uint256 public mintFee;
    uint256 public proposedMneeRate;
    uint256 public proposedMintFee;
    uint256 public proposedMneeRateExecutionTime;
    uint256 public proposedMintFeeExecutionTime;

    // Events
    event ProposedMneeRate(uint256 newRate, uint256 executionTime);
    event ProposedMintFee(uint256 newFee, uint256 executionTime);
    event ExecutedMneeRate(uint256 newRate);
    event ExecutedMintFee(uint256 newFee);
    event Purchased(address indexed buyer, uint256 amount, uint256 mneeSpent);
    event BatchPurchased(address indexed buyer, uint256 totalAmount, uint256 totalMneeSpent);

    constructor(
        address _mnee,
        address _feeToken
    ) ERC20("MintableToken", "MTK") ERC20Permit("MintableToken") {
        require(_mnee != address(0), "Invalid MNEE address");
        require(_feeToken != address(0), "Invalid fee token address");
        mnee = IERC20Permit(_mnee);
        mneeAsERC20 = IERC20(_mnee);
        feeToken = IERC20(_feeToken);
        mneeRate = 1000;
        mintFee = 0.01 ether;
    }

    // Standard purchase with separate approval
    function purchase(uint256 amount) external payable nonReentrant {
        _validatePurchaseWithETH(amount, msg.sender);
        uint256 requiredMnee = amount * mneeRate;

        mneeAsERC20.safeTransferFrom(msg.sender, address(this), requiredMnee);
        _mint(msg.sender, amount);
        emit Purchased(msg.sender, amount, requiredMnee);
    }

    // Single-transaction purchase using permit
    function purchaseWithPermit(
        uint256 amount,
        uint256 mneeAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        require(msg.value >= mintFee, "Insufficient ETH for mint fee");
        require(mneeAmount >= amount * mneeRate, "Insufficient MNEE amount");

        // Use permit to approve in same transaction
        mnee.permit(msg.sender, address(this), mneeAmount, deadline, v, r, s);

        mneeAsERC20.safeTransferFrom(msg.sender, address(this), mneeAmount);
        _mint(msg.sender, amount);
        emit Purchased(msg.sender, amount, mneeAmount);
    }

    // Purchase with ERC20 fee payment
    function purchaseWithTokenFee(
        uint256 amount,
        uint256 feeAmount
    ) external nonReentrant {
        _validatePurchaseWithToken(amount, msg.sender);
        uint256 requiredMnee = amount * mneeRate;

        require(feeAmount == mintFee, "Incorrect fee amount");
        mneeAsERC20.safeTransferFrom(msg.sender, address(this), requiredMnee);
        feeToken.safeTransferFrom(msg.sender, address(this), feeAmount);
        _mint(msg.sender, amount);
        emit Purchased(msg.sender, amount, requiredMnee);
    }

    // Batch purchase for agents
    function batchPurchase(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");
        require(recipients.length > 0, "Empty batch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be positive");
            require(recipients[i] != address(0), "Invalid recipient");
            totalAmount = totalAmount + amounts[i];
        }
        require(msg.value >= mintFee * recipients.length, "Insufficient ETH for mint fees");

        uint256 totalMnee = totalAmount * mneeRate;
        uint256 totalFee = mintFee * recipients.length;

        require(msg.value >= totalFee, "Insufficient ETH for mint fees");
        require(totalMnee <= mneeAsERC20.allowance(msg.sender, address(this)), "Insufficient allowance");
        require(totalMnee <= mneeAsERC20.balanceOf(msg.sender), "Insufficient MNEE balance");

        mneeAsERC20.safeTransferFrom(msg.sender, address(this), totalMnee);
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
        emit BatchPurchased(msg.sender, totalAmount, totalMnee);
    }

    // Governance functions with timelocks
    function proposeMneeRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "Rate must be positive");
        proposedMneeRate = _newRate;
        proposedMneeRateExecutionTime = block.timestamp + 24 hours;
        emit ProposedMneeRate(_newRate, proposedMneeRateExecutionTime);
    }

    function executeMneeRate() external nonReentrant {
        require(block.timestamp >= proposedMneeRateExecutionTime, "Too early");
        mneeRate = proposedMneeRate;
        emit ExecutedMneeRate(mneeRate);
    }

    function proposeMintFee(uint256 _newFee) external onlyOwner {
        proposedMintFee = _newFee;
        proposedMintFeeExecutionTime = block.timestamp + 24 hours;
        emit ProposedMintFee(_newFee, proposedMintFeeExecutionTime);
    }

    function executeMintFee() external nonReentrant {
        require(block.timestamp >= proposedMintFeeExecutionTime, "Too early");
        mintFee = proposedMintFee;
        emit ExecutedMintFee(mintFee);
    }

    // Withdraw functions with safety checks
    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance to withdraw");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
    }

    function withdrawMnee() external onlyOwner nonReentrant {
        uint256 amount = mneeAsERC20.balanceOf(address(this));
        require(amount > 0, "No MNEE balance to withdraw");
        mneeAsERC20.safeTransfer(owner(), amount);
    }

    function withdrawFeeToken() external onlyOwner nonReentrant {
        uint256 amount = feeToken.balanceOf(address(this));
        require(amount > 0, "No fee token balance to withdraw");
        feeToken.safeTransfer(owner(), amount);
    }

    // Internal validation for ETH fee
    function _validatePurchaseWithETH(uint256 amount, address recipient) internal view {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");
        require(msg.value >= mintFee, "Insufficient ETH for mint fee");
    }
    
    // Internal validation for token fee
    function _validatePurchaseWithToken(uint256 amount, address recipient) internal view {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");
        // No msg.value check for token fee
    }

    // Receive function for better EOA compatibility
    receive() external payable {}

}