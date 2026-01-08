-- Paymaster Activity Summary
-- Overall statistics and KPIs

SELECT 
    COUNT(DISTINCT "from") as unique_users,
    COUNT(*) as total_transactions,
    SUM(value / 1e18) as total_gas_sponsored_eth,
    AVG(value / 1e18) as avg_gas_per_tx,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value / 1e18) as median_gas,
    MIN(block_time) as first_transaction,
    MAX(block_time) as last_transaction,
    COUNT(DISTINCT DATE(block_time)) as active_days
FROM ethereum.transactions
WHERE 
    "to" = {{paymaster_address}}
    AND block_time >= NOW() - INTERVAL '{{days}}' DAY
    AND success = true;

