import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const creditPoolAddress = "0x582a1C2C9596E0D15E8FE609b7D5E39aB0c214C6";
  
  console.log("Testing Credit Pool:", creditPoolAddress);
  
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  
  const creditPool = await ethers.getContractAt("MNEECreditPool", creditPoolAddress);
  
  // Check pool status
  console.log("\n=== Pool Status ===");
  const mneeToken = await creditPool.mneeToken();
  console.log("MNEE Token:", mneeToken);
  
  const isPaused = await creditPool.paused();
  console.log("Is Paused:", isPaused);
  
  const minStake = await creditPool.MIN_STAKE();
  console.log("Min Stake:", ethers.formatEther(minStake), "MNEE");
  
  const totalStaked = await creditPool.totalStaked();
  console.log("Total Staked:", ethers.formatEther(totalStaked), "MNEE");
  
  const totalLiquidity = await creditPool.totalLiquidity();
  console.log("Total Liquidity:", ethers.formatEther(totalLiquidity), "MNEE");
  
  // Check user status
  console.log("\n=== User Status ===");
  const userInfo = await creditPool.getUserInfo(deployer.address);
  console.log("Staked:", ethers.formatEther(userInfo[0]), "MNEE");
  console.log("Credit Line:", ethers.formatEther(userInfo[1]), "MNEE");
  console.log("Borrowed:", ethers.formatEther(userInfo[2]), "MNEE");
  console.log("Available Credit:", ethers.formatEther(userInfo[3]), "MNEE");
  console.log("Rewards:", ethers.formatEther(userInfo[4]), "MNEE");
  console.log("Interest Owed:", ethers.formatEther(userInfo[5]), "MNEE");
  console.log("Is Active:", userInfo[6]);
  
  // Check MNEE balance
  const mneeContract = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", mneeToken);
  const balance = await mneeContract.balanceOf(deployer.address);
  console.log("\n=== MNEE Balance ===");
  console.log("Balance:", ethers.formatEther(balance), "MNEE");
  
  // Check allowance
  const allowance = await mneeContract.allowance(deployer.address, creditPoolAddress);
  console.log("Allowance:", ethers.formatEther(allowance), "MNEE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

