#!/usr/bin/env node

/**
 * Simple Node.js script to convert mnemonic to private key
 * Can be run with: node scripts/mnemonic-to-key.js
 * Or: npm run mnemonic-to-key
 */

const { ethers } = require("ethers");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  console.log("🔐 Mnemonic to Private Key Converter\n");
  console.log("⚠️  SECURITY WARNING:");
  console.log("   - Never share your mnemonic or private key");
  console.log("   - This script runs locally on your machine\n");

  const mnemonic = await question("Enter your 12-word mnemonic phrase: ");

  if (!mnemonic || mnemonic.trim().split(" ").length < 12) {
    console.error("\n❌ Invalid mnemonic. Must be 12 or more words.");
    rl.close();
    process.exit(1);
  }

  try {
    // Validate mnemonic
    if (!ethers.Mnemonic.isValidMnemonic(mnemonic.trim())) {
      console.error("\n❌ Invalid mnemonic phrase. Please check and try again.");
      rl.close();
      process.exit(1);
    }

    // Derive wallet from mnemonic (first account)
    const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());

    console.log("\n✅ Successfully derived private key!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 Add this to your .env file:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`PRIVATE_KEY=${wallet.privateKey}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    console.log("📍 Wallet Address:", wallet.address);
    console.log("🔑 Private Key:", wallet.privateKey);
    console.log("\n⚠️  Keep this private key secure! Never commit it to git.\n");

    // Ask if user wants to derive a different account index
    const deriveMore = await question(
      "\nDerive another account? (Enter account index, or 'n' to exit): "
    );

    if (deriveMore.toLowerCase() !== "n" && deriveMore !== "") {
      const index = parseInt(deriveMore);
      if (!isNaN(index) && index >= 0) {
        const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic.trim());
        const derivedWallet = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
        
        console.log(`\n✅ Account #${index}:`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`PRIVATE_KEY=${derivedWallet.privateKey}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📍 Wallet Address:", derivedWallet.address);
        console.log("🔑 Private Key:", derivedWallet.privateKey);
      }
    }

    rl.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    rl.close();
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

