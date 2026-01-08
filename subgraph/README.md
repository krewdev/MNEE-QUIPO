# QuipoWallet Subgraph

The Graph subgraph for indexing QuipoWallet smart contract events.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update `subgraph.yaml` with deployed contract addresses

3. Generate types:
```bash
npm run codegen
```

4. Build:
```bash
npm run build
```

5. Deploy to The Graph Studio:
```bash
npm run deploy
```

## Queries

Example queries:

```graphql
{
  gasSponsoreds(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    user
    gasCost
    mneeAmount
    timestamp
  }
  
  paymasterStats(id: "1") {
    totalGasSponsored
    totalMNEEcollected
  }
  
  walletCreateds(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    owner
    wallet
    timestamp
  }
}
```

