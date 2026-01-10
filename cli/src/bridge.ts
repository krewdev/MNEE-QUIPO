/**
 * Cross-chain Bridge Integration
 * Bridge MNEE from Bitcoin Ordinals to Ethereum chains
 */

import { ethers } from "ethers";
import { BitcoinMNEE } from "./bitcoin";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Load bridge contract address from deployment files
 */
function loadBridgeAddress(chainId: number): string | undefined {
  const deploymentFiles = [
    path.join(__dirname, "..", "..", "DEPLOYMENT_SEPOLIA.json"),
    path.join(__dirname, "..", "..", "DEPLOYMENT.json"),
  ];
  
  for (const file of deploymentFiles) {
    if (fs.existsSync(file)) {
      try {
        const deployment = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (deployment.chainId === chainId.toString() || 
            deployment.chainId === chainId ||
            (chainId === 11155111 && deployment.network === "sepolia")) {
          return deployment.contracts?.bridge;
        }
      } catch (error) {
        // Continue to next file
      }
    }
  }
  
  return undefined;
}

export interface BridgeConfig {
  bitcoinAddress: string;
  bitcoinRpcUrl?: string;
  ordinalsbotApiKey?: string;
  ordinalsbotApiUrl?: string;
  targetChain: string;
  targetAddress: string;
  amount: number;
}

/**
 * Bridge MNEE tokens from Bitcoin to Ethereum chains
 * This handles the cross-chain transfer using MNEE's UTXO model
 */
