import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Check balance and recent transactions for deployer wallet
 */
async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.error("❌ No signers available!");
    process.exit(1);
  }
  
  const deployer = signers[0];
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  const blockNumber = await ethers.provider.getBlockNumber();
  
  console.log("\n" + "=".repeat(70));
  console.log("🔍 BALANCE CHECK");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Current Block: ${blockNumber}`);
  console.log(`Wallet Address: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("=".repeat(70));
  
  // Check recent transactions
  try {
    console.log("\n📡 Checking recent transactions...");
    const explorer = network.chainId === 11155111n 
      ? `https://sepolia.etherscan.io/address/${deployer.address}`
      : `https://etherscan.io/address/${deployer.address}`;
    
    console.log(`\n🔗 View on block explorer:`);
    console.log(`   ${explorer}`);
    
    // Try to get the latest block to see if we're synced
    const block = await ethers.provider.getBlock("latest");
    if (block) {
      console.log(`\n📦 Latest Block Info:`);
      console.log(`   Block Number: ${block.number}`);
      console.log(`   Block Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    }
  } catch (error) {
    console.log("⚠️  Could not fetch additional info");
  }
  
  if (balance === 0n && network.chainId === 11155111n) {
    console.log("\n⚠️  Balance is still 0 ETH on Sepolia");
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Wait a few minutes - transactions can take time to confirm");
    console.log("   2. Check the transaction on Etherscan:");
    console.log(`      https://sepolia.etherscan.io/address/${deployer.address}`);
    console.log("   3. Verify you sent to the correct address");
    console.log("   4. Make sure you sent Sepolia ETH, not mainnet ETH");
    console.log("   5. Check your transaction hash to see if it's confirmed");
  }
  
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

