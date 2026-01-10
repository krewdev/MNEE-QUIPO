#!/usr/bin/env node

/**
 * MNEE CLI - Cross-chain MNEE transfer tool
 * Send MNEE tokens to any supported chain starting with Ethereum
 */

import { Command } from "commander";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { BitcoinMNEE } from "./bitcoin";
import { MNEEBridge } from "./bridge";

// Load .env from project root (parent directory)
const envPath = path.join(__dirname, "..", "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback to default location
}

// Network configuration (same as root config)
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
  sepolia: {
    name: "Sepolia",
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  },
  bitcoin: {
    name: "Bitcoin Mainnet (Ordinals)",
    chainId: 0, // Bitcoin doesn't use EVM chain IDs
    rpcUrl: process.env.BITCOIN_RPC_URL || "",
    explorer: "https://blockstream.info",
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 8 },
  },
};

dotenv.config();

/**
 * Load contract addresses from deployment files
 */
function loadDeploymentAddresses(chainId: number): { factory?: string; paymaster?: string; creditPool?: string; mneeToken?: string } {
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
          return {
            factory: deployment.contracts?.factory,
            paymaster: deployment.contracts?.paymaster,
            creditPool: deployment.contracts?.creditPool,
            mneeToken: deployment.contracts?.mneeToken,
          };
        }
      } catch (error) {
        // Continue to next file
      }
    }
  }
  
  return {};
}

/**
 * Chain aliases mapping
 */
const CHAIN_ALIASES: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sepolia: "sepolia",
  base: "base",
  polygon: "polygon",
  matic: "polygon",
  arbitrum: "arbitrum",
  arb: "arbitrum",
};

/**
 * Normalize chain name (handle aliases)
 */
function normalizeChain(chain: string): string {
  const normalized = chain.toLowerCase().trim();
  return CHAIN_ALIASES[normalized] || normalized;
}

/**
 * Interactive prompt helpers
 */
async function promptChain(message: string = "Select chain"): Promise<string> {
  const chains = Object.keys(NETWORKS).filter(k => k !== "bitcoin");
  const { chain } = await inquirer.prompt([
    {
      type: "list",
      name: "chain",
      message: chalk.cyan(message),
      choices: chains.map(c => ({
        name: `${NETWORKS[c].name} (${c})`,
        value: c,
      })),
    },
  ]);
  return chain;
}

async function promptAddress(message: string, defaultAddress?: string): Promise<string> {
  const { address } = await inquirer.prompt([
    {
      type: "input",
      name: "address",
      message: chalk.cyan(message),
      default: defaultAddress,
      validate: (input: string) => {
        if (!input || typeof input !== "string") return "Address is required";
        const bitcoinRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
        if (!ethers.isAddress(input) && !bitcoinRegex.test(input)) {
          return "Invalid address format (must be EVM or Bitcoin address)";
        }
        return true;
      },
    },
  ]);
  return address as string;
}

async function promptAmount(message: string = "Amount (MNEE)"): Promise<number> {
  const { amount } = await inquirer.prompt([
    {
      type: "input",
      name: "amount",
      message: chalk.cyan(message),
      validate: (input: string) => {
        const num = parseFloat(input);
        if (isNaN(num) || num <= 0) return "Please enter a valid positive number";
        return true;
      },
    },
  ]);
  return parseFloat(amount);
}

async function confirmTransaction(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: chalk.yellow(message),
      default: false,
    },
  ]);
  return confirmed;
}

const program = new Command();

program
  .name("mnee-x")
  .description("MNEE CLI Extension - Cross-chain token transfers, Bitcoin Ordinals, and ERC-4337 (Hackathon)")
  .version("1.0.0-hackathon");

/**
 * Send MNEE tokens to any supported chain
 * Supports: Bitcoin Ordinals → EVM chains (via bridge)
 *           EVM chain → EVM chain (direct transfer)
 */
