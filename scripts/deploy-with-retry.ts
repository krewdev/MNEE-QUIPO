import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deployment script with retry logic for RPC failures
 */
async function deployWithRetry(
  deployFn: () => Promise<any>,
  maxRetries: number = 3,
  initialDelayMs: number = 5000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await deployFn();
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      const isRetryable = 
        errorMsg.includes("too many requests") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("522") || // Cloudflare timeout
        errorMsg.includes("timeout") ||
        error.code === "UND_ERR_HEADERS_TIMEOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";
      
      if (isRetryable && i < maxRetries - 1) {
        // Exponential backoff: 5s, 10s, 20s
        const delayMs = initialDelayMs * Math.pow(2, i);
        console.log(`\n⚠️  RPC error (${error.code || "timeout"}). Retrying in ${delayMs/1000}s... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const ENTRY_POINT_ADDRESS = process.env.ENTRY_POINT_ADDRESS || "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  const MNEE_TOKEN_ADDRESS = process.env.MNEE_TOKEN_ADDRESS || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
  
  console.log("\n=== Using Official MNEE Token ===");
  console.log("MNEE Token Address:", MNEE_TOKEN_ADDRESS);

  console.log("\n=== Deploying Agent Wallet Factory ===");
  const entryPoint = await ethers.getContractAt(
    "@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint",
    ENTRY_POINT_ADDRESS
  );
  
  const AgentWalletFactory = await ethers.getContractFactory("AgentWalletFactory");
  const factory = await deployWithRetry(async () => {
    const f = await AgentWalletFactory.deploy(ENTRY_POINT_ADDRESS, deployer.address);
    await f.waitForDeployment();
    return f;
  });
  
  const factoryAddress = await factory.getAddress();
  console.log("Agent Wallet Factory deployed to:", factoryAddress);

  console.log("\n=== Deploying MNEE Paymaster ===");
  const treasury = deployer.address;
  const mneeRate = ethers.parseEther("1");
  
  const mneeToken = await ethers.getContractAt("IERC20", MNEE_TOKEN_ADDRESS);
  
  const MNEEPaymaster = await ethers.getContractFactory("MNEEPaymaster");
  const paymaster = await deployWithRetry(async () => {
    const p = await MNEEPaymaster.deploy(
      ENTRY_POINT_ADDRESS,
      MNEE_TOKEN_ADDRESS,
      deployer.address,
      treasury,
      mneeRate
    );
    await p.waitForDeployment();
    return p;
  });
  
  const paymasterAddress = await paymaster.getAddress();
  console.log("MNEE Paymaster deployed to:", paymasterAddress);

  console.log("\n=== Funding Paymaster ===");
  const depositAmount = ethers.parseEther("0.1");
  await deployWithRetry(async () => {
    const tx = await paymaster.deposit({ value: depositAmount });
    await tx.wait();
  });
  console.log(`Deposited ${ethers.formatEther(depositAmount)} ETH to Paymaster`);

  const stakeAmount = ethers.parseEther("0.01");
  const unstakeDelay = 86400;
  await deployWithRetry(async () => {
    const tx = await paymaster.addStake(unstakeDelay, { value: stakeAmount });
    await tx.wait();
  });
  console.log(`Added ${ethers.formatEther(stakeAmount)} ETH stake`);

  console.log("\n=== Deployment Summary ===");
  console.log("MNEE Token:", MNEE_TOKEN_ADDRESS);
  console.log("Agent Wallet Factory:", factoryAddress);
  console.log("MNEE Paymaster:", paymasterAddress);
  console.log("Entry Point:", ENTRY_POINT_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

