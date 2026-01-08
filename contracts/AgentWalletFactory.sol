// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentWallet.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentWalletFactory
 * @dev Factory contract for creating deterministic AgentWallet instances
 * Uses CREATE2 for address prediction
 */
contract AgentWalletFactory is Ownable {
    // EntryPoint address (ERC-4337)
    IEntryPoint public immutable entryPoint;
    
    // Track deployed wallets
    mapping(address => address) public wallets; // owner => wallet
    mapping(address => bool) public isWallet; // wallet => is deployed
    address[] public allWallets;
    
    event WalletCreated(address indexed owner, address indexed wallet, uint256 indexed index);
    
    constructor(IEntryPoint _entryPoint, address initialOwner) {
        _transferOwnership(initialOwner);
        require(address(_entryPoint) != address(0), "AgentWalletFactory: Invalid EntryPoint");
        entryPoint = _entryPoint;
    }
    
    /**
     * @dev Create a new AgentWallet for an owner
     * @param owner The owner address (can be an AI agent's address)
     * @param salt Salt for CREATE2 (for deterministic addresses)
     * @return wallet The deployed wallet address
     */
    function createWallet(address owner, uint256 salt) external returns (address wallet) {
        require(owner != address(0), "AgentWalletFactory: Invalid owner");
        require(wallets[owner] == address(0), "AgentWalletFactory: Wallet already exists");
        
        bytes32 saltBytes = bytes32(salt);
        bytes memory bytecode = abi.encodePacked(
            type(AgentWallet).creationCode,
            abi.encode(entryPoint, owner)
        );
        
        // Calculate predicted address first
        address predictedAddress = Create2.computeAddress(saltBytes, keccak256(bytecode));
        
        // Check if address already exists (would happen if salt was reused)
        // Note: CREATE2 will revert if address collision occurs, but this gives clearer error
        require(
            predictedAddress.code.length == 0,
            "AgentWalletFactory: Address collision, try different salt"
        );
        
        wallet = Create2.deploy(0, saltBytes, bytecode);
        wallets[owner] = wallet;
        isWallet[wallet] = true;
        allWallets.push(wallet);
        
        emit WalletCreated(owner, wallet, allWallets.length - 1);
    }
    
    /**
     * @dev Get the deterministic address for a wallet
     * @param owner The owner address
     * @param salt Salt for CREATE2
     * @return The predicted wallet address
     */
    function getAddress(address owner, uint256 salt) external view returns (address) {
        bytes32 saltBytes = bytes32(salt);
        bytes memory bytecode = abi.encodePacked(
            type(AgentWallet).creationCode,
            abi.encode(entryPoint, owner)
        );
        return Create2.computeAddress(saltBytes, keccak256(bytecode));
    }
    
    /**
     * @dev Get wallet for an owner
     * @param owner The owner address
     * @return The wallet address (or address(0) if not created)
     */
    function getWallet(address owner) external view returns (address) {
        return wallets[owner];
    }
    
    /**
     * @dev Get total number of wallets created
     * @return The total count
     */
    function totalWallets() external view returns (uint256) {
        return allWallets.length;
    }
    
    /**
     * @dev Get all wallets (paginated)
     * @param offset Starting index
     * @param limit Number of wallets to return
     * @return wallets_ Array of wallet addresses
     */
    function getAllWallets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory wallets_) 
    {
        uint256 total = allWallets.length;
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        wallets_ = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            wallets_[i - offset] = allWallets[i];
        }
    }
}

