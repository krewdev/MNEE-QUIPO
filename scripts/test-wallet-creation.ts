import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Test wallet creation on deployed Factory
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Try to load from deployment file
  let FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
  
  if (!FACTORY_ADDRESS) {
    // Try to read from deployment file
    const deploymentFile = path.join(__dirname, "..", "DEPLOYMENT_SEPOLIA.json");
    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
      FACTORY_ADDRESS = deployment.contracts?.factory;
      console.log("📋 Loaded factory address from deployment file:", FACTORY_ADDRESS);
    }
  }
  
  if (!FACTORY_ADDRESS) {
    FACTORY_ADDRESS = "0xbA413192a4bc82C8128A7bF76Df8cE7fB5c1a389"; // Latest Sepolia deployment
    console.log("⚠️  Using default factory address:", FACTORY_ADDRESS);
  }
  
  console.log("Factory address:", FACTORY_ADDRESS);
  
  const FactoryABI = [
    "function createWallet(address owner, uint256 salt) returns (address)",
    "function getAddress(address owner, uint256 salt) view returns (address)",
    "function getWallet(address owner) view returns (address)",
    "function totalWallets() view returns (uint256)",
    "event WalletCreated(address indexed owner, address indexed wallet, uint256 indexed index)",
  ];

  const factory = await ethers.getContractAt(FactoryABI, FACTORY_ADDRESS);

  // Check current state
  console.log("\n=== Current State ===");
  const totalWallets = await factory.totalWallets();
  console.log("Total wallets:", totalWallets.toString());

  const existingWallet = await factory.getWallet(deployer.address);
  if (existingWallet !== ethers.ZeroAddress) {
    console.log("Existing wallet:", existingWallet);
    console.log("✅ Wallet already exists for this address");
    return;
  }

  // Get predicted address
  const salt = 0;
  
  // Note: getAddress might use different parameters depending on Factory implementation
  // Some implementations use (owner, salt), others might use just (owner)
  let predictedAddress;
  try {
    predictedAddress = await factory.getAddress(deployer.address, salt);
  } catch {
    // Try without salt parameter
    try {
      predictedAddress = await factory.getAddress(deployer.address);
    } catch {
      predictedAddress = "N/A (could not predict)";
    }
  }
  
  console.log("\n=== Creating Wallet ===");
  if (predictedAddress !== "N/A (could not predict)") {
    console.log("Predicted address:", predictedAddress);
  } else {
    console.log("Note: Address prediction not available");
  }

  // Create wallet
  console.log("\nSending transaction...");
  const tx = await factory.createWallet(deployer.address, salt);
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  
  if (receipt) {
    console.log("✅ Wallet created successfully!");
    
    // Find WalletCreated event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === "WalletCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      console.log("\n=== Wallet Details ===");
      console.log("Owner:", parsed?.args[0]);
      console.log("Wallet Address:", parsed?.args[1]);
      console.log("Index:", parsed?.args[2].toString());
    }

    // Verify wallet exists
    const createdWallet = await factory.getWallet(deployer.address);
    console.log("\n=== Verification ===");
    console.log("Wallet retrieved from factory:", createdWallet);
    
    if (predictedAddress !== "N/A (could not predict)") {
      const matches = createdWallet.toLowerCase() === predictedAddress.toLowerCase();
      console.log("Matches predicted:", matches);
      if (!matches) {
        console.log("⚠️  Note: Address doesn't match prediction.");
        console.log("   This can happen if Factory uses different CREATE2 parameters.");
        console.log("   The wallet was created successfully regardless.");
      }
    }
    
    const newTotal = await factory.totalWallets();
    console.log("New total wallets:", newTotal.toString());
  }

  console.log("\n✅ Test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

