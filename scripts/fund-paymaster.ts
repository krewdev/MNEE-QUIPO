import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Fund Paymaster with ETH deposit and stake
 * Use this if the deployment script partially completed
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const paymasterAddress = process.env.PAYMASTER_ADDRESS;
  
  if (!paymasterAddress) {
    console.error("❌ PAYMASTER_ADDRESS not set in .env");
    console.error("Set it to your deployed paymaster address");
    process.exit(1);
  }

  console.log("Funding Paymaster:", paymasterAddress);
  console.log("Using account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const PaymasterABI = [
    "function deposit() payable",
    "function addStake(uint32 unstakeDelaySec) payable",
    "function getDeposit() view returns (uint256)",
  ];

  const paymaster = await ethers.getContractAt(PaymasterABI, paymasterAddress);

  // Check current deposit
  const currentDeposit = await paymaster.getDeposit();
  console.log("\nCurrent deposit:", ethers.formatEther(currentDeposit), "ETH");

  // Deposit if needed
  const depositAmount = ethers.parseEther("0.1");
  if (currentDeposit < depositAmount) {
    console.log("\n=== Depositing 0.1 ETH ===");
    const depositTx = await paymaster.deposit({ value: depositAmount });
    console.log("Transaction:", depositTx.hash);
    await depositTx.wait();
    console.log("✅ Deposit completed");
  } else {
    console.log("✅ Deposit already sufficient");
  }

  // Add stake
  console.log("\n=== Adding Stake ===");
  const stakeAmount = ethers.parseEther("0.01");
  const unstakeDelay = 86400;

  // Get fee data and increase by 20%
  const feeData = await ethers.provider.getFeeData();
  const gasOptions: any = {};
  
  if (feeData.maxFeePerGas) {
    gasOptions.maxFeePerGas = (feeData.maxFeePerGas * 120n) / 100n;
  }
  if (feeData.maxPriorityFeePerGas) {
    gasOptions.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n;
  } else if (feeData.gasPrice) {
    gasOptions.gasPrice = (feeData.gasPrice * 120n) / 100n;
  }

  const stakeTx = await paymaster.addStake(unstakeDelay, {
    value: stakeAmount,
    ...gasOptions,
  });
  console.log("Transaction:", stakeTx.hash);
  await stakeTx.wait();
  console.log("✅ Stake added successfully");

  console.log("\n✅ Paymaster funded!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