program
  .command("send")
  .description("Send MNEE tokens to any supported chain (supports Bitcoin Ordinals)")
  .requiredOption("--to <address>", "Recipient address")
  .requiredOption("--amount <amount>", "Amount to send (in MNEE)")
  .option("--chain <chain>", "Target chain (bitcoin, ethereum, base, polygon, arbitrum)", "ethereum")
  .option("--from-chain <chain>", "Source chain (bitcoin, ethereum, base, polygon, arbitrum)", "ethereum")
  .option("--from-address <address>", "Source address (Bitcoin address if from-chain=bitcoin)")
  .option("--paymaster", "Use Paymaster to pay for gas (EVM chains only)", false)
  .option("--rpc <url>", "Custom RPC URL (overrides config)")
  .option("--bitcoin-rpc <url>", "Bitcoin RPC URL (if sending from Bitcoin)")
  .action(async (options) => {
    // Handle Bitcoin Ordinals as source
    if (options.fromChain === "bitcoin") {
      console.log(chalk.bold.cyan("\n₿ Send MNEE on Bitcoin\n"));
      
        const fromAddress = options.fromAddress || process.env.BITCOIN_ADDRESS || "";
        if (!fromAddress) {
        const prompted = await promptAddress("Bitcoin source address:");
        if (!prompted) {
          console.error(chalk.red("❌ Bitcoin address required"));
          process.exit(1);
        }
        // Use prompted address
      }
      
      let finalFromAddress = fromAddress;
      if (!finalFromAddress) {
        finalFromAddress = await promptAddress("Bitcoin source address:");
      }
      
      const toAddress = options.to || await promptAddress("Recipient Bitcoin address:");
      const amount = options.amount ? parseFloat(options.amount) : await promptAmount();
      
      // Check if sending to another Bitcoin address or bridging
      if (options.chain === "bitcoin" || !options.chain || options.chain === "ethereum") {
        // Bitcoin → Bitcoin transfer
        console.log(chalk.cyan(`\n📤 From: ${finalFromAddress}`));
        console.log(chalk.cyan(`📥 To: ${toAddress}`));
        console.log(chalk.cyan(`💰 Amount: ${amount} MNEE\n`));
        
        // Prefer MNEE API key, fallback to OrdinalsBot key
        const apiKey = process.env.MNEE_API_KEY || process.env.ORDINALSBOT_API_KEY;
        const btcHandler = new BitcoinMNEE(
          finalFromAddress,
          apiKey,
          process.env.ORDINALSBOT_API_URL
        );
        
        const spinner = ora("Creating Bitcoin transaction...").start();
        
        try {
          // Check balance first (may fail if API key not set)
          let balance: number | undefined;
          try {
            balance = await btcHandler.getBalance();
            if (balance !== undefined && balance < amount) {
              spinner.fail(chalk.red(`Insufficient balance: ${balance} MNEE < ${amount} MNEE`));
              process.exit(1);
            }
          } catch (balanceError: any) {
            // API error - continue anyway (user may have balance, just can't check)
            const errorMsg = balanceError.message || "";
            if (errorMsg.includes("403") || errorMsg.includes("API") || errorMsg.includes("OrdinalsBot")) {
              spinner.text = "⚠️  Could not verify balance (API key may be required)";
              console.log(chalk.yellow("\n⚠️  Balance check failed - API authentication required"));
              console.log(chalk.yellow("   Continuing anyway - ensure you have sufficient MNEE"));
              console.log(chalk.cyan("\n💡 To fix: Set MNEE_API_KEY in .env file (preferred)"));
              console.log(chalk.cyan("   Or set ORDINALSBOT_API_KEY as fallback"));
              console.log(chalk.gray("   Get MNEE API key from: https://docs.mnee.io"));
              console.log(chalk.gray("   Get OrdinalsBot key from: https://ordinalsbot.com\n"));
            } else {
              throw balanceError;
            }
          }
          
          spinner.text = "Sending MNEE via OrdinalsBot...";
          const txId = await btcHandler.createSendTransaction(toAddress, amount);
          
          spinner.succeed(chalk.green("Transaction created!"));
          console.log(chalk.cyan(`\n✅ Transaction ID: ${txId}`));
          console.log(chalk.gray(`   View on Blockstream: https://blockstream.info/tx/${txId}`));
          console.log(chalk.yellow(`\n⚠️  Note: This creates a transfer inscription. Wait for confirmation before it's finalized.`));
        } catch (error: any) {
          spinner.fail(chalk.red(`Error: ${error.message}`));
          const errorMsg = error.message || "";
          
          if (errorMsg.includes("403") || errorMsg.includes("not allowed")) {
            console.log(chalk.red("\n❌ API Authentication Required"));
            console.log(chalk.yellow("\n📝 To fix this:"));
            console.log("   Option 1 (Preferred): Use MNEE SDK");
            console.log("   1. Get API key from: https://docs.mnee.io");
            console.log("   2. Sign up for MNEE Developer account");
            console.log("   3. Add to .env file:");
            console.log(chalk.cyan("      MNEE_API_KEY=your_mnee_api_key_here"));
            console.log(chalk.yellow("\n   Option 2 (Fallback): Use OrdinalsBot"));
            console.log("   1. Get API key from: https://ordinalsbot.com");
            console.log("   2. Add to .env file:");
            console.log(chalk.cyan("      ORDINALSBOT_API_KEY=your_ordinalsbot_key_here"));
            console.log(chalk.yellow("\n💡 Why?"));
            console.log("   - Creating transfers requires API authentication");
            console.log("   - MNEE SDK is the official API (preferred)");
            console.log("   - OrdinalsBot is a fallback option\n");
          } else {
            console.log(chalk.yellow("\n💡 Tips:"));
            console.log("   - Set MNEE_API_KEY in .env (preferred)");
            console.log("   - Or set ORDINALSBOT_API_KEY as fallback");
            console.log("   - Check that you have sufficient MNEE balance");
            console.log("   - Verify Bitcoin addresses are correct");
            console.log("   - Ensure you have Bitcoin for transaction fees");
          }
          process.exit(1);
        }
        return;
      } else {
        // Bitcoin → EVM (bridging)
        console.log(chalk.yellow("\n💡 This requires bridging. Use 'bridge' command instead:"));
        console.log(`   ./mnee-x bridge --from bitcoin --to-chain ${options.chain} --to ${toAddress} --amount ${amount}`);
        process.exit(0);
      }
    }

    try {
      console.log("\n🚀 MNEE Cross-Chain Transfer\n");
      
      const network = NETWORKS[options.chain];
      if (!network) {
        console.error(`❌ Unknown chain: ${options.chain}`);
        console.error(`Available chains: ${Object.keys(NETWORKS).join(", ")}`);
        process.exit(1);
      }

      // Get MNEE token address for the chain (load from deployment file first)
      const deployment = loadDeploymentAddresses(network.chainId);
      const mneeAddress = deployment.mneeToken || network.mneeToken || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
      
      // Setup provider and signer
      const rpcUrl = options.rpc || network.rpcUrl;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        console.error("❌ PRIVATE_KEY not found in .env file");
        process.exit(1);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      console.log(`📤 From: ${wallet.address}`);
      console.log(`📥 To: ${options.to}`);
      console.log(`🌐 Chain: ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`💰 Amount: ${options.amount} MNEE`);
      console.log(`🔗 MNEE Token: ${mneeAddress}\n`);

      // Check balance
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function decimals() view returns (uint8)",
      ];

      const mneeToken = new ethers.Contract(mneeAddress, erc20Abi, wallet);
      
      try {
        const decimals = await mneeToken.decimals();
        const amount = ethers.parseUnits(options.amount, decimals);
        const balance = await mneeToken.balanceOf(wallet.address);
        
        console.log(`Your balance: ${ethers.formatUnits(balance, decimals)} MNEE`);
        
        if (balance < amount) {
          console.error(`❌ Insufficient balance!`);
          process.exit(1);
        }

        // Send transaction
        console.log("\n⏳ Sending transaction...");
        
        // Check if using Paymaster (if implemented)
        if (options.paymaster) {
          console.log("💳 Using Paymaster for gasless transaction...");
          // TODO: Implement Paymaster integration
          console.log("⚠️  Paymaster integration coming soon!");
        }
        
        const tx = await mneeToken.transfer(options.to, amount);
        console.log(`✅ Transaction sent!`);
        console.log(`Hash: ${tx.hash}`);
        console.log(`View on ${network.explorer}/tx/${tx.hash}`);
        
        console.log("\n⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        
        if (receipt) {
          console.log("✅ Transaction confirmed!");
          console.log(`Block: ${receipt.blockNumber}`);
          console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Bridge MNEE tokens across chains
 * Supports Bitcoin Ordinals → EVM chains (using UTXO model)
 */
program
  .command("bridge")
  .description("Bridge MNEE tokens from Bitcoin Ordinals to EVM chains (or vice versa)")
  .option("--to <address>", "Recipient address on target chain")
  .option("--amount <amount>", "Amount to bridge (in MNEE)")
  .option("--from <chain>", "Source chain (bitcoin, ethereum, base, polygon, arbitrum)")
  .option("--from-chain <chain>", "Source chain (alias for --from)")
  .option("--to-chain <chain>", "Target chain (ethereum, base, polygon, arbitrum)")
  .option("--from-address <address>", "Source address (Bitcoin address if from=bitcoin)")
  .option("--bitcoin-rpc <url>", "Bitcoin RPC URL (if bridging from Bitcoin)")
  .option("--yes", "Skip confirmation prompts")
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan("\n🌉 MNEE Bridge\n"));

      // Interactive prompts for missing options
      let fromChain = options.from || options.fromChain || await inquirer.prompt([
        {
          type: "list",
          name: "from",
          message: chalk.cyan("Source chain:"),
          choices: [
            { name: "Bitcoin (Ordinals)", value: "bitcoin" },
            { name: "Ethereum Mainnet", value: "ethereum" },
            { name: "Sepolia Testnet", value: "sepolia" },
            { name: "Base", value: "base" },
            { name: "Polygon", value: "polygon" },
            { name: "Arbitrum", value: "arbitrum" },
          ],
        },
      ]).then(a => a.from);

      // Normalize chain names (handle aliases like "btc", "eth")
      fromChain = normalizeChain(fromChain);
      let toChain = options.toChain ? normalizeChain(options.toChain) : await promptChain("Target chain:");
      toChain = normalizeChain(toChain);
      
      const amount = options.amount ? parseFloat(options.amount) : await promptAmount();
      const toAddress = options.to || await promptAddress("Recipient address:");
      
      // Validate networks exist
      const fromNetwork = NETWORKS[fromChain];
      if (!fromNetwork && fromChain !== "bitcoin") {
        throw new Error(`Unknown source chain: ${fromChain}. Available: ${Object.keys(NETWORKS).join(", ")}`);
      }
      
      const toNetwork = NETWORKS[toChain];
      if (!toNetwork && toChain !== "bitcoin") {
        throw new Error(`Unknown target chain: ${toChain}. Available: ${Object.keys(NETWORKS).join(", ")}`);
      }

      const bridge = new MNEEBridge();
      
      if (fromChain === "bitcoin") {
        // Bridge from Bitcoin Ordinals to EVM chain
        const fromAddress = options.fromAddress || process.env.BITCOIN_ADDRESS || 
          await promptAddress("Bitcoin source address:");
        
        const spinner = ora("Preparing bridge transaction...").start();
        
        try {
        const bridgeTx = await bridge.bridgeFromBitcoin({
          bitcoinAddress: fromAddress,
          bitcoinRpcUrl: options.bitcoinRpc,
            targetChain: toChain,
            targetAddress: toAddress,
            amount: amount,
          });
          spinner.succeed(chalk.green("Bridge prepared successfully"));
          console.log(chalk.green(`\n✅ Bridge transaction: ${bridgeTx}`));
        } catch (error: any) {
          spinner.fail(chalk.red(`Bridge error: ${error.message}`));
          throw error;
        }
      } else {
        // Bridge from EVM chain to Bitcoin or another EVM chain
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
          console.error(chalk.red("❌ PRIVATE_KEY not found in .env file"));
          process.exit(1);
        }

        // Validate network exists (after normalization)
        const fromNetwork = NETWORKS[fromChain];
        if (!fromNetwork) {
          throw new Error(`Unknown source chain: ${fromChain}. Available: ${Object.keys(NETWORKS).join(", ")}`);
        }
        
        const provider = new ethers.JsonRpcProvider(fromNetwork.rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const fromAddress = options.fromAddress || wallet.address;

        if (toChain === "bitcoin") {
          // EVM → Bitcoin
          const bitcoinAddress = toAddress;
          
          // Confirmation
          if (!options.yes) {
            console.log(chalk.yellow("\n⚠️  Transaction Summary:"));
            console.log(`   From: ${fromAddress} (${fromNetwork.name})`);
            console.log(`   To: ${bitcoinAddress} (Bitcoin)`);
            console.log(`   Amount: ${amount} MNEE\n`);
            
            const confirmed = await confirmTransaction("Proceed with bridge transaction?");
            if (!confirmed) {
              console.log(chalk.gray("Transaction cancelled"));
              process.exit(0);
            }
          }

          const spinner = ora("Locking tokens in bridge...").start();
          
          try {
          const bridgeTx = await bridge.bridgeToBitcoin(
              fromChain,
            fromAddress,
              bitcoinAddress,
              amount
            );
            spinner.succeed(chalk.green("Tokens locked in bridge"));
            console.log(chalk.green(`\n✅ Bridge transaction: ${bridgeTx}`));
            console.log(chalk.cyan(`\n💡 Next: Bridge operator will process the lock and release on Bitcoin`));
          } catch (error: any) {
            spinner.fail(chalk.red(`Bridge error: ${error.message}`));
            throw error;
          }
        } else {
          // EVM → EVM (standard token transfer)
          const toNetwork = NETWORKS[toChain];
          if (!toNetwork) {
            throw new Error(`Unknown target chain: ${toChain}. Available: ${Object.keys(NETWORKS).join(", ")}`);
          }
          console.log(chalk.yellow("💡 Use 'send' command for EVM to EVM transfers"));
          console.log(chalk.yellow("   Bridge is primarily for Bitcoin ↔ EVM transfers"));
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Bridge error: ${error.message}`));
      if (error.message.includes("not yet implemented")) {
        console.log(chalk.cyan("\n💡 Bridge Implementation Status:"));
        console.log("   - Bitcoin → EVM: Requires bridge protocol integration");
        console.log("   - Uses MNEE UTXO model on Bitcoin");
        console.log("   - Creates UTXO spend transaction on Bitcoin");
        console.log("   - Proves transaction on target chain");
        console.log("   - Mints/releases MNEE on target chain");
      }
      process.exit(1);
    }
  });

