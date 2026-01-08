import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Script to seed initial liquidity to the MNEE Credit Pool
 * This is necessary before users can borrow from their credit lines
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding liquidity with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

  // Load deployment info
  const deploymentFile = path.join(__dirname, "../DEPLOYMENT_SEPOLIA.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error("DEPLOYMENT_SEPOLIA.json not found. Deploy contracts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  const creditPoolAddress = deployment.contracts?.creditPool;
  const mneeTokenAddress = deployment.contracts?.mneeToken;

  if (!creditPoolAddress) {
    throw new Error("Credit pool address not found in deployment file");
  }

  if (!mneeTokenAddress) {
    throw new Error("MNEE token address not found in deployment file");
  }

  console.log("\n=== Configuration ===");
  console.log("Credit Pool:", creditPoolAddress);
  console.log("MNEE Token:", mneeTokenAddress);

  // Get contracts
  const mneeTokenAbi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  const creditPoolAbi = [
    "function provideLiquidity(uint256 amount) external",
    "function totalLiquidity() view returns (uint256)"
  ];

  const mneeToken = new ethers.Contract(mneeTokenAddress, mneeTokenAbi, deployer);
  const creditPool = new ethers.Contract(creditPoolAddress, creditPoolAbi, deployer);

  // Check balance
  const balanceMNEE = await mneeToken.balanceOf(deployer.address);
  console.log("\n=== Current State ===");
  console.log("Your MNEE Balance:", ethers.formatEther(balanceMNEE), "MNEE");
  
  const currentLiquidity = await creditPool.totalLiquidity();
  console.log("Current Pool Liquidity:", ethers.formatEther(currentLiquidity), "MNEE");

  // Amount to provide (can be configured)
  const amountToProvide = process.env.LIQUIDITY_AMOUNT 
    ? ethers.parseEther(process.env.LIQUIDITY_AMOUNT)
    : ethers.parseEther("100000"); // Default: 100k MNEE

  console.log("\n=== Providing Liquidity ===");
  console.log("Amount to provide:", ethers.formatEther(amountToProvide), "MNEE");

  if (balanceMNEE < amountToProvide) {
    throw new Error(`Insufficient balance: ${ethers.formatEther(balanceMNEE)} < ${ethers.formatEther(amountToProvide)}`);
  }

  // Approve
  console.log("\n1. Approving MNEE...");
  const approveTx = await mneeToken.approve(creditPoolAddress, amountToProvide);
  console.log("   Transaction:", approveTx.hash);
  await approveTx.wait();
  console.log("   ✅ Approved");

  // Provide liquidity
  console.log("\n2. Providing liquidity...");
  const liquidityTx = await creditPool.provideLiquidity(amountToProvide);
  console.log("   Transaction:", liquidityTx.hash);
  const receipt = await liquidityTx.wait();
  console.log("   ✅ Liquidity provided");

  // Check new state
  const newLiquidity = await creditPool.totalLiquidity();
  console.log("\n=== New State ===");
  console.log("New Pool Liquidity:", ethers.formatEther(newLiquidity), "MNEE");
  console.log("Added:", ethers.formatEther(newLiquidity - currentLiquidity), "MNEE");

  console.log("\n✅ Liquidity seeding complete!");
  console.log("💡 Users can now borrow from their credit lines");
  console.log("💡 You earn 6% APY on your provided liquidity");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

