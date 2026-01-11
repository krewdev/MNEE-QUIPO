import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const CONTRACT_NAME = process.argv[2] || "MNEEPaymaster";
const OUTPUT_DIR = path.join(__dirname, "..", "flattened");

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const contractPath = `contracts/${CONTRACT_NAME}.sol`;
const outputPath = path.join(OUTPUT_DIR, `${CONTRACT_NAME}_flattened.sol`);

console.log(`Flattening ${contractPath}...`);

try {
  const flattened = execSync(`npx hardhat flatten ${contractPath}`, {
    encoding: "utf-8",
    cwd: path.join(__dirname, ".."),
  });

  // Write to file
  fs.writeFileSync(outputPath, flattened, "utf-8");

  console.log(`✅ Successfully flattened contract to: ${outputPath}`);
  console.log(`\nYou can now use this file for Etherscan verification or Remix compilation.`);
} catch (error: any) {
  console.error(`❌ Error flattening contract: ${error.message}`);
  process.exit(1);
}