/**
 * Claim Bitcoin deposit on EVM chain
 */
program
  .command("claim-deposit")
  .description("Claim MNEE deposit on EVM chain after Bitcoin bridge proof is submitted")
  .option("--tx-hash <hash>", "Bitcoin transaction hash (txid)")
  .option("--chain <chain>", "Target chain (sepolia, ethereum, base, polygon, arbitrum)")
  .option("--yes", "Skip confirmation prompts")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💰 Claim Bitcoin Deposit\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const txHash = options.txHash || await inquirer.prompt([
        {
          type: "input",
          name: "txHash",
          message: chalk.cyan("Bitcoin transaction hash (txid):"),
          validate: (input: string) => {
            if (!input || input.length < 32) return "Invalid transaction hash";
            return true;
          },
        },
      ]).then(a => a.txHash);

      const bridge = new MNEEBridge();
      const spinner = ora("Claiming deposit...").start();
      
      try {
        const claimTx = await bridge.claimBitcoinDeposit(chain, txHash);
        spinner.succeed(chalk.green("Deposit claimed successfully!"));
        console.log(chalk.cyan(`\n✅ Claim Transaction: ${claimTx}`));
        const network = NETWORKS[chain];
        if (network) {
          console.log(chalk.gray(`   View on ${network.explorer}/tx/${claimTx}`));
        }
      } catch (error: any) {
        spinner.fail(chalk.red(`Claim error: ${error.message}`));
        throw error;
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Claim error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check balance on any chain (including Bitcoin Ordinals)
 */
program
  .command("balance")
  .description("Check MNEE balance on any chain (including Bitcoin Ordinals)")
  .option("--chain <chain>", "Chain to check (bitcoin, ethereum, base, polygon, arbitrum)", "ethereum")
  .option("--address <address>", "Address to check (defaults to your wallet)")
  .option("--rpc <url>", "Custom RPC URL")
  .option("--bitcoin-rpc <url>", "Bitcoin RPC URL (for Bitcoin chain, deprecated - use OrdinalsBot)")
  .option("--ordinalsbot-key <key>", "OrdinalsBot API key")
  .option("--ordinalsbot-url <url>", "OrdinalsBot API URL")
  .action(async (options) => {
    // Handle Bitcoin Ordinals separately
    if (options.chain === "bitcoin") {
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
      return;
    }

    try {
      const network = NETWORKS[options.chain];
      if (!network) {
        console.error(`❌ Unknown chain: ${options.chain}`);
        process.exit(1);
      }

      // Load from deployment file first, then network config, then fallback
      const deployment = loadDeploymentAddresses(network.chainId);
      const mneeAddress = deployment.mneeToken || network.mneeToken || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
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
        
        console.log(`\n📊 Balance on ${network.name}`);
        console.log(`Address: ${address}`);
        console.log(`Balance: ${formatted} ${symbol}`);
        console.log(`Chain ID: ${network.chainId}`);
      } catch (error: any) {
        if (error.message.includes("could not decode result")) {
          console.log(`⚠️  No contract found at ${mneeAddress} on ${network.name}`);
          console.log(`   MNEE might not be deployed on this chain yet.`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * List supported chains
 */
program
  .command("chains")
  .description("List all supported chains")
  .action(() => {
    console.log("\n🌐 Supported Chains:\n");
    Object.entries(NETWORKS).forEach(([key, network]) => {
      if (key === "bitcoin") {
        console.log(`✅ ${key.padEnd(15)} ${network.name.padEnd(25)} (UTXO/Ordinals)`);
        console.log(`   MNEE: Native on Bitcoin Ordinals (uses UTXO model)`);
        console.log(`   Format: Addresses start with 1, bc1, or 3`);
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
    console.log("   Use 'bridge' command to move MNEE between Bitcoin and EVM chains\n");
  });

/**
 * Create gasless wallet (using QuipoWallet)
 */
program
  .command("create-wallet")
  .description("Create a gasless agent wallet on any chain")
  .option("--chain <chain>", "Chain to create wallet on")
  .option("--salt <salt>", "Salt for deterministic address (default: 0)", "0")
  .option("--yes", "Skip confirmation prompts")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n👛 Create Agent Wallet\n"));
    try {
      // Interactive chain selection if not provided
      const chain = options.chain || await promptChain("Select chain to create wallet on:");
      const network = NETWORKS[chain];
      if (!network) {
        console.error(chalk.red(`❌ Unknown chain: ${chain}`));
        process.exit(1);
      }

      // Load factory address from deployment file or env
      const deployment = loadDeploymentAddresses(network.chainId);
      let factoryAddress = deployment.factory || 
                          process.env[`FACTORY_ADDRESS_${network.chainId}`] || 
                            process.env.FACTORY_ADDRESS;
      
      if (!factoryAddress) {
        console.error(`❌ Factory address not found for ${network.name}`);
        console.error(`   Options:`);
        console.error(`   1. Set FACTORY_ADDRESS_${network.chainId} in .env`);
        console.error(`   2. Deploy contracts and save to DEPLOYMENT_SEPOLIA.json (for Sepolia)`);
        process.exit(1);
      }
      
      if (deployment.factory) {
        console.log(`📋 Using factory from deployment file: ${factoryAddress}`);
      }

      const rpcUrl = options.rpc || network.rpcUrl;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Try to load private key from multiple sources
      const privateKey = process.env.PRIVATE_KEY || 
                        (fs.existsSync(path.join(__dirname, "..", "..", ".env")) 
                          ? (() => {
                              try {
                                const envContent = fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf-8");
                                const match = envContent.match(/PRIVATE_KEY=(.+)/);
                                return match ? match[1].trim() : undefined;
                              } catch {
                                return undefined;
                              }
                            })()
                          : undefined);
      
      if (!privateKey) {
        console.error("❌ PRIVATE_KEY not found");
        console.error("\n💡 To fix this:");
        console.error("   1. Add PRIVATE_KEY to your .env file in the project root:");
        console.error("      PRIVATE_KEY=your_private_key_here");
        console.error("\n   2. Or set it as an environment variable:");
        console.error("      export PRIVATE_KEY=your_private_key_here");
        console.error("\n⚠️  Make sure your private key starts with 0x and is 64 hex characters");
        process.exit(1);
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      
      const factoryAbi = [
        "function createWallet(address owner, uint256 salt) returns (address)",
        "function getAddress(address owner, uint256 salt) view returns (address)",
        "function getWallet(address owner) view returns (address)",
        "function totalWallets() view returns (uint256)",
      ];

      const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet) as any;
      
      // Check if wallet already exists
      const existing = await factory.getWallet(wallet.address);
      if (existing && existing !== ethers.ZeroAddress) {
        console.log(`\n✅ Wallet already exists: ${existing}`);
        console.log(chalk.cyan(`\n📍 Wallet Address: ${existing}`));
        console.log(chalk.gray(`🔗 View on ${network.explorer}/address/${existing}`));
        return;
      }

      // Get predicted address
      const saltValue = BigInt(options.salt || "0");
      
      let predicted: string = "N/A";
      try {
        // Call the function directly with explicit typing
        predicted = await factory.getAddress(wallet.address, saltValue);
      } catch (error: any) {
        // If getAddress fails, we'll still try to create
        console.log("⚠️  Could not predict address, creating anyway...");
      }
      
      console.log(`\n📝 Creating wallet on ${network.name}...`);
      if (predicted !== "N/A") {
        console.log(`Predicted address: ${predicted}`);
      }

      // Create wallet
      const tx = await factory.createWallet(wallet.address, saltValue);
      console.log(`Transaction: ${tx.hash}`);
      
      console.log(chalk.cyan(`\n⏳ Waiting for confirmation...`));
      const receipt = await tx.wait();
      if (receipt) {
        const created = await factory.getWallet(wallet.address);
        console.log(chalk.green(`\n✅ Wallet created successfully!`));
        console.log(chalk.cyan(`\n📍 Wallet Address: ${created}`));
        console.log(chalk.gray(`🔗 View on ${network.explorer}/address/${created}`));
        console.log(chalk.gray(`📝 Transaction: ${network.explorer}/tx/${receipt.hash}`));
        console.log(chalk.gray(`   Block: ${receipt.blockNumber}`));
        console.log(chalk.gray(`   Gas used: ${receipt.gasUsed.toString()}`));
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * MNEE Credit Pool commands
 */
program
  .command("stake")
  .description("Stake MNEE tokens and get instant credit line")
  .option("--chain <chain>", "Chain to stake on")
  .option("--amount <amount>", "Amount of MNEE to stake")
  .option("--yes", "Skip confirmation prompts")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💎 MNEE Staking\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const network = NETWORKS[chain];
      if (!network || chain === "bitcoin") {
        console.error(chalk.red(`❌ Invalid chain: ${chain}`));
        process.exit(1);
      }

      const deployment = loadDeploymentAddresses(network.chainId);
      const creditPoolAddress = deployment.creditPool || process.env.CREDIT_POOL_ADDRESS;
      if (!creditPoolAddress) {
        console.error(chalk.red(`❌ Credit pool not found for ${network.name}`));
        console.error(`   Deploy credit pool first or set CREDIT_POOL_ADDRESS`);
        process.exit(1);
      }

      const amount = options.amount ? parseFloat(options.amount) : await promptAmount();
      const amountWei = ethers.parseEther(amount.toString());

      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red("❌ PRIVATE_KEY not found in .env"));
        process.exit(1);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const mneeTokenAbi = ["function approve(address spender, uint256 amount) returns (bool)"];
      // Get MNEE token address from deployment or network config
      const mneeTokenAddress = deployment.mneeToken || network.mneeToken || process.env.MNEE_TOKEN_ADDRESS;
      if (!mneeTokenAddress) {
        console.error(chalk.red(`❌ MNEE token address not found`));
        process.exit(1);
      }
      const mneeToken = new ethers.Contract(mneeTokenAddress, mneeTokenAbi, wallet);

      const creditPoolAbi = [
        "function stake(uint256 amount) external",
        "function getUserInfo(address) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,bool)",
        "function paused() external view returns (bool)",
        "function mneeToken() external view returns (address)",
      ];

      const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, wallet);

      // Verify contract is accessible
      try {
        const poolToken = await creditPool.mneeToken();
        console.log(chalk.gray(`Credit Pool Token: ${poolToken}`));
        const isPaused = await creditPool.paused();
        if (isPaused) {
          console.error(chalk.red(`❌ Credit pool is paused`));
          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red(`❌ Cannot access credit pool: ${error.message}`));
        console.error(chalk.yellow(`   Verify contract is deployed at: ${creditPoolAddress}`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n📋 Staking ${amount} MNEE on ${network.name}...`));
      console.log(chalk.gray(`Credit Pool: ${creditPoolAddress}`));

      // Check balance first
      const balanceAbi = ["function balanceOf(address) external view returns (uint256)"];
      const tokenContract = new ethers.Contract(mneeTokenAddress, balanceAbi, provider);
      const balance = await tokenContract.balanceOf(wallet.address);
      if (balance < amountWei) {
        console.error(chalk.red(`❌ Insufficient balance: ${ethers.formatEther(balance)} MNEE < ${amount} MNEE`));
        process.exit(1);
      }

      // Approve if needed
      const allowanceAbi = ["function allowance(address, address) external view returns (uint256)"];
      const allowanceContract = new ethers.Contract(mneeTokenAddress, allowanceAbi, provider);
      const allowance = await allowanceContract.allowance(wallet.address, creditPoolAddress);
      
      if (allowance < amountWei) {
        const spinner = ora("Approving MNEE...").start();
        try {
          const tx = await mneeToken.approve(creditPoolAddress, amountWei);
          await tx.wait();
          spinner.succeed("✅ Approved");
        } catch (error: any) {
          spinner.fail(`❌ Approval failed: ${error.message}`);
          process.exit(1);
        }
      } else {
        console.log(chalk.green("✅ Already approved"));
      }

      // Stake
      const stakeSpinner = ora("Staking MNEE...").start();
      try {
        const stakeTx = await creditPool.stake(amountWei);
        stakeSpinner.text = "Waiting for confirmation...";
        const receipt = await stakeTx.wait();

        stakeSpinner.succeed(chalk.green("✅ Staked successfully!"));
        console.log(chalk.cyan(`\n📍 Transaction: ${network.explorer}/tx/${receipt.hash}`));

        // Get updated info
        const userInfo = await creditPool.getUserInfo(wallet.address);
        console.log(chalk.cyan(`\n💳 Credit Line: ${ethers.formatEther(userInfo[1])} MNEE`));
        console.log(chalk.cyan(`💰 Available Credit: ${ethers.formatEther(userInfo[3])} MNEE`));
      } catch (error: any) {
        stakeSpinner.fail(chalk.red(`❌ Staking failed`));
        console.error(chalk.red(`Error: ${error.message}`));
        
        // Try to decode revert reason if available
        if (error.reason) {
          console.error(chalk.yellow(`Revert reason: ${error.reason}`));
        }
        if (error.data) {
          console.error(chalk.yellow(`Transaction data: ${error.data}`));
        }
        
        // Check if it's a missing revert data error
        if (error.message?.includes("missing revert data")) {
          console.error(chalk.yellow("\n💡 This usually means:"));
          console.error("   1. Contract is paused (check with credit-info)");
          console.error("   2. Insufficient MNEE balance");
          console.error("   3. MNEE token doesn't allow transfers");
          console.error("   4. Amount below minimum (100 MNEE)");
          console.error("\n   Try checking:");
          console.error(`   ./mnee-x credit-info --chain ${chain}`);
        }
        
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("borrow")
  .description("Borrow MNEE from credit line")
  .option("--chain <chain>", "Chain to borrow on")
  .option("--amount <amount>", "Amount of MNEE to borrow")
  .option("--yes", "Skip confirmation prompts")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💳 Borrow from Credit Line\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const network = NETWORKS[chain];
      if (!network || chain === "bitcoin") {
        console.error(chalk.red(`❌ Invalid chain: ${chain}`));
        process.exit(1);
      }

      const deployment = loadDeploymentAddresses(network.chainId);
      const creditPoolAddress = deployment.creditPool || process.env.CREDIT_POOL_ADDRESS;
      if (!creditPoolAddress) {
        console.error(chalk.red(`❌ Credit pool not found`));
        process.exit(1);
      }

      const amount = options.amount ? parseFloat(options.amount) : await promptAmount();
      const amountWei = ethers.parseEther(amount.toString());

      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red("❌ PRIVATE_KEY not found"));
        process.exit(1);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const creditPoolAbi = [
        "function borrowFromCreditLine(uint256 amount) external",
        "function getAvailableCredit(address) external view returns (uint256)",
      ];

      const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, wallet);

      // Check available credit
      const available = await creditPool.getAvailableCredit(wallet.address);
      console.log(chalk.cyan(`\n💰 Available Credit: ${ethers.formatEther(available)} MNEE`));

      if (available < amountWei) {
        console.error(chalk.red(`❌ Insufficient credit. Available: ${ethers.formatEther(available)} MNEE`));
        process.exit(1);
      }

      const spinner = ora("Borrowing MNEE...").start();
      const tx = await creditPool.borrowFromCreditLine(amountWei);
      spinner.text = "Waiting for confirmation...";
      const receipt = await tx.wait();

      spinner.succeed(chalk.green(`✅ Borrowed ${amount} MNEE!`));
      console.log(chalk.cyan(`📍 Transaction: ${network.explorer}/tx/${receipt.hash}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("credit-info")
  .description("Check credit line status")
  .option("--chain <chain>", "Chain to check")
  .option("--address <address>", "Address to check (default: your address)")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💳 Credit Line Info\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const network = NETWORKS[chain];
      if (!network || chain === "bitcoin") {
        console.error(chalk.red(`❌ Invalid chain: ${chain}`));
        process.exit(1);
      }

      const deployment = loadDeploymentAddresses(network.chainId);
      const creditPoolAddress = deployment.creditPool || process.env.CREDIT_POOL_ADDRESS;
      if (!creditPoolAddress) {
        console.error(chalk.red(`❌ Credit pool not found`));
        process.exit(1);
      }

      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red("❌ PRIVATE_KEY not found"));
        process.exit(1);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = options.address || wallet.address;

      const creditPoolAbi = [
        "function getUserInfo(address) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,bool)",
        "function totalStaked() external view returns (uint256)",
        "function totalBorrowed() external view returns (uint256)",
        "function totalLiquidity() external view returns (uint256)",
      ];

      const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, provider);

      const userInfo = await creditPool.getUserInfo(address);
      const [staked, creditLine, borrowed, available, rewards, interest, isActive] = userInfo;

      console.log(chalk.cyan(`\n📍 Address: ${address}`));
      console.log(chalk.cyan(`🔗 View on ${network.explorer}/address/${address}\n`));

      if (!isActive) {
        console.log(chalk.yellow("⚠️  Not staking"));
        return;
      }

      console.log(chalk.green("✅ Staking Active\n"));
      console.log(chalk.cyan(`💎 Staked: ${ethers.formatEther(staked)} MNEE`));
      console.log(chalk.cyan(`💳 Credit Line: ${ethers.formatEther(creditLine)} MNEE`));
      console.log(chalk.cyan(`💰 Borrowed: ${ethers.formatEther(borrowed)} MNEE`));
      console.log(chalk.cyan(`✨ Available Credit: ${ethers.formatEther(available)} MNEE`));
      console.log(chalk.cyan(`🎁 Rewards: ${ethers.formatEther(rewards)} MNEE`));
      console.log(chalk.cyan(`💸 Interest Owed: ${ethers.formatEther(interest)} MNEE`));

      const poolInfo = await Promise.all([
        creditPool.totalStaked(),
        creditPool.totalBorrowed(),
        creditPool.totalLiquidity(),
      ]);

      console.log(chalk.yellow(`\n📊 Pool Stats:`));
      console.log(chalk.gray(`   Total Staked: ${ethers.formatEther(poolInfo[0])} MNEE`));
      console.log(chalk.gray(`   Total Borrowed: ${ethers.formatEther(poolInfo[1])} MNEE`));
      console.log(chalk.gray(`   Available Liquidity: ${ethers.formatEther(poolInfo[2])} MNEE`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("repay")
  .description("Repay borrowed MNEE")
  .option("--chain <chain>", "Chain to repay on")
  .option("--amount <amount>", "Amount of MNEE to repay")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💳 Repay Credit\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const network = NETWORKS[chain];
      if (!network || chain === "bitcoin") {
        console.error(chalk.red(`❌ Invalid chain: ${chain}`));
        process.exit(1);
      }

      const deployment = loadDeploymentAddresses(network.chainId);
      const creditPoolAddress = deployment.creditPool || process.env.CREDIT_POOL_ADDRESS;
      if (!creditPoolAddress) {
        console.error(chalk.red(`❌ Credit pool not found`));
        process.exit(1);
      }

      const amount = options.amount ? parseFloat(options.amount) : await promptAmount();
      const amountWei = ethers.parseEther(amount.toString());

      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red("❌ PRIVATE_KEY not found"));
        process.exit(1);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const mneeTokenAbi = ["function approve(address spender, uint256 amount) returns (bool)"];
      // Get MNEE token address from deployment or network config
      const mneeTokenAddress = deployment.mneeToken || network.mneeToken || process.env.MNEE_TOKEN_ADDRESS;
      if (!mneeTokenAddress) {
        console.error(chalk.red(`❌ MNEE token address not found`));
        process.exit(1);
      }
      const mneeToken = new ethers.Contract(mneeTokenAddress, mneeTokenAbi, wallet);

      const creditPoolAbi = ["function repayCredit(uint256 amount) external"];

      const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, wallet);

      // Approve
      const approveSpinner = ora("Approving MNEE...").start();
      const approveTx = await mneeToken.approve(creditPoolAddress, amountWei);
      await approveTx.wait();
      approveSpinner.succeed("✅ Approved");

      // Repay
      const repaySpinner = ora("Repaying credit...").start();
      const repayTx = await creditPool.repayCredit(amountWei);
      repaySpinner.text = "Waiting for confirmation...";
      const receipt = await repayTx.wait();

      repaySpinner.succeed(chalk.green(`✅ Repaid ${amount} MNEE!`));
      console.log(chalk.cyan(`📍 Transaction: ${network.explorer}/tx/${receipt.hash}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("provide-liquidity")
  .description("Provide liquidity to the credit pool (earn 6% APY)")
  .option("--chain <chain>", "Chain to provide liquidity on")
  .option("--amount <amount>", "Amount of MNEE to provide")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n💧 Provide Liquidity\n"));
    try {
      const chain = options.chain || await promptChain("Select chain:");
      const network = NETWORKS[chain];
      if (!network || chain === "bitcoin") {
        console.error(chalk.red(`❌ Invalid chain: ${chain}`));
        process.exit(1);
      }

      const deployment = loadDeploymentAddresses(network.chainId);
      const creditPoolAddress = deployment.creditPool || process.env.CREDIT_POOL_ADDRESS;
      if (!creditPoolAddress) {
        console.error(chalk.red(`❌ Credit pool not found`));
        process.exit(1);
      }

      const amount = options.amount ? parseFloat(options.amount) : await promptAmount("Amount of MNEE to provide");
      const amountWei = ethers.parseEther(amount.toString());

      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red("❌ PRIVATE_KEY not found"));
        process.exit(1);
      }

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const mneeTokenAbi = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
      ];
      // Get MNEE token address from deployment or network config
      const mneeTokenAddress = deployment.mneeToken || network.mneeToken || process.env.MNEE_TOKEN_ADDRESS;
      if (!mneeTokenAddress) {
        console.error(chalk.red(`❌ MNEE token address not found`));
        process.exit(1);
      }
      const mneeToken = new ethers.Contract(mneeTokenAddress, mneeTokenAbi, wallet);

      // Check balance
      const balance = await mneeToken.balanceOf(wallet.address);
      const balanceFormatted = parseFloat(ethers.formatEther(balance));
      console.log(chalk.cyan(`💰 Your MNEE Balance: ${balanceFormatted} MNEE`));
      
      if (balance < amountWei) {
        console.error(chalk.red(`❌ Insufficient balance: ${balanceFormatted} MNEE < ${amount} MNEE`));
        process.exit(1);
      }

      const creditPoolAbi = ["function provideLiquidity(uint256 amount) external"];

      const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, wallet);

      // Approve
      const approveSpinner = ora("Approving MNEE...").start();
      try {
        const approveTx = await mneeToken.approve(creditPoolAddress, amountWei);
        approveSpinner.text = "Waiting for approval confirmation...";
        await approveTx.wait();
        approveSpinner.succeed("✅ Approved");
      } catch (error: any) {
        approveSpinner.fail("⚠️ Approval may have failed");
        if (error.reason) {
          console.error(chalk.yellow(`Reason: ${error.reason}`));
        }
      }

      // Provide liquidity
      const liquiditySpinner = ora(`Providing ${amount} MNEE to pool...`).start();
      try {
        const liquidityTx = await creditPool.provideLiquidity(amountWei);
        liquiditySpinner.text = "Waiting for confirmation...";
        const receipt = await liquidityTx.wait();

        liquiditySpinner.succeed(chalk.green(`✅ Provided ${amount} MNEE to pool!`));
        console.log(chalk.cyan(`📍 Transaction: ${network.explorer}/tx/${receipt.hash}`));
        console.log(chalk.green(`\n💡 You now earn 6% APY on your liquidity!`));
        console.log(chalk.gray(`   Run 'credit-info --chain ${chain}' to check your liquidity position.`));
      } catch (error: any) {
        liquiditySpinner.fail(chalk.red("❌ Failed to provide liquidity"));
        if (error.reason) {
          console.error(chalk.red(`Reason: ${error.reason}`));
        } else if (error.data) {
          console.error(chalk.red(`Data: ${error.data}`));
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("check-contract")
  .description("Check contract information and identify contract type")
  .requiredOption("--address <address>", "Contract address to check")
  .option("--chain <chain>", "Chain to check on", "sepolia")
  .option("--rpc <url>", "Custom RPC URL")
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan("\n🔍 Check Contract\n"));

      const network = NETWORKS[options.chain];
      if (!network) {
        console.error(`❌ Unknown chain: ${options.chain}`);
        process.exit(1);
      }

      const rpcUrl = options.rpc || network.rpcUrl;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const address = options.address;

      console.log(`📍 Address: ${address}`);
      console.log(`🌐 Chain: ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`🔗 Explorer: ${network.explorer}/address/${address}\n`);

      // Check if it's a contract
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.log(chalk.red("❌ Not a contract (EOA - Externally Owned Account)"));
        return;
      }

      console.log(chalk.green("✅ Is a contract"));
      console.log(`📦 Code size: ${(code.length - 2) / 2} bytes\n`);

      // Try to identify contract type
      const BridgeABI = [
        "function utxoToken() view returns (address)",
        "function erc20Token() view returns (address)",
        "function owner() view returns (address)",
      ];

      const UTXOABI = [
        "function totalSupply() view returns (uint256)",
        "function owner() view returns (address)",
        "function MAX_SUPPLY() view returns (uint256)",
      ];

      const ERC20ABI = [
        "function totalSupply() view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function name() view returns (string)",
      ];

      const FactoryABI = [
        "function entryPoint() view returns (address)",
        "function totalWallets() view returns (uint256)",
      ];

      const PaymasterABI = [
        "function mneeToken() view returns (address)",
        "function treasury() view returns (address)",
        "function totalGasSponsored() view returns (uint256)",
      ];

      // Check for BridgeMNEE
      try {
        const bridge = new ethers.Contract(address, BridgeABI, provider);
        const utxoToken = await bridge.utxoToken().catch(() => null);
        if (utxoToken && utxoToken !== ethers.ZeroAddress) {
          console.log(chalk.cyan("✅ Contract Type: BridgeMNEE"));
          console.log(`   UTXO Token: ${utxoToken}`);
          const erc20Token = await bridge.erc20Token().catch(() => "N/A");
          console.log(`   ERC20 Token: ${erc20Token}`);
          const owner = await bridge.owner().catch(() => "N/A");
          console.log(`   Owner: ${owner}`);
          return;
        }
      } catch {}

      // Check for MNEETokenUTXO
      try {
        const utxo = new ethers.Contract(address, UTXOABI, provider);
        const maxSupply = await utxo.MAX_SUPPLY().catch(() => null);
        if (maxSupply) {
          console.log(chalk.cyan("✅ Contract Type: MNEETokenUTXO"));
          const totalSupply = await utxo.totalSupply();
          console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} MNEE`);
          console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} MNEE`);
          const owner = await utxo.owner().catch(() => "N/A");
          console.log(`   Owner: ${owner}`);
          return;
        }
      } catch {}

      // Check for ERC20 Token
      try {
        const token = new ethers.Contract(address, ERC20ABI, provider);
        const symbol = await token.symbol().catch(() => null);
        if (symbol) {
          console.log(chalk.cyan(`✅ Contract Type: ERC-20 Token (${symbol})`));
          const name = await token.name().catch(() => "N/A");
          console.log(`   Name: ${name}`);
          const decimals = await token.decimals().catch(() => "N/A");
          console.log(`   Decimals: ${decimals}`);
          const totalSupply = await token.totalSupply().catch(() => null);
          if (totalSupply) {
            console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
          }
          return;
        }
      } catch {}

      // Check for Factory
      try {
        const factory = new ethers.Contract(address, FactoryABI, provider);
        const entryPoint = await factory.entryPoint().catch(() => null);
        if (entryPoint && entryPoint !== ethers.ZeroAddress) {
          console.log(chalk.cyan("✅ Contract Type: AgentWalletFactory"));
          console.log(`   EntryPoint: ${entryPoint}`);
          const totalWallets = await factory.totalWallets().catch(() => "N/A");
          console.log(`   Total Wallets Created: ${totalWallets}`);
          return;
        }
      } catch {}

      // Check for Paymaster
      try {
        const paymaster = new ethers.Contract(address, PaymasterABI, provider);
        const mneeToken = await paymaster.mneeToken().catch(() => null);
        if (mneeToken && mneeToken !== ethers.ZeroAddress) {
          console.log(chalk.cyan("✅ Contract Type: MNEEPaymaster"));
          console.log(`   MNEE Token: ${mneeToken}`);
          const treasury = await paymaster.treasury().catch(() => "N/A");
          console.log(`   Treasury: ${treasury}`);
          const totalGasSponsored = await paymaster.totalGasSponsored().catch(() => null);
          if (totalGasSponsored) {
            console.log(`   Total Gas Sponsored: ${ethers.formatEther(totalGasSponsored)} ETH`);
          }
          return;
        }
      } catch {}

      console.log(chalk.yellow("⚠️  Could not identify contract type"));
      console.log(chalk.gray("   It's a contract but doesn't match known ABIs"));
      console.log(chalk.gray(`   View on explorer: ${network.explorer}/address/${address}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

