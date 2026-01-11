// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentWallet
 * @dev ERC-4337 compatible smart wallet for AI agents
 * Allows gasless transactions via Paymaster
 */
contract AgentWallet is BaseAccount, Ownable, EIP712 {
    using ECDSA for bytes32;
    
    IEntryPoint private immutable _entryPoint;
    
    event AgentWalletInitialized(address indexed owner, address indexed wallet);
    
    constructor(
        IEntryPoint anEntryPoint,
        address initialOwner
    ) EIP712("AgentWallet", "1") {
        _transferOwnership(initialOwner);
        _entryPoint = anEntryPoint;
        emit AgentWalletInitialized(initialOwner, address(this));
    }
    
    /**
     * @dev Required by BaseAccount
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    /**
     * @dev Validate user operation signature
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        bytes32 hash = _hashTypedDataV4(userOpHash);
        address signer = hash.recover(userOp.signature);
        
        if (owner() != signer) {
            return SIG_VALIDATION_FAILED;
        }
        
        return 0;
    }
    
    /**
     * @dev Execute a transaction
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyEntryPoint {
        _call(dest, value, func);
    }
    
    /**
     * @dev Execute a batch of transactions
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        require(
            dest.length == value.length && dest.length == func.length,
            "AgentWallet: Array length mismatch"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }
    
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
    
    /**
     * @dev Deposit ETH to EntryPoint for account operations
     */
    function deposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }
    
    /**
     * @dev Withdraw from EntryPoint deposit balance
     * @notice This can only withdraw from this contract's EntryPoint deposit balance
     * The EntryPoint deposit belongs to this contract address, not the owner
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        // EntryPoint.withdrawTo() can only withdraw from the caller's deposit balance
        // Since we're calling from this contract, it can only withdraw this contract's deposits
        entryPoint().withdrawTo(withdrawAddress, amount);
    }
    
    /**
     * @dev Add stake to EntryPoint (required for paymaster)
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint().addStake{value: msg.value}(unstakeDelaySec);
    }
    
    /**
     * @dev Unlock stake from EntryPoint
     */
    function unlockStake() external onlyOwner {
        entryPoint().unlockStake();
    }
    
    /**
     * @dev Withdraw stake from EntryPoint
     */
    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        entryPoint().withdrawStake(withdrawAddress);
    }
    
    modifier onlyEntryPoint() {
        require(
            msg.sender == address(entryPoint()),
            "AgentWallet: Not from EntryPoint"
        );
        _;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}