export class MNEEBridge {
  /**
   * Bridge MNEE from Bitcoin Ordinals to an EVM chain
   * Process:
   * 1. Lock/burn MNEE on Bitcoin (UTXO spend)
   * 2. Prove the transaction on target chain
   * 3. Mint/create MNEE on target chain (or unlock from bridge contract)
   */
  async bridgeFromBitcoin(config: BridgeConfig): Promise<string> {
    console.log("\n🌉 Bridging MNEE from Bitcoin to", config.targetChain);
    console.log(`From: ${config.bitcoinAddress} (Bitcoin)`);
    console.log(`To: ${config.targetAddress} (${config.targetChain})`);
    console.log(`Amount: ${config.amount} MNEE\n`);

    // Step 1: Create Bitcoin transaction to lock/burn MNEE using OrdinalsBot
    const btcHandler = new BitcoinMNEE(
      config.bitcoinAddress,
      config.ordinalsbotApiKey || process.env.ORDINALSBOT_API_KEY,
      config.ordinalsbotApiUrl || process.env.ORDINALSBOT_API_URL
    );
    
    try {
      // Check Bitcoin balance first (optional - may fail if API key not configured)
      let balanceCheckSkipped = false;
      try {
        console.log("📊 Checking Bitcoin balance...");
        const balance = await btcHandler.getBalance();
        console.log(`   Balance: ${balance} MNEE\n`);
        
        // Only check if we got a valid balance (not 0 from error)
        // If balance is 0 and there was an API error, getBalance() returns 0
        // We can't distinguish, so we'll skip the check if balance is 0
        // and there were error messages in console
        if (balance > 0 && balance < config.amount) {
          throw new Error(`Insufficient balance: ${balance} MNEE < ${config.amount} MNEE required`);
        }
        if (balance === 0) {
          // Could be real 0 or API error - check console for errors
          balanceCheckSkipped = true;
          console.log("⚠️  Balance check returned 0 (may be API error)");
          console.log("   Continuing anyway - ensure you have sufficient MNEE\n");
        }
      } catch (balanceError: any) {
        // Check if it's a real insufficient balance error
        const errorMsg = balanceError.message || "";
        // Only throw if it's explicitly an insufficient balance error (not API error)
        if (errorMsg.includes("Insufficient balance") && 
            !errorMsg.includes("API") && 
            !errorMsg.includes("403") &&
            !errorMsg.includes("OrdinalsBot")) {
          throw balanceError;
        }
        // API error or other issue - continue anyway
        balanceCheckSkipped = true;
        console.log("⚠️  Could not verify Bitcoin balance");
        if (errorMsg.includes("403") || errorMsg.includes("API") || errorMsg.includes("OrdinalsBot")) {
          console.log("   (API authentication may be required - set ORDINALSBOT_API_KEY in .env)");
        }
        console.log("   Continuing anyway - ensure you have sufficient MNEE\n");
      }

      // Get network chain ID
      const NETWORKS: Record<string, number> = {
        sepolia: 11155111,
        ethereum: 1,
        base: 8453,
        polygon: 137,
        arbitrum: 42161,
      };
      
      const chainId = NETWORKS[config.targetChain];
      if (!chainId) {
        throw new Error(`Unknown target chain: ${config.targetChain}`);
      }

      // Check if bridge contract is deployed
      const bridgeAddress = loadBridgeAddress(chainId);
      
      console.log("📝 Bridge Process:");
      console.log("   1. Send/spend MNEE from your Bitcoin address");
      console.log("   2. Wait for Bitcoin confirmation (6+ blocks)");
      console.log("   3. Bridge operator submits proof with your recipient address");
      console.log("   4. Claim MNEE on target chain using claimBitcoinDeposit()\n");
      
      if (bridgeAddress) {
        console.log(`📋 Bridge Contract: ${bridgeAddress} (${config.targetChain})`);
        console.log("\n💡 To complete the bridge:");
        console.log(`   1. Send/spend ${config.amount} MNEE from Bitcoin address: ${config.bitcoinAddress}`);
        console.log(`      Note: Bitcoin doesn't have contracts, so send to any address or burn`);
        console.log(`      The bridge operator monitors transactions FROM your address`);
        console.log(`   2. Wait for Bitcoin confirmation (6+ blocks)`);
        console.log(`   3. Get the Bitcoin transaction hash (txid) of the send/spend`);
        console.log(`   4. Bridge operator calls: submitBitcoinProof(txHash, blockHeight, merkleProof, ${ethers.parseEther(config.amount.toString())}, ${config.targetAddress})`);
        console.log(`      ⚠️  The recipient address (${config.targetAddress}) is set by the bridge operator when submitting the proof`);
        console.log(`   5. You call: claimBitcoinDeposit(txHash) from address ${config.targetAddress} on ${config.targetChain}\n`);
        
        console.log("🔧 To claim after proof is submitted:");
        console.log(`   Make sure you're calling from the recipient address: ${config.targetAddress}`);
        console.log(`   Use CLI: ./mnee-x claim-deposit --tx-hash <bitcoinTxHash> --chain ${config.targetChain}`);
        console.log(`   Or call directly: claimBitcoinDeposit(bitcoinTxHash) on ${bridgeAddress}\n`);
      } else {
        console.log("⚠️  Bridge contract not deployed on", config.targetChain);
        
        // Check if Sepolia has bridge deployed and suggest it
        const sepoliaDeployment = loadBridgeAddress(11155111);
        if (sepoliaDeployment && config.targetChain !== "sepolia") {
          console.log(`\n💡 Tip: Bridge is available on Sepolia testnet!`);
          console.log(`   Try: ./mnee-x bridge --from bitcoin --to-chain sepolia --to ${config.targetAddress} --amount ${config.amount}`);
          console.log(`   Bridge Contract: ${sepoliaDeployment}\n`);
        } else {
          console.log("   Deploy BridgeMNEE contract first, then update DEPLOYMENT file");
          console.log("   The bridge contract enables Bitcoin ↔ EVM transfers\n");
        }
      }
      
      // Return a placeholder transaction ID
      return "bridge_pending_bitcoin_tx";
    } catch (error: any) {
      if (error.message.includes("not yet implemented")) {
        throw error;
      }
      throw new Error(`Bitcoin bridge error: ${error.message}`);
    }
  }

