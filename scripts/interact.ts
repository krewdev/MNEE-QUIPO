import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Contract addresses (update after deployment)
const CONTRACTS = {
  MNEE_TOKEN: process.env.MNEE_TOKEN_ADDRESS || "",
  PAYMASTER: process.env.PAYMASTER_ADDRESS || "",
  FACTORY: process.env.FACTORY_ADDRESS || "",
};

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Interacting with contracts using:", signer.address);

  if (!CONTRACTS.MNEE_TOKEN || !CONTRACTS.PAYMASTER || !CONTRACTS.FACTORY) {
    console.error("Please set contract addresses in .env file");
    process.exit(1);
  }

  // Get contract instances
  const MNEEToken = await ethers.getContractAt("MNEEToken", CONTRACTS.MNEE_TOKEN);
  const Paymaster = await ethers.getContractAt("MNEEPaymaster", CONTRACTS.PAYMASTER);
  const Factory = await ethers.getContractAt("AgentWalletFactory", CONTRACTS.FACTORY);

  // Example interactions
  console.log("\n=== Contract Information ===\n");

  // MNEE Token info
  const balance = await MNEEToken.balanceOf(signer.address);
  console.log(`Your MNEE Balance: ${ethers.formatEther(balance)} MNEE`);

  const totalSupply = await MNEEToken.totalSupply();
  console.log(`Total MNEE Supply: ${ethers.formatEther(totalSupply)} MNEE`);

  // Paymaster info
  const rate = await Paymaster.mneeRate();
  console.log(`Paymaster Rate: ${ethers.formatEther(rate)} ETH per 1 MNEE`);

  const totalGas = await Paymaster.totalGasSponsored();
  console.log(`Total Gas Sponsored: ${ethers.formatEther(totalGas)} ETH`);

  const totalMNEE = await Paymaster.totalMNEEcollected();
  console.log(`Total MNEE Collected: ${ethers.formatEther(totalMNEE)} MNEE`);

  // Factory info
  const totalWallets = await Factory.totalWallets();
  console.log(`Total Wallets Created: ${totalWallets}`);

  const userWallet = await Factory.getWallet(signer.address);
  if (userWallet !== ethers.ZeroAddress) {
    console.log(`Your Wallet: ${userWallet}`);
  } else {
    console.log(`Your Wallet: Not created yet`);
  }

  // Example: Calculate required MNEE for gas
  const exampleGasCost = ethers.parseEther("0.01"); // 0.01 ETH
  const requiredMNEE = await Paymaster.calculateRequiredMNEE(exampleGasCost);
  console.log(`\nFor ${ethers.formatEther(exampleGasCost)} ETH gas, you need: ${ethers.formatEther(requiredMNEE)} MNEE`);

  // Example: Check allowance
  const allowance = await MNEEToken.allowance(signer.address, CONTRACTS.PAYMASTER);
  console.log(`Current Paymaster Allowance: ${ethers.formatEther(allowance)} MNEE`);

  console.log("\n=== Interaction Complete ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

