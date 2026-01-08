import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Test Paymaster functionality
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Try to load from deployment file first (most recent deployment)
  let PAYMASTER_ADDRESS: string | undefined;
  let MNEE_TOKEN_ADDRESS: string | undefined;
  
  // Try to read from deployment file first
  const deploymentFile = path.join(__dirname, "..", "DEPLOYMENT_SEPOLIA.json");
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
    PAYMASTER_ADDRESS = deployment.contracts?.paymaster;
    MNEE_TOKEN_ADDRESS = deployment.contracts?.mneeToken;
    if (PAYMASTER_ADDRESS || MNEE_TOKEN_ADDRESS) {
      console.log("📋 Loaded addresses from deployment file");
    }
  }
  
  // Fall back to environment variables if deployment file doesn't have them
  PAYMASTER_ADDRESS = PAYMASTER_ADDRESS || process.env.PAYMASTER_ADDRESS;
  MNEE_TOKEN_ADDRESS = MNEE_TOKEN_ADDRESS || process.env.MNEE_TOKEN_ADDRESS;
  
  if (!PAYMASTER_ADDRESS) {
    PAYMASTER_ADDRESS = "0x219fA137f376a70F3ac5aA2C3161672D4270e8f6"; // Latest Sepolia deployment
    console.log("⚠️  Using default paymaster address:", PAYMASTER_ADDRESS);
  }
  
  if (!MNEE_TOKEN_ADDRESS) {
    MNEE_TOKEN_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"; // Official MNEE
    console.log("⚠️  Using default MNEE token address:", MNEE_TOKEN_ADDRESS);
  }
  
  console.log("Paymaster address:", PAYMASTER_ADDRESS);
  console.log("MNEE Token address:", MNEE_TOKEN_ADDRESS);

  const PaymasterABI = [
    "function totalGasSponsored() view returns (uint256)",
    "function totalMNEEcollected() view returns (uint256)",
    "function mneeRate() view returns (uint256)",
    "function calculateRequiredMNEE(uint256 gasCost) view returns (uint256)",
    "function getDeposit() view returns (uint256)",
  ];

  const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
  ];

  const paymaster = await ethers.getContractAt(PaymasterABI, PAYMASTER_ADDRESS);
  
  // Try to get MNEE token contract with error handling
  let mneeToken: any = null;
  console.log("\n=== Checking MNEE Token ===");
  console.log("Token Address:", MNEE_TOKEN_ADDRESS);
  
  try {
    const code = await ethers.provider.getCode(MNEE_TOKEN_ADDRESS);
    if (code === "0x" || code.length < 100) {
      console.log("WARNING: No contract code found at this address");
      console.log("The token might not be deployed on Sepolia");
    } else {
      console.log("Contract exists, code length:", code.length, "bytes");
      mneeToken = await ethers.getContractAt(ERC20ABI, MNEE_TOKEN_ADDRESS);
    }
  } catch (error: any) {
    console.log("Could not connect to MNEE token");
    console.log("Error:", error.message);
  }
  
  if (!mneeToken) {
    console.log("\nTip: Check if MNEE is on Sepolia:");
    console.log("https://sepolia.etherscan.io/address/" + MNEE_TOKEN_ADDRESS);
    console.log("\nIf it's not on Sepolia, you may need to deploy a test token.\n");
  }

  console.log("\n=== Paymaster State ===");
  
  // Check if paymaster contract exists
  const paymasterCode = await ethers.provider.getCode(PAYMASTER_ADDRESS);
  if (paymasterCode === "0x" || paymasterCode.length < 100) {
    console.error("❌ ERROR: No contract code found at paymaster address!");
    console.error("   The paymaster might not be deployed on this network.");
    console.error("   Address:", PAYMASTER_ADDRESS);
    console.error("\n💡 Make sure you're connected to the correct network (Sepolia)");
    console.error("   and that the contract was deployed.");
    process.exit(1);
  }
  
  let deposit;
  try {
    deposit = await paymaster.getDeposit();
    console.log("EntryPoint Deposit:", ethers.formatEther(deposit), "ETH");
  } catch (error: any) {
    console.error("❌ Error reading paymaster deposit:", error.message);
    console.error("   The paymaster contract might not be properly deployed.");
    process.exit(1);
  }

  const totalGasSponsored = await paymaster.totalGasSponsored();
  const totalMNEEcollected = await paymaster.totalMNEEcollected();
  console.log("Total Gas Sponsored:", ethers.formatEther(totalGasSponsored), "ETH");
  console.log("Total MNEE Collected:", ethers.formatEther(totalMNEEcollected), "MNEE");

  const mneeRate = await paymaster.mneeRate();
  console.log("MNEE Rate:", ethers.formatEther(mneeRate), "ETH per MNEE");

  console.log("\n=== Testing Calculations ===");
  const testGasCost = ethers.parseEther("0.01");
  const requiredMNEE = await paymaster.calculateRequiredMNEE(testGasCost);
  console.log("For", ethers.formatEther(testGasCost), "ETH gas:");
  console.log("Required MNEE:", ethers.formatEther(requiredMNEE), "MNEE");

  // Check user's MNEE balance
  if (mneeToken) {
    console.log("\n=== User MNEE Status ===");
    try {
      let tokenName: string = "";
      let tokenSymbol: string = "";
      let decimals: number = 18;
      
      try {
        tokenName = await mneeToken.name();
        tokenSymbol = await mneeToken.symbol();
        decimals = await mneeToken.decimals();
        console.log("Token:", tokenName, "(" + tokenSymbol + ")");
      } catch {
        // Continue if name/symbol calls fail
      }

      const userBalance = await mneeToken.balanceOf(deployer.address);
      let balanceFormatted: string;
      if (decimals !== 18) {
        balanceFormatted = (Number(userBalance) / Math.pow(10, decimals)).toFixed(6);
      } else {
        balanceFormatted = ethers.formatEther(userBalance);
      }
      console.log("Your MNEE Balance:", balanceFormatted, tokenSymbol || "MNEE");

      const allowance = await mneeToken.allowance(deployer.address, PAYMASTER_ADDRESS);
      let allowanceFormatted: string;
      if (decimals !== 18) {
        allowanceFormatted = (Number(allowance) / Math.pow(10, decimals)).toFixed(6);
      } else {
        allowanceFormatted = ethers.formatEther(allowance);
      }
      console.log("Paymaster Allowance:", allowanceFormatted, tokenSymbol || "MNEE");

      if (allowance === 0n) {
        console.log("\nWARNING: No allowance set. To approve:");
        console.log("Call mneeToken.approve(\"" + PAYMASTER_ADDRESS + "\", amount)");
      }
    } catch (error: any) {
      console.log("Could not read MNEE token balance.");
      console.log("Error:", error.message);
      console.log("The token might not implement standard ERC20 interface.");
    }
  }

  console.log("\nPaymaster test completed!");
  console.log("\nNext Steps:");
  console.log("1. Get MNEE tokens (if needed)");
  console.log("2. Approve Paymaster to spend MNEE");
  console.log("3. Send transaction using Paymaster");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
