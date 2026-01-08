-- Agent Wallets Created by Factory
-- Tracks daily wallet creation count

SELECT 
    DATE(block_time) as date,
    COUNT(*) as wallets_created,
    COUNT(DISTINCT "from") as unique_creators
FROM ethereum.logs
WHERE 
    contract_address = {{factory_address}}
    AND topic0 = '0x...' -- WalletCreated event signature (update with actual)
    AND block_time >= NOW() - INTERVAL '{{days}}' DAY
GROUP BY DATE(block_time)
ORDER BY date DESC;

