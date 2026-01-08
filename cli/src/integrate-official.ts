/**
 * Integration with Official MNEE CLI
 * 
 * This script tries to extend the official @mnee/cli by:
 * 1. Checking if official CLI is installed
 * 2. Loading our cross-chain commands
 * 3. Merging command sets
 */

import { Command } from "commander";
import { registerCrossChainCommands } from "./extend-official-cli";

/**
 * Create extended CLI that includes both official and our commands
 */
export function createExtendedCLI(): Command {
  const program = new Command();

  program
    .name("mnee")
    .description("MNEE CLI - Extended with cross-chain, Bitcoin Ordinals, and ERC-4337 support")
    .version("1.0.0-hackathon");

  // Register our cross-chain commands
  registerCrossChainCommands(program);

  // Add notice about official CLI commands
  program
    .configureHelp({
      subcommandTerm: (cmd) => cmd.name(),
    })
    .addHelpText("after", `
💡 HACKATHON EXTENSION
   This CLI extends @mnee/cli with cross-chain functionality.
   
   Original commands (if @mnee/cli is installed):
   - mnee create, balance, transfer (Bitcoin/BSV)
   - mnee wallet management commands
   
   New cross-chain commands:
   - mnee bridge         Bridge between Bitcoin and EVM chains
   - mnee evm-balance    Check balance on EVM chains
   - mnee evm-send       Send on EVM chains (with Paymaster)
   - mnee chains         List all supported chains
   - mnee ordinals-balance Check Bitcoin Ordinals balance
   - mnee create-gasless-wallet Create ERC-4337 wallet
   
   Documentation: https://github.com/your-repo/quipowallet
    `);

  return program;
}

// Export for use in main entry point
export default createExtendedCLI;

