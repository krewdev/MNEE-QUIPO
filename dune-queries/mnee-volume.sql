-- MNEE Token Volume Through Paymaster
-- Tracks MNEE token transfers related to Paymaster operations

SELECT 
    DATE(block_time) as date,
    SUM(
        CASE 
            WHEN "to" = {{paymaster_address}} THEN amount / 1e18
            ELSE 0
        END
    ) as mnee_collected,
    COUNT(*) as transfer_count,
    COUNT(DISTINCT "from") as unique_senders
FROM ethereum.token_transfers
WHERE 
    token_address = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' -- MNEE token
    AND ("from" = {{paymaster_address}} OR "to" = {{paymaster_address}})
    AND block_time >= NOW() - INTERVAL '{{days}}' DAY
GROUP BY DATE(block_time)
ORDER BY date DESC;

