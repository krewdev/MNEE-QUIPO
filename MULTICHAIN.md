# Multi-Chain Support

QuipoWallet supports deployment on multiple blockchains to maximize MNEE's reach and provide users with flexibility in choosing their preferred network.

## Supported Chains

### Mainnets
- **Ethereum** - Primary chain where MNEE is natively deployed
- **Base** - Coinbase L2, low fees, great for mass adoption
- **Polygon** - Popular sidechain, widely used for commerce
- **Arbitrum** - Leading L2, excellent ERC-4337 support

### Testnets
- **Sepolia** - Ethereum testnet
- **Base Sepolia** - Base testnet
- **Polygon Mumbai** - Polygon testnet

## Why Multi-Chain?

1. **Lower Gas Fees** - L2s like Base and Arbitrum offer significantly cheaper transactions
2. **Faster Transactions** - L2s have faster block times
3. **Broader Reach** - Different chains have different user bases
4. **Network Resilience** - Diversification across chains
5. **User Choice** - Let users choose their preferred network

## Deployment

### Deploy to Single Chain

```bash
# Base
npm run deploy:base

# Polygon
npm run deploy:polygon

# Arbitrum
npm run deploy:arbitrum

# Ethereum Mainnet
npm run deploy:ethereum
```

### Deploy to All Chains

```bash
npm run deploy:all
```

### Network Configuration

Set environment variables in `.env`:

```env
# Base
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_key

# Polygon
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGONSCAN_API_KEY=your_key

# Arbitrum
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=your_key

# Ethereum
ETHEREUM_RPC_URL=https://eth.llamarpc.com
ETHERSCAN_API_KEY=your_key
```

## MNEE Token on Different Chains

### Ethereum Mainnet
- **Official MNEE:** `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- Native deployment

### Other Chains
- MNEE may need to be bridged using cross-chain bridges
- Update `MNEE_TOKEN_ADDRESS` in deployment script for each chain
- Consider using LayerZero, Wormhole, or native bridge solutions

## Frontend Configuration

Update `frontend/.env.local` with chain-specific addresses:

```env
# Ethereum
NEXT_PUBLIC_PAYMASTER_ETHEREUM=0x...
NEXT_PUBLIC_FACTORY_ETHEREUM=0x...

# Base
NEXT_PUBLIC_MNEE_TOKEN_BASE=0x...
NEXT_PUBLIC_PAYMASTER_BASE=0x...
NEXT_PUBLIC_FACTORY_BASE=0x...

# Polygon
NEXT_PUBLIC_MNEE_TOKEN_POLYGON=0x...
NEXT_PUBLIC_PAYMASTER_POLYGON=0x...
NEXT_PUBLIC_FACTORY_POLYGON=0x...

# Arbitrum
NEXT_PUBLIC_MNEE_TOKEN_ARBITRUM=0x...
NEXT_PUBLIC_PAYMASTER_ARBITRUM=0x...
NEXT_PUBLIC_FACTORY_ARBITRUM=0x...
```

The frontend automatically detects the connected chain and uses the appropriate contract addresses.

## EntryPoint Address

ERC-4337 EntryPoint is the same across all EVM chains:
- **Address:** `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

## Gas Costs by Chain

Estimated deployment costs:

| Chain | Factory | Paymaster | Deposit | Stake | Total |
|-------|---------|-----------|---------|-------|-------|
| Ethereum | ~0.002 ETH | ~0.002 ETH | 0.1 ETH | 0.01 ETH | ~0.114 ETH |
| Base | ~$0.50 | ~$0.50 | $0.50 | $0.05 | ~$1.55 |
| Polygon | ~$0.10 | ~$0.10 | $0.10 | $0.01 | ~$0.31 |
| Arbitrum | ~$0.20 | ~$0.20 | $0.20 | $0.02 | ~$0.62 |

## Benefits for Hackathon Submission

✅ **Increased Reach** - More chains = more users  
✅ **Scalability** - L2s handle more transactions  
✅ **User Experience** - Lower fees = better UX  
✅ **Technical Depth** - Demonstrates multi-chain expertise  
✅ **Real-World Ready** - Production-ready infrastructure  

## Chain-Specific Features

### Base
- Coinbase's L2
- Excellent UX
- Growing ecosystem
- Native USDC support

### Polygon
- Established ecosystem
- Low fees
- Wide adoption
- Many DApps

### Arbitrum
- Largest L2 by TVL
- Great DeFi ecosystem
- Low fees
- Established infrastructure

## Future Enhancements

- Cross-chain bridge integration
- Unified dashboard across chains
- Chain-specific optimizations
- Cross-chain agent wallet management
- Unified gasless experience across chains

## Notes

- Each chain requires separate deployment
- Contract addresses are different per chain
- Paymaster needs funding on each chain
- Consider gas token differences (ETH vs MATIC)
- Test thoroughly on each chain before mainnet

## Support

For issues or questions about multi-chain deployment:
- Check network-specific documentation
- Verify RPC endpoints are accessible
- Ensure sufficient native tokens for deployment
- Test on testnets first


