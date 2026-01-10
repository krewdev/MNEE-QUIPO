import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying test MNEE token on Sepolia");
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  console.log("\n=== Deploying Test MNEE Token ===");
  const MNEEToken = await ethers.getContractFactory("MNEEToken");
  const mneeToken = await MNEEToken.deploy(deployer.address);
  await mneeToken.waitForDeployment();
  const mneeTokenAddress = await mneeToken.getAddress();
  console.log("✅ Test MNEE Token deployed to:", mneeTokenAddress);

  // Update deployment file
  const deploymentFile = path.join(__dirname, "..", "DEPLOYMENT_SEPOLIA.json");
  let deploymentInfo: any = {};
  
  if (fs.existsSync(deploymentFile)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  }

  if (!deploymentInfo.contracts) {
    deploymentInfo.contracts = {};
  }
  
  deploymentInfo.contracts.mneeToken = mneeTokenAddress;
  
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment info saved to:", deploymentFile);
  
  console.log("\n⚠️  IMPORTANT: The credit pool is using the old token address.");
  console.log("    You need to redeploy the credit pool with the new token address:");
  console.log(`    npm run deploy:credit-pool:sepolia`);
  console.log("\n    Or update the credit pool manually if it supports token migration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


