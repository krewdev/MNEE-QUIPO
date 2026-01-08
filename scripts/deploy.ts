import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get EntryPoint address (ERC-4337 standard entry point)
  // For Sepolia: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
  const ENTRY_POINT_ADDRESS = process.env.ENTRY_POINT_ADDRESS || "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  
  // Use official MNEE stablecoin contract
  // Mainnet: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
  // For Sepolia, use testnet address or deploy mock if needed
  const MNEE_TOKEN_ADDRESS = process.env.MNEE_TOKEN_ADDRESS || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
  
  console.log("\n=== Using Official MNEE Token ===");
  console.log("MNEE Token Address:", MNEE_TOKEN_ADDRESS);
  console.log("Note: Using existing MNEE stablecoin contract (not deploying new token)");

  console.log("\n=== Deploying Agent Wallet Factory ===");
  // Use the IEntryPoint from @account-abstraction package (fully qualified name)
  const entryPoint = await ethers.getContractAt(
    "@account-abstraction/contracts/interfaces/IEntryPoint.sol:IEntryPoint",
    ENTRY_POINT_ADDRESS
  );
  const AgentWalletFactory = await ethers.getContractFactory("AgentWalletFactory");
  const factory = await AgentWalletFactory.deploy(ENTRY_POINT_ADDRESS, deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Agent Wallet Factory deployed to:", factoryAddress);

  console.log("\n=== Deploying MNEE Paymaster ===");
  const treasury = deployer.address; // In production, use a separate treasury address
  const mneeRate = ethers.parseEther("1"); // 1 MNEE = 1 ETH worth of gas (adjust as needed)
  
  // Get MNEE token contract instance for interface
  // Use the IERC20 from OpenZeppelin (fully qualified name)
  const mneeToken = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    MNEE_TOKEN_ADDRESS
  );
  
  const MNEEPaymaster = await ethers.getContractFactory("MNEEPaymaster");
  const paymaster = await MNEEPaymaster.deploy(
    ENTRY_POINT_ADDRESS,
    MNEE_TOKEN_ADDRESS,
    deployer.address,
    treasury,
    mneeRate
  );
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log("MNEE Paymaster deployed to:", paymasterAddress);

  // Deposit ETH to paymaster for EntryPoint operations
  console.log("\n=== Funding Paymaster ===");
  const currentBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Current balance: ${ethers.formatEther(currentBalance)} ETH`);
  
  // Calculate available amount (leave 0.01 ETH for gas)
  const gasReserve = ethers.parseEther("0.01");
  const availableForDeposit = currentBalance - gasReserve - ethers.parseEther("0.01"); // Reserve for stake too
  
  // Use smaller deposit if balance is low (minimum 0.01 ETH, ideal 0.1 ETH)
  let depositAmount = ethers.parseEther("0.1");
  if (availableForDeposit < depositAmount) {
    depositAmount = availableForDeposit > ethers.parseEther("0.01") 
      ? availableForDeposit 
      : ethers.parseEther("0.01");
    console.log(`⚠️  Low balance detected. Using ${ethers.formatEther(depositAmount)} ETH deposit (minimum viable)`);
  }
  
  if (depositAmount < ethers.parseEther("0.01")) {
    console.error(`\n❌ Insufficient funds!`);
    console.error(`   Need at least 0.02 ETH (0.01 deposit + 0.01 gas)`);
    console.error(`   Current balance: ${ethers.formatEther(currentBalance)} ETH`);
    console.error(`\n💧 Request more Sepolia ETH from faucets:`);
    console.error(`   https://www.alchemy.com/faucets/ethereum-sepolia`);
    process.exit(1);
  }
  
  const depositTx = await paymaster.deposit({ value: depositAmount });
  console.log(`Deposit transaction sent: ${depositTx.hash}`);
  await depositTx.wait(); // Wait for confirmation
  console.log(`✅ Deposited ${ethers.formatEther(depositAmount)} ETH to Paymaster`);

  // Add stake (required for paymaster to work)
  const stakeAmount = ethers.parseEther("0.01"); // 0.01 ETH stake
  const unstakeDelay = 86400; // 1 day
  
  // Get current gas price and increase by 20% to avoid replacement transaction errors
  const feeData = await ethers.provider.getFeeData();
  const gasOptions: any = {};
  
  if (feeData.maxFeePerGas) {
    gasOptions.maxFeePerGas = (feeData.maxFeePerGas * 120n) / 100n; // +20%
  }
  if (feeData.maxPriorityFeePerGas) {
    gasOptions.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n; // +20%
  } else if (feeData.gasPrice) {
    gasOptions.gasPrice = (feeData.gasPrice * 120n) / 100n; // +20%
  }
  
  console.log("Sending stake transaction with increased gas price...");
  const stakeTx = await paymaster.addStake(unstakeDelay, { 
    value: stakeAmount,
    ...gasOptions
  });
  console.log(`Stake transaction sent: ${stakeTx.hash}`);
  await stakeTx.wait(); // Wait for confirmation
  console.log(`✅ Added ${ethers.formatEther(stakeAmount)} ETH stake with ${unstakeDelay}s delay`);

  console.log("\n=== Deploying MNEETokenUTXO ===");
  const MNEETokenUTXO = await ethers.getContractFactory("MNEETokenUTXO");
  const utxoToken = await MNEETokenUTXO.deploy(deployer.address);
  await utxoToken.waitForDeployment();
  const utxoTokenAddress = await utxoToken.getAddress();
  console.log("MNEETokenUTXO deployed to:", utxoTokenAddress);
  console.log("Note: Initial supply minted to deployer:", deployer.address);

  console.log("\n=== Deploying BridgeMNEE ===");
  const BridgeMNEE = await ethers.getContractFactory("BridgeMNEE");
  const bridge = await BridgeMNEE.deploy(
    deployer.address,      // owner
    utxoTokenAddress,      // MNEETokenUTXO address
    MNEE_TOKEN_ADDRESS     // ERC20 MNEE token address
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("BridgeMNEE deployed to:", bridgeAddress);

  // Grant bridge contract permission to mint UTXOs (for Bitcoin → EVM bridging)
  console.log("\n=== Configuring Bridge Permissions ===");
  // Transfer ownership of MNEETokenUTXO to bridge so it can mint when claiming Bitcoin deposits
  console.log("Transferring MNEETokenUTXO ownership to bridge...");
  const transferOwnershipTx = await utxoToken.transferOwnership(bridgeAddress);
  await transferOwnershipTx.wait();
  console.log("✅ MNEETokenUTXO ownership transferred to bridge");
  console.log("   Bridge can now mint UTXOs when users claim Bitcoin deposits");

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("MNEE Token (Official ERC20):", MNEE_TOKEN_ADDRESS);
  console.log("MNEETokenUTXO:", utxoTokenAddress);
  console.log("Agent Wallet Factory:", factoryAddress);
  console.log("MNEE Paymaster:", paymasterAddress);
  console.log("BridgeMNEE:", bridgeAddress);
  console.log("Entry Point:", ENTRY_POINT_ADDRESS);
  console.log("Treasury:", treasury);
  console.log("MNEE Rate:", ethers.formatEther(mneeRate), "ETH worth per 1 MNEE");

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      mneeToken: MNEE_TOKEN_ADDRESS,
      utxoToken: utxoTokenAddress,
      factory: factoryAddress,
      paymaster: paymasterAddress,
      bridge: bridgeAddress,
      entryPoint: ENTRY_POINT_ADDRESS,
    },
    treasury,
    mneeRate: ethers.formatEther(mneeRate),
    hackathon: {
      track: "AI & Agent Payments",
      mneeContract: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info (JSON) ===");
  const deploymentJson = JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2);
  console.log(deploymentJson);

  // Save to file
  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFile = networkName === "sepolia" 
    ? path.join(__dirname, "..", "DEPLOYMENT_SEPOLIA.json")
    : path.join(__dirname, "..", `DEPLOYMENT_${networkName.toUpperCase()}.json`);
  
  fs.writeFileSync(deploymentFile, deploymentJson);
  console.log(`\n✅ Deployment info saved to: ${deploymentFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

