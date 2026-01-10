import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying staking contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Load existing deployment info
  const deploymentFile = path.join(__dirname, "..", "DEPLOYMENT_SEPOLIA.json");
  let deploymentInfo: any = {};
  
  if (fs.existsSync(deploymentFile)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
    console.log("\n=== Loading Existing Deployment ===");
    console.log("Network:", deploymentInfo.network);
  }

  // Get contract addresses
  const mneeTokenAddress = deploymentInfo.contracts?.mneeToken || process.env.MNEE_TOKEN_ADDRESS;
  if (!mneeTokenAddress) {
    throw new Error("MNEE token address not found. Deploy contracts first or set MNEE_TOKEN_ADDRESS");
  }

  // USDC address (Sepolia testnet USDC or deploy mock)
  // Sepolia USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 (example)
  const usdcAddress = process.env.USDC_TOKEN_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  console.log("\n=== USDC Token ===");
  console.log("USDC Address:", usdcAddress);
  console.log("Note: Using existing USDC or mock. Update USDC_TOKEN_ADDRESS if needed.");

  // Liquidity hub address (can be same as deployer for now, or separate address)
  const liquidityHub = process.env.LIQUIDITY_HUB_ADDRESS || deployer.address;
  console.log("\n=== Liquidity Hub ===");
  console.log("Liquidity Hub Address:", liquidityHub);

  console.log("\n=== Deploying MNEE Staking Contract ===");
  const MNEEStaking = await ethers.getContractFactory("MNEEStaking");
  const staking = await MNEEStaking.deploy(
    mneeTokenAddress,
    usdcAddress,
    liquidityHub,
    deployer.address
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("MNEE Staking deployed to:", stakingAddress);

  // Get EntryPoint for AgentWalletStaking
  const ENTRY_POINT_ADDRESS = deploymentInfo.contracts?.entryPoint || 
                              process.env.ENTRY_POINT_ADDRESS || 
                              "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

  console.log("\n=== Deploying Agent Wallet Staking ===");
  const AgentWalletStaking = await ethers.getContractFactory("AgentWalletStaking");
  const agentWalletStaking = await AgentWalletStaking.deploy(
    ENTRY_POINT_ADDRESS,
    stakingAddress,
    usdcAddress
  );
  await agentWalletStaking.waitForDeployment();
  const agentWalletStakingAddress = await agentWalletStaking.getAddress();
  console.log("Agent Wallet Staking deployed to:", agentWalletStakingAddress);

  // Update deployment info
  if (!deploymentInfo.contracts) {
    deploymentInfo.contracts = {};
  }
  deploymentInfo.contracts.staking = stakingAddress;
  deploymentInfo.contracts.agentWalletStaking = agentWalletStakingAddress;
  deploymentInfo.contracts.usdcToken = usdcAddress;
  deploymentInfo.contracts.liquidityHub = liquidityHub;

  // Save deployment info
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n=== Deployment Info Saved ===");
  console.log("File:", deploymentFile);

  console.log("\n=== Next Steps ===");
  console.log("1. Fund liquidity hub with USDC:");
  console.log(`   usdcToken.approve(${stakingAddress}, amount)`);
  console.log(`   staking.addLiquidity(amount)`);
  console.log("\n2. Users can now stake MNEE and borrow USDC!");
  console.log(`   staking.stake(mneeAmount)`);
  console.log(`   staking.borrow(usdcAmount)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


