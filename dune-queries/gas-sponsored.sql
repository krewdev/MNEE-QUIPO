-- Gas Sponsored by MNEE Paymaster
-- Tracks daily gas sponsored (ETH) and transaction counts

SELECT 
    DATE(block_time) as date,
    SUM(value / 1e18) as gas_sponsored_eth,
    COUNT(*) as transaction_count,
    AVG(value / 1e18) as avg_gas_per_tx,
    MIN(value / 1e18) as min_gas,
    MAX(value / 1e18) as max_gas
FROM ethereum.transactions
WHERE 
    "to" = {{paymaster_address}}
    AND block_time >= NOW() - INTERVAL '{{days}}' DAY
    AND success = true
GROUP BY DATE(block_time)
ORDER BY date DESC;

