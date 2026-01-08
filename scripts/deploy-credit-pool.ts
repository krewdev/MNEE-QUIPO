import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MNEE Credit Pool with account:", deployer.address);
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
  let mneeTokenAddress = deploymentInfo.contracts?.mneeToken || process.env.MNEE_TOKEN_ADDRESS;
  
  // If no token address, deploy test MNEE token
  if (!mneeTokenAddress) {
    console.log("\n=== Deploying Test MNEE Token ===");
    const MNEEToken = await ethers.getContractFactory("MNEEToken");
    const mneeToken = await MNEEToken.deploy(deployer.address);
    await mneeToken.waitForDeployment();
    mneeTokenAddress = await mneeToken.getAddress();
    console.log("✅ Test MNEE Token deployed to:", mneeTokenAddress);
    
    // Update deployment info
    if (!deploymentInfo.contracts) {
      deploymentInfo.contracts = {};
    }
    deploymentInfo.contracts.mneeToken = mneeTokenAddress;
  }

  const treasury = deploymentInfo.treasury || deployer.address;
  console.log("\n=== Configuration ===");
  console.log("MNEE Token Address:", mneeTokenAddress);
  console.log("Treasury Address:", treasury);

  console.log("\n=== Deploying MNEE Credit Pool ===");
  const MNEECreditPool = await ethers.getContractFactory("MNEECreditPool");
  const creditPool = await MNEECreditPool.deploy(
    mneeTokenAddress,
    treasury,
    deployer.address
  );
  await creditPool.waitForDeployment();
  const creditPoolAddress = await creditPool.getAddress();
  console.log("✅ MNEE Credit Pool deployed to:", creditPoolAddress);

  // Get EntryPoint for AgentWalletStaking
  const ENTRY_POINT_ADDRESS = deploymentInfo.contracts?.entryPoint || 
                              process.env.ENTRY_POINT_ADDRESS || 
                              "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

  console.log("\n=== Deploying Agent Wallet Staking ===");
  const AgentWalletStaking = await ethers.getContractFactory("AgentWalletStaking");
  const agentWalletStaking = await AgentWalletStaking.deploy(
    ENTRY_POINT_ADDRESS,
    creditPoolAddress,
    deployer.address
  );
  await agentWalletStaking.waitForDeployment();
  const agentWalletStakingAddress = await agentWalletStaking.getAddress();
  console.log("✅ Agent Wallet Staking deployed to:", agentWalletStakingAddress);

  // Update deployment info
  if (!deploymentInfo.contracts) {
    deploymentInfo.contracts = {};
  }
  deploymentInfo.contracts.creditPool = creditPoolAddress;
  deploymentInfo.contracts.agentWalletStaking = agentWalletStakingAddress;

  // Save deployment info
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n=== Deployment Info Saved ===");
  console.log("File:", deploymentFile);

  console.log("\n=== Deployment Summary ===");
  console.log("Credit Pool:", creditPoolAddress);
  console.log("Agent Wallet Staking:", agentWalletStakingAddress);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Fund liquidity pool (optional):");
  console.log(`   creditPool.provideLiquidity(amount)`);
  console.log("\n2. Users can now:");
  console.log(`   - Stake MNEE: creditPool.stake(amount)`);
  console.log(`   - Borrow from credit line: creditPool.borrowFromCreditLine(amount)`);
  console.log(`   - Repay: creditPool.repayCredit(amount)`);
  console.log(`   - Claim rewards: creditPool.claimRewards()`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