  /**
   * Bridge MNEE from EVM chain back to Bitcoin
   */
  async bridgeToBitcoin(
    fromChain: string,
    fromAddress: string,
    toBitcoinAddress: string,
    amount: number
  ): Promise<string> {
    console.log("\n🌉 Bridging MNEE from", fromChain, "to Bitcoin");
    console.log(`From: ${fromAddress} (${fromChain})`);
    console.log(`To Bitcoin address: ${toBitcoinAddress}`);
    console.log(`Amount: ${amount} MNEE\n`);

    const NETWORKS: Record<string, number> = {
      sepolia: 11155111,
      ethereum: 1,
      base: 8453,
      polygon: 137,
      arbitrum: 42161,
    };
    
    const chainId = NETWORKS[fromChain];
    if (!chainId) {
      throw new Error(`Unknown source chain: ${fromChain}`);
    }

    // Load bridge contract address
    const bridgeAddress = loadBridgeAddress(chainId);
    if (!bridgeAddress) {
      throw new Error(`Bridge contract not deployed on ${fromChain}. Deploy BridgeMNEE contract first.`);
    }

    // Get RPC URL
    const rpcUrl = process.env[`${fromChain.toUpperCase()}_RPC_URL`] || 
                  (fromChain === "sepolia" ? process.env.SEPOLIA_RPC_URL : undefined);
    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for ${fromChain}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not found in environment");
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Bridge contract ABI
    const bridgeAbi = [
      "function lockForBitcoin(uint256 amount, string calldata bitcoinAddress) external",
      "function lockForBitcoinUTXO(bytes32[] calldata inputUTXOIds, uint256 amount, string calldata bitcoinAddress) external",
      "function evmLocks(bytes32) view returns (bytes32 lockId, address sender, uint256 amount, string memory bitcoinAddress, uint256 timestamp, bool processed, bool isUTXO, bytes32[] memory utxoIds)",
      "event EVMLocked(bytes32 indexed lockId, address indexed sender, uint256 amount, string bitcoinAddress)",
    ];

    const bridge = new ethers.Contract(bridgeAddress, bridgeAbi, wallet);

    // Check if using UTXO token or ERC20
    // For now, we'll use ERC20 (lockForBitcoin)
    // TODO: Add UTXO support if needed
    
    console.log("📝 Locking MNEE in bridge contract...");
    const amountWei = ethers.parseEther(amount.toString());
    
    // First, check if user has approved the bridge
    // For ERC20, we need to approve first
    const mneeTokenAbi = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)",
    ];
    
    // Try to get MNEE token address from deployment
    const deploymentFiles = [
      path.join(__dirname, "..", "..", "DEPLOYMENT_SEPOLIA.json"),
      path.join(__dirname, "..", "..", "DEPLOYMENT.json"),
    ];
    
    let mneeTokenAddress: string | undefined;
    for (const file of deploymentFiles) {
      if (fs.existsSync(file)) {
        try {
          const deployment = JSON.parse(fs.readFileSync(file, "utf-8"));
          if (deployment.chainId === chainId.toString() || 
              deployment.chainId === chainId ||
              (chainId === 11155111 && deployment.network === "sepolia")) {
            mneeTokenAddress = deployment.contracts?.mneeToken;
            break;
          }
        } catch (error) {
          // Continue
        }
      }
    }
    
    if (!mneeTokenAddress) {
      mneeTokenAddress = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"; // Official MNEE
    }

    const mneeToken = new ethers.Contract(mneeTokenAddress, mneeTokenAbi, wallet);
    
    // Check balance
    const balance = await mneeToken.balanceOf(wallet.address);
    if (balance < amountWei) {
      throw new Error(`Insufficient balance: ${ethers.formatEther(balance)} MNEE < ${amount} MNEE required`);
    }

    // Check allowance
    const allowance = await mneeToken.allowance(wallet.address, bridgeAddress);
    if (allowance < amountWei) {
      console.log("🔓 Approving bridge to spend MNEE...");
      const approveTx = await mneeToken.approve(bridgeAddress, amountWei);
      await approveTx.wait();
      console.log("✅ Approved\n");
    }

    // Lock tokens
    console.log(`🔒 Locking ${amount} MNEE for Bitcoin release...`);
    const lockTx = await bridge.lockForBitcoin(amountWei, toBitcoinAddress);
    console.log(`   Transaction: ${lockTx.hash}`);
    
    const receipt = await lockTx.wait();
    console.log("✅ Tokens locked in bridge contract\n");

    // Find the lock ID from events
    const lockEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = bridge.interface.parseLog(log);
        return parsed?.name === "EVMLocked";
      } catch {
        return false;
      }
    });

    if (lockEvent) {
      const parsed = bridge.interface.parseLog(lockEvent);
      const lockId = parsed?.args[0];
      console.log("📋 Lock Details:");
      console.log(`   Lock ID: ${lockId}`);
      console.log(`   Amount: ${amount} MNEE`);
      console.log(`   Bitcoin Address: ${toBitcoinAddress}`);
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Bridge operator will process the lock`);
      console.log(`   2. Bridge operator creates Bitcoin transaction`);
      console.log(`   3. Bridge operator calls: markEVMLockProcessed(${lockId}, bitcoinTxHash)`);
      console.log(`   4. MNEE will be released on Bitcoin\n`);
      
      return lockId;
    }

    return lockTx.hash;
  }

  /**
   * Claim Bitcoin deposit on EVM chain (after proof is submitted)
   */
  async claimBitcoinDeposit(
    chain: string,
    bitcoinTxHash: string
  ): Promise<string> {
    const NETWORKS: Record<string, number> = {
      sepolia: 11155111,
      ethereum: 1,
      base: 8453,
      polygon: 137,
      arbitrum: 42161,
    };
    
    const chainId = NETWORKS[chain];
    if (!chainId) {
      throw new Error(`Unknown chain: ${chain}`);
    }

    const bridgeAddress = loadBridgeAddress(chainId);
    if (!bridgeAddress) {
      throw new Error(`Bridge contract not deployed on ${chain}. Deploy BridgeMNEE contract first.`);
    }

    const rpcUrl = process.env[`${chain.toUpperCase()}_RPC_URL`] || 
                  (chain === "sepolia" ? process.env.SEPOLIA_RPC_URL : undefined);
    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for ${chain}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY not found in environment");
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    
    const bridgeAbi = [
      "function claimBitcoinDeposit(bytes32 txHash) external",
      "function bitcoinProofs(bytes32) view returns (bytes32 txHash, uint256 blockHeight, bytes memory merkleProof, uint256 utxoAmount, address recipient, uint256 timestamp, bool claimed)",
      "event BitcoinClaimed(bytes32 indexed txHash, address indexed recipient, uint256 amount)",
    ];

    const bridge = new ethers.Contract(bridgeAddress, bridgeAbi, wallet);

    // Check if proof exists and is claimable
    const proof = await bridge.bitcoinProofs(bitcoinTxHash);
    if (proof.recipient === ethers.ZeroAddress) {
      throw new Error(`No proof found for Bitcoin transaction: ${bitcoinTxHash}`);
    }
    if (proof.recipient.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Proof is for different recipient: ${proof.recipient}, your address: ${wallet.address}`);
    }
    if (proof.claimed) {
      throw new Error("Deposit already claimed");
    }

    console.log("\n💰 Claiming Bitcoin deposit...");
    console.log(`   Bitcoin TX: ${bitcoinTxHash}`);
    console.log(`   Amount: ${ethers.formatEther(proof.utxoAmount)} MNEE`);
    console.log(`   Recipient: ${wallet.address}\n`);

    const claimTx = await bridge.claimBitcoinDeposit(bitcoinTxHash);
    console.log(`   Transaction: ${claimTx.hash}`);
    
    const receipt = await claimTx.wait();
    console.log("✅ Deposit claimed successfully!\n");

    return claimTx.hash;
  }
}

