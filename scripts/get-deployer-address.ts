import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Get deployer wallet address from private key
 * Use this address to request Sepolia ETH from faucets
 */
async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.error("❌ No signers available!");
    console.error("Please configure PRIVATE_KEY in .env file");
    process.exit(1);
  }
  
  const deployer = signers[0];
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYER WALLET INFO");
  console.log("=".repeat(60));
  console.log(`Address: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("=".repeat(60));
  
  if (network.chainId === 11155111n) { // Sepolia
    if (balance === 0n) {
      console.log("\n⚠️  Your wallet has 0 ETH on Sepolia!");
      console.log("\n💧 Request Sepolia ETH from these faucets:");
      console.log("   1. Alchemy: https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("   2. QuickNode: https://faucet.quicknode.com/ethereum/sepolia");
      console.log("   3. Sepolia Faucet: https://sepoliafaucet.com/");
      console.log("   4. PoW Faucet: https://sepolia-faucet.pk910.de/");
      console.log("   5. Chainlink: https://faucets.chain.link/sepolia");
      console.log("\n🔗 Send to this address:");
      console.log(`   ${deployer.address}`);
      console.log("\n📖 See FAUCETS.md for detailed instructions");
    }
  } else if (network.chainId === 1337n || network.chainId === 31337n) {
    console.log("\n⚠️  You're on a local Hardhat network!");
    console.log("To get your Sepolia address, run:");
    console.log("   npm run get-address -- --network sepolia");
    console.log("   OR");
    console.log("   NETWORK=sepolia hardhat run scripts/get-deployer-address.ts --network sepolia");
  }
  
  if (balance === 0n && network.chainId !== 1337n && network.chainId !== 31337n) {
  } else {
    const ethBalance = parseFloat(ethers.formatEther(balance));
    if (ethBalance < 0.2) {
      console.log("\n⚠️  Low balance! You need at least 0.2 ETH for deployment:");
      console.log("   - Contract deployment: ~0.01 ETH");
      console.log("   - Paymaster deposit: 0.1 ETH");
      console.log("   - Paymaster stake: 0.01 ETH");
      console.log("   - Gas fees: ~0.08 ETH");
    } else {
      console.log("\n✅ Sufficient balance for deployment!");
    }
  }
  
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

