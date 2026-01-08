# Dune Analytics Queries for QuipoWallet

This directory contains SQL queries for Dune Analytics to track QuipoWallet metrics.

## Setup

1. **Create Dune Account**: https://dune.com/
2. **Get API Key**: https://dune.com/settings/api
3. **Add to `.env`**:
   ```env
   DUNE_API_KEY=your_dune_api_key
   NEXT_PUBLIC_DUNE_API_KEY=your_dune_api_key (for client-side, if needed)
   ```

## Available Queries

### 1. Gas Sponsored by Paymaster
**Query ID:** [To be created]

Tracks total gas sponsored by the Paymaster contract.

```sql
-- Track gas sponsored by MNEE Paymaster
SELECT 
    DATE(block_time) as date,
    SUM(value / 1e18) as gas_sponsored_eth,
    COUNT(*) as transaction_count
FROM ethereum.transactions
WHERE 
    "to" = '{{paymaster_address}}'
    AND block_time >= NOW() - INTERVAL '7' DAY
GROUP BY DATE(block_time)
ORDER BY date DESC;
```

### 2. Wallets Created by Factory
**Query ID:** [To be created]

Tracks agent wallets created by the factory.

```sql
-- Track wallets created by AgentWalletFactory
SELECT 
    DATE(block_time) as date,
    COUNT(*) as wallets_created
FROM ethereum.logs
WHERE 
    contract_address = '{{factory_address}}'
    AND topic0 = '0x...' -- WalletCreated event signature
    AND block_time >= NOW() - INTERVAL '30' DAY
GROUP BY DATE(block_time)
ORDER BY date DESC;
```

### 3. MNEE Token Transactions
**Query ID:** [To be created]

Tracks MNEE token transfers related to the Paymaster.

```sql
-- Track MNEE token volume
SELECT 
    DATE(block_time) as date,
    SUM(amount / 1e18) as mnee_volume,
    COUNT(*) as transfer_count
FROM ethereum.token_transfers
WHERE 
    token_address = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' -- MNEE token
    AND ("from" = '{{paymaster_address}}' OR "to" = '{{paymaster_address}}')
    AND block_time >= NOW() - INTERVAL '7' DAY
GROUP BY DATE(block_time)
ORDER BY date DESC;
```

### 4. Paymaster Activity Summary
**Query ID:** [To be created]

Overall Paymaster activity and statistics.

```sql
SELECT 
    COUNT(DISTINCT "from") as unique_users,
    COUNT(*) as total_transactions,
    SUM(value / 1e18) as total_gas_sponsored,
    AVG(value / 1e18) as avg_gas_per_tx,
    MIN(block_time) as first_transaction,
    MAX(block_time) as last_transaction
FROM ethereum.transactions
WHERE 
    "to" = '{{paymaster_address}}'
    AND block_time >= NOW() - INTERVAL '30' DAY;
```

## Creating Queries in Dune

1. Go to https://dune.com/queries/new
2. Write your SQL query
3. Add parameters using `{{parameter_name}}`
4. Save and note the Query ID
5. Update the frontend with your Query IDs

## Using Queries

1. **Get Query ID** from Dune after creating query
2. **Set environment variable**:
   ```env
   DUNE_API_KEY=your_key
   ```
3. **Update frontend** with Query IDs
4. **Data refreshes automatically** every 30 seconds

## Example Integration

```typescript
import { executeAndWaitForDuneQuery } from '@/lib/dune';

// Execute query
const results = await executeAndWaitForDuneQuery(123456, {
  paymaster_address: '0x...',
  days: 7
});
```

## Query Parameters

Common parameters for queries:
- `paymaster_address` - Paymaster contract address
- `factory_address` - Factory contract address
- `token_address` - MNEE token address
- `days` - Number of days to look back
- `start_date` - Start date for range
- `end_date` - End date for range

## Multi-Chain Support

For multi-chain analytics, create separate queries for:
- Ethereum (ethereum schema)
- Base (base schema)
- Polygon (polygon schema)
- Arbitrum (arbitrum schema)

Then aggregate results in the frontend or create a combined query.

