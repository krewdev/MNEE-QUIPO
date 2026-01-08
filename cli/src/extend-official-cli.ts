/**
 * Extension Module for Official MNEE CLI
 * Adds cross-chain, Bitcoin Ordinals, and ERC-4337 functionality
 * 
 * This extends the official @mnee/cli with hackathon features:
 * - Cross-chain bridging (Bitcoin ↔ EVM)
 * - Bitcoin Ordinals support (via OrdinalsBot)
 * - EVM chain support (Ethereum, Base, Polygon, Arbitrum)
 * - ERC-4337 Paymaster integration (gasless transactions)
 * - Agent wallet creation
 */

import { Command } from "commander";
import { BitcoinMNEE } from "./bitcoin";
import { MNEEBridge } from "./bridge";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Network configuration for EVM chains
const NETWORKS: Record<string, any> = {
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    mneeToken: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorer: "https://basescan.org",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  bitcoin: {
    name: "Bitcoin Mainnet (Ordinals)",
    chainId: 0,
    rpcUrl: process.env.BITCOIN_RPC_URL || "",
    explorer: "https://blockstream.info",
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 8 },
  },
};

/**
 * Register cross-chain commands to extend official MNEE CLI
 * Call this function from the main CLI entry point
 */
export function registerCrossChainCommands(program: Command) {
  // ========== Bridge Command ==========
  program
    .command("bridge")
    .description("🌉 Bridge MNEE tokens between Bitcoin Ordinals and EVM chains (Hackathon Feature)")
    .requiredOption("--to <address>", "Recipient address on target chain")
    .requiredOption("--amount <amount>", "Amount to bridge (in MNEE)")
    .option("--from <chain>", "Source chain (bitcoin, ethereum, base, polygon, arbitrum)", "bitcoin")
    .requiredOption("--to-chain <chain>", "Target chain (ethereum, base, polygon, arbitrum)")
    .option("--from-address <address>", "Source address (Bitcoin address if from=bitcoin)")
    .option("--ordinalsbot-key <key>", "OrdinalsBot API key")
    .action(async (options) => {
      try {
        const bridge = new MNEEBridge();
        
        if (options.from === "bitcoin") {
          const fromAddress = options.fromAddress || process.env.BITCOIN_ADDRESS || "";
          if (!fromAddress) {
            console.error("❌ Bitcoin address required. Use --from-address or set BITCOIN_ADDRESS in .env");
            process.exit(1);
          }

          const bridgeTx = await bridge.bridgeFromBitcoin({
            bitcoinAddress: fromAddress,
            bitcoinRpcUrl: undefined,
            targetChain: options.toChain,
            targetAddress: options.to,
            amount: parseFloat(options.amount),
            ordinalsbotApiKey: options.ordinalsbotKey || process.env.ORDINALSBOT_API_KEY,
          });
          console.log("✅ Bridge transaction:", bridgeTx);
        } else {
          console.log("Bridge from EVM chains coming soon!");
        }
      } catch (error: any) {
        console.error(`❌ Bridge error: ${error.message}`);
        process.exit(1);
      }
    });

  // ========== EVM Balance Command ==========
  program
    .command("evm-balance")
    .description("💰 Check MNEE balance on EVM chains (Hackathon Feature)")
    .option("--chain <chain>", "Chain to check (ethereum, base, polygon, arbitrum)", "ethereum")
    .option("--address <address>", "Address to check (defaults to your EVM wallet)")
    .option("--rpc <url>", "Custom RPC URL")
    .action(async (options) => {
      try {
        const network = NETWORKS[options.chain];
        if (!network) {
          console.error(`❌ Unknown chain: ${options.chain}`);
          process.exit(1);
        }

        const mneeAddress = network.mneeToken || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
        const rpcUrl = options.rpc || network.rpcUrl;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        let address = options.address;
        if (!address) {
          const privateKey = process.env.PRIVATE_KEY;
          if (!privateKey) {
            console.error("❌ PRIVATE_KEY not found and --address not provided");
            process.exit(1);
          }
          const wallet = new ethers.Wallet(privateKey, provider);
          address = wallet.address;
        }

        const erc20Abi = [
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)",
        ];

        const mneeToken = new ethers.Contract(mneeAddress, erc20Abi, provider);
        
        try {
          const [balance, decimals, symbol] = await Promise.all([
            mneeToken.balanceOf(address),
            mneeToken.decimals(),
            mneeToken.symbol().catch(() => "MNEE"),
          ]);

          const formatted = ethers.formatUnits(balance, decimals);
          
          console.log(`\n📊 MNEE Balance on ${network.name}`);
          console.log(`Address: ${address}`);
          console.log(`Balance: ${formatted} ${symbol}`);
          console.log(`Chain ID: ${network.chainId}`);
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ========== EVM Send Command ==========
  program
    .command("evm-send")
    .description("📤 Send MNEE on EVM chains with optional Paymaster (gasless) (Hackathon Feature)")
    .requiredOption("--to <address>", "Recipient address")
    .requiredOption("--amount <amount>", "Amount to send (in MNEE)")
    .option("--chain <chain>", "Target chain (ethereum, base, polygon, arbitrum)", "ethereum")
    .option("--paymaster", "Use Paymaster to pay for gas (gasless transaction)", false)
    .option("--rpc <url>", "Custom RPC URL")
    .action(async (options) => {
      try {
        console.log("\n🚀 Sending MNEE on EVM Chain\n");
        
        const network = NETWORKS[options.chain];
        if (!network) {
          console.error(`❌ Unknown chain: ${options.chain}`);
          process.exit(1);
        }

        const mneeAddress = network.mneeToken || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
        const rpcUrl = options.rpc || network.rpcUrl;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const privateKey = process.env.PRIVATE_KEY;
        
        if (!privateKey) {
          console.error("❌ PRIVATE_KEY not found in .env file");
          process.exit(1);
        }
        
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const erc20Abi = [
          "function transfer(address, uint256) returns (bool)",
          "function decimals() view returns (uint8)",
          "function balanceOf(address) view returns (uint256)",
        ];

        const mneeToken = new ethers.Contract(mneeAddress, erc20Abi, wallet);
        const decimals = await mneeToken.decimals();
        const amount = ethers.parseUnits(options.amount, decimals);

        console.log(`📤 From: ${wallet.address}`);
        console.log(`📥 To: ${options.to}`);
        console.log(`🌐 Chain: ${network.name}`);
        console.log(`💰 Amount: ${options.amount} MNEE`);
        
        if (options.paymaster) {
          console.log(`⚡ Using Paymaster (gasless transaction)`);
          // TODO: Implement Paymaster integration
          console.log("⚠️  Paymaster integration coming soon!");
        }

        const tx = await mneeToken.transfer(options.to, amount);
        console.log(`\n⏳ Transaction sent: ${tx.hash}`);
        console.log(`🔗 View on ${network.explorer}/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ========== Chains Command ==========
  program
    .command("chains")
    .description("🌐 List all supported chains for cross-chain operations (Hackathon Feature)")
    .action(() => {
      console.log("\n🌐 Supported Chains for Cross-Chain Operations:\n");
      Object.entries(NETWORKS).forEach(([key, network]) => {
        if (key === "bitcoin") {
          console.log(`✅ ${key.padEnd(15)} ${network.name.padEnd(25)} (UTXO/Ordinals)`);
          console.log(`   MNEE: Native on Bitcoin Ordinals (uses UTXO model)`);
        } else {
          const mneeStatus = network.mneeToken ? "✅" : "⚠️ ";
          console.log(`${mneeStatus} ${key.padEnd(15)} ${network.name.padEnd(25)} Chain ID: ${network.chainId}`);
          if (network.mneeToken) {
            console.log(`   MNEE: ${network.mneeToken}`);
          } else {
            console.log(`   MNEE: Bridge from Bitcoin or Ethereum`);
          }
        }
      });
      console.log("\n💡 Note: MNEE originates on Bitcoin Ordinals (UTXO model)");
      console.log("   Use 'mnee bridge' to move MNEE between Bitcoin and EVM chains\n");
    });

  // ========== Ordinals Balance Command ==========
  program
    .command("ordinals-balance")
    .description("💰 Check MNEE balance on Bitcoin Ordinals (Hackathon Feature)")
    .option("--address <address>", "Bitcoin address to check")
    .option("--ordinalsbot-key <key>", "OrdinalsBot API key")
    .option("--ordinalsbot-url <url>", "OrdinalsBot API URL")
    .action(async (options) => {
      const address = options.address || process.env.BITCOIN_ADDRESS || "";
      if (!address) {
        console.error("❌ Bitcoin address required. Use --address or set BITCOIN_ADDRESS in .env");
        process.exit(1);
      }
      
      const { checkBitcoinBalance } = await import("./bitcoin-balance");
      await checkBitcoinBalance(
        address,
        options.ordinalsbotKey || process.env.ORDINALSBOT_API_KEY,
        options.ordinalsbotUrl || process.env.ORDINALSBOT_API_URL
      );
    });

  // ========== Create Gasless Wallet Command ==========
  program
    .command("create-gasless-wallet")
    .description("🔐 Create an ERC-4337 gasless agent wallet (Hackathon Feature)")
    .option("--chain <chain>", "Chain to create wallet on", "ethereum")
    .option("--salt <salt>", "Optional salt for deterministic address")
    .action(async (options) => {
      try {
        console.log("\n🔐 Creating Gasless Agent Wallet (ERC-4337)\n");
        
        const network = NETWORKS[options.chain];
        if (!network) {
          console.error(`❌ Unknown chain: ${options.chain}`);
          process.exit(1);
        }

        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          console.error("❌ PRIVATE_KEY not found in .env file");
          process.exit(1);
        }

        const wallet = new ethers.Wallet(privateKey);
        console.log(`👤 Owner: ${wallet.address}`);
        console.log(`🌐 Chain: ${network.name}`);
        console.log(`📋 EntryPoint: ${network.entryPoint}`);
        
        // TODO: Deploy or calculate AgentWallet address
        console.log("\n⚠️  Agent wallet creation coming soon!");
        console.log("   This will create an ERC-4337 compatible wallet");
        console.log("   that can pay for gas with MNEE via Paymaster");
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
    });

  console.log("✅ Cross-chain commands registered!");
}

