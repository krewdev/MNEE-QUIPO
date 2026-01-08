import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { NETWORKS } from "../config/networks";

dotenv.config();

async function main() {
  // Get network name from hardhat network config
  const hardhatNetwork = await ethers.provider.getNetwork();
  const chainId = Number(hardhatNetwork.chainId);
  
  // Find network by chain ID
  let networkName = process.env.NETWORK;
  let network = networkName ? NETWORKS[networkName] : undefined;
  
  if (!network) {
    // Try to find by chain ID
    network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (network) {
      networkName = Object.keys(NETWORKS).find(key => NETWORKS[key] === network);
    }
  }

  if (!network) {
    console.error(`Unknown network. Chain ID: ${chainId}`);
    console.error(`Available networks: ${Object.keys(NETWORKS).join(", ")}`);
    console.error(`Please set NETWORK environment variable or use a configured network`);
    process.exit(1);
  }

  console.log(`\n🌐 Deploying to ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Network key: ${networkName}`);
  
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("\n❌ No signers available!");
    console.error("Please configure PRIVATE_KEY in .env file:");
    console.error("  PRIVATE_KEY=your_private_key_here");
    process.exit(1);
  }
  
  const [deployer] = signers;
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Use network-specific EntryPoint
  const ENTRY_POINT_ADDRESS = network.entryPoint;
  
  // Use official MNEE token (Ethereum mainnet) or configured address for other chains
  // Note: MNEE may need to be bridged to other chains
  const MNEE_TOKEN_ADDRESS = network.mneeToken || process.env.MNEE_TOKEN_ADDRESS || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
  
  console.log("\n=== Network Configuration ===");
  console.log("EntryPoint:", ENTRY_POINT_ADDRESS);
  console.log("MNEE Token:", MNEE_TOKEN_ADDRESS);
  if (!network.mneeToken && networkName !== "ethereum" && networkName !== "sepolia") {
    console.log("⚠️  Warning: MNEE token may need to be bridged to this chain");
  }

  console.log("\n=== Deploying Agent Wallet Factory ===");
  // Use the IEntryPoint from @account-abstraction package
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
  
  const mneeToken = await ethers.getContractAt("IERC20", MNEE_TOKEN_ADDRESS);
  
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

  // Deposit native currency to paymaster for EntryPoint operations
  console.log("\n=== Funding Paymaster ===");
  const depositAmount = ethers.parseEther("0.1");
  await paymaster.deposit({ value: depositAmount });
  console.log(`Deposited ${ethers.formatEther(depositAmount)} ${network.nativeCurrency.symbol} to Paymaster`);

  // Add stake (required for paymaster to work)
  const stakeAmount = ethers.parseEther("0.01");
  const unstakeDelay = 86400; // 1 day
  await paymaster.addStake(unstakeDelay, { value: stakeAmount });
  console.log(`Added ${ethers.formatEther(stakeAmount)} ${network.nativeCurrency.symbol} stake with ${unstakeDelay}s delay`);

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("MNEE Token:", MNEE_TOKEN_ADDRESS);
  console.log("Agent Wallet Factory:", factoryAddress);
  console.log("MNEE Paymaster:", paymasterAddress);
  console.log("Entry Point:", ENTRY_POINT_ADDRESS);
  console.log("Treasury:", treasury);
  console.log("MNEE Rate:", ethers.formatEther(mneeRate), "ETH worth per 1 MNEE");
  console.log("Block Explorer:", network.explorer);

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      mneeToken: MNEE_TOKEN_ADDRESS,
      factory: factoryAddress,
      paymaster: paymasterAddress,
      entryPoint: ENTRY_POINT_ADDRESS,
    },
    treasury,
    mneeRate: ethers.formatEther(mneeRate),
    explorer: network.explorer,
    hackathon: {
      track: "AI & Agent Payments",
      mneeContract: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info (JSON) ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Deployment complete!");
  console.log(`\n📝 Next steps:`);
  console.log(`1. Verify contracts: npm run verify --network ${networkName}`);
  console.log(`2. Update frontend .env.local with contract addresses`);
  console.log(`3. Test the deployment`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


