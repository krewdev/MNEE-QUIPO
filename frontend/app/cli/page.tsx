"use client";

import Link from "next/link";
import { useState } from "react";

export default function CLIPage() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = [
    {
      category: "🌐 Chain Commands",
      description: "List all supported chains",
      command: "./mnee-x chains",
      example: "./mnee-x chains",
    },
    {
      category: "💰 Balance Commands",
      description: "Check MNEE balance on any chain",
      command: "./mnee-x balance --chain <chain> [--address <address>]",
      examples: [
        "./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5",
        "./mnee-x balance --chain sepolia",
        "./mnee-x balance --chain sepolia --address 0x...",
      ],
    },
    {
      category: "📤 Send Commands",
      description: "Send MNEE tokens to any chain",
      command: "./mnee-x send --from-chain <chain> --chain <chain> --to <address> --amount <amount>",
      examples: [
        "./mnee-x send --from-chain sepolia --chain sepolia --to 0x... --amount 100",
        "./mnee-x send --from-chain bitcoin --chain bitcoin --to bc1... --amount 1",
      ],
    },
    {
      category: "🌉 Bridge Commands",
      description: "Bridge MNEE tokens between Bitcoin and EVM chains",
      command: "./mnee-x bridge --from <chain> --to-chain <chain> --amount <amount> --to <address>",
      examples: [
        "./mnee-x bridge --from btc --to-chain sepolia --amount 1 --to 0x...",
        "./mnee-x bridge --from-chain sepolia --to-chain btc --amount 1 --to bc1...",
      ],
    },
    {
      category: "👛 Wallet Commands",
      description: "Create a gasless agent wallet using ERC-4337",
      command: "./mnee-x create-wallet [--chain <chain>] [--salt <salt>]",
      examples: [
        "./mnee-x create-wallet --chain sepolia",
        "./mnee-x create-wallet --chain sepolia --salt 123",
      ],
    },
    {
      category: "💎 Credit Pool Commands",
      description: "Stake, borrow, and manage credit lines",
      commands: [
        {
          name: "Stake MNEE",
          command: "./mnee-x stake --chain <chain> --amount <amount>",
          example: "./mnee-x stake --chain sepolia --amount 1000",
        },
        {
          name: "Borrow from Credit Line",
          command: "./mnee-x borrow --chain <chain> --amount <amount>",
          example: "./mnee-x borrow --chain sepolia --amount 500",
        },
        {
          name: "Check Credit Info",
          command: "./mnee-x credit-info --chain <chain> [--address <address>]",
          example: "./mnee-x credit-info --chain sepolia",
        },
        {
          name: "Repay Borrowed MNEE",
          command: "./mnee-x repay --chain <chain> --amount <amount>",
          example: "./mnee-x repay --chain sepolia --amount 550",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🛠️ QuipoWallet CLI Commands
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Terminal-style command reference for QuipoWallet CLI tools
          </p>
          <div className="bg-blue-900/30 backdrop-blur-sm rounded-lg p-4 border border-blue-500/50 mb-6">
            <p className="text-sm text-gray-300 mb-2">
              <strong className="text-blue-400">💡 Integration:</strong> QuipoWallet CLI extends the official MNEE CLI with cross-chain functionality, ERC-4337 support, and Bitcoin ↔ EVM bridging.
            </p>
            <p className="text-sm text-gray-400">
              All commands are backward compatible with the official <code className="bg-gray-800 px-2 py-1 rounded">@mnee/cli</code> package.
            </p>
          </div>
        </div>

        {/* Repository Link */}
        <div className="mb-8 bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-lg p-6 border border-green-500/50">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🔗</span> Repository & Documentation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/your-repo/quipowallet"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all cursor-pointer group"
            >
              <h3 className="font-bold text-green-300 mb-2 flex items-center gap-2">
                <span>📦</span> GitHub Repository
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </h3>
              <p className="text-sm text-gray-300 mb-2">View source code, contracts, and full documentation</p>
              <code className="text-xs text-gray-400 break-all">https://github.com/your-repo/quipowallet</code>
            </a>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-green-300 mb-2">📚 Documentation Files</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">CLI_COMMANDS.md</code> - Complete command reference</li>
                <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">HACKATHON_INTEGRATION.md</code> - Integration guide</li>
                <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">MNEE_SDK_INTEGRATION.md</code> - SDK usage</li>
                <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">cli/README.md</code> - Installation & setup</li>
              </ul>
            </div>
          </div>
        </div>

        {/* MNEE CLI Integration */}
        <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-lg p-6 border border-purple-500/50">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🔗</span> Integration with Official MNEE CLI
          </h2>
          <div className="bg-white/10 rounded-lg p-4 border border-white/20 mb-4">
            <p className="text-sm text-gray-300 mb-4">
              QuipoWallet CLI extends the official <code className="bg-gray-800 px-2 py-1 rounded">@mnee/cli</code> (v1.0.3) package. All original commands remain functional while adding new cross-chain capabilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-purple-300 mb-2">✅ Original Commands (Still Work)</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee create</code> - Create Bitcoin wallet</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee balance</code> - Check Bitcoin balance</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee transfer</code> - Transfer on Bitcoin</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee list</code> - List wallets</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-pink-300 mb-2">🆕 New Hackathon Commands</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee bridge</code> - Cross-chain bridging</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee evm-balance</code> - EVM chain balance</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee evm-send</code> - Send on EVM chains</li>
                  <li>• <code className="bg-gray-800 px-2 py-1 rounded text-xs">mnee create-gasless-wallet</code> - ERC-4337 wallet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Commands Display */}
        <div className="space-y-6">
          {commands.map((cmd, idx) => (
            <div key={idx} className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-gray-700/50 p-4 border-b border-gray-600">
                <h3 className="text-xl font-bold text-blue-400">{cmd.category}</h3>
                <p className="text-sm text-gray-400 mt-1">{cmd.description}</p>
              </div>
              
              <div className="p-6 font-mono text-sm">
                {/* Main Command */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400">$</span>
                    <button
                      onClick={() => copyToClipboard(cmd.command || cmd.commands?.[0]?.command || '')}
                      className="text-xs text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700"
                    >
                      {copiedCommand === (cmd.command || cmd.commands?.[0]?.command) ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-black/50 rounded p-4 border border-gray-600">
                    <code className="text-gray-300">
                      {cmd.command || (cmd.commands && cmd.commands[0]?.command)}
                    </code>
                  </div>
                </div>

                {/* Examples */}
                {(cmd.examples || (cmd.commands && cmd.commands.length > 0)) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">Examples:</h4>
                    {cmd.commands ? (
                      cmd.commands.map((subCmd, subIdx) => (
                        <div key={subIdx} className="space-y-2">
                          <div className="text-xs text-gray-400">{subCmd.name}:</div>
                          <div className="flex items-center justify-between">
                            <div className="bg-black/50 rounded p-3 border border-gray-600 flex-1 mr-2">
                              <code className="text-gray-300">{subCmd.example}</code>
                            </div>
                            <button
                              onClick={() => copyToClipboard(subCmd.example)}
                              className="text-xs text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 whitespace-nowrap"
                            >
                              {copiedCommand === subCmd.example ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      cmd.examples?.map((example, exIdx) => (
                        <div key={exIdx} className="flex items-center justify-between">
                          <div className="bg-black/50 rounded p-3 border border-gray-600 flex-1 mr-2">
                            <code className="text-gray-300">{example}</code>
                          </div>
                          <button
                            onClick={() => copyToClipboard(example)}
                            className="text-xs text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-700 whitespace-nowrap"
                          >
                            {copiedCommand === example ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Common Workflows */}
        <div className="mt-8 bg-gradient-to-r from-orange-900/30 to-red-900/30 backdrop-blur-sm rounded-lg p-6 border border-orange-500/50">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🎯</span> Common Workflows
          </h2>
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold text-orange-300 mb-2">1. Check Balance on Multiple Chains</h3>
              <div className="font-mono text-sm bg-black/50 rounded p-3 border border-gray-600">
                <code className="text-gray-300">./mnee-x balance --chain bitcoin --address 1Hx6egm...</code>
                <br />
                <code className="text-gray-300">./mnee-x balance --chain sepolia</code>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold text-orange-300 mb-2">2. Create Wallet and Stake</h3>
              <div className="font-mono text-sm bg-black/50 rounded p-3 border border-gray-600">
                <code className="text-gray-300">./mnee-x create-wallet --chain sepolia</code>
                <br />
                <code className="text-gray-300">./mnee-x stake --chain sepolia --amount 1000</code>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold text-orange-300 mb-2">3. Bridge from Bitcoin to Sepolia</h3>
              <div className="font-mono text-sm bg-black/50 rounded p-3 border border-gray-600">
                <code className="text-gray-300">./mnee-x bridge --from btc --to-chain sepolia --amount 1 --to 0xYourAddress</code>
              </div>
            </div>
          </div>
        </div>

        {/* Installation */}
        <div className="mt-8 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 backdrop-blur-sm rounded-lg p-6 border border-teal-500/50">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>📦</span> Installation & Setup
          </h2>
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="font-mono text-sm space-y-3">
              <div>
                <div className="text-green-400 mb-1">$ cd cli</div>
                <div className="text-gray-300">cd cli</div>
              </div>
              <div>
                <div className="text-green-400 mb-1">$ npm install</div>
                <div className="text-gray-300">npm install</div>
              </div>
              <div>
                <div className="text-green-400 mb-1">$ npm run build</div>
                <div className="text-gray-300">npm run build</div>
              </div>
              <div className="pt-3 border-t border-gray-600">
                <div className="text-yellow-400 mb-2"># Or install globally:</div>
                <div className="text-green-400 mb-1">$ npm install -g .</div>
                <div className="text-gray-300">npm install -g .</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            <strong>Note:</strong> Requires Node.js 18+, private key in <code className="bg-gray-800 px-2 py-1 rounded text-xs">.env</code> file, and RPC endpoints configured.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>All commands are interactive and will guide you through the process! 🚀</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

