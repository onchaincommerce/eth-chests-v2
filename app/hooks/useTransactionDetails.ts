import { useState, useEffect } from 'react';
import { BASESCAN_API_KEY, BASESCAN_API_URL } from '../constants';

interface TransactionDetail {
  txHash: string;
  prize: string;
  isSpecial: boolean;
  timestamp: string;
}

export function useTransactionDetails(txHashes: string[]) {
  const [details, setDetails] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!txHashes.length) return;
      
      setLoading(true);
      try {
        const details = await Promise.all(
          txHashes.map(async (hash) => {
            const response = await fetch(`${BASESCAN_API_URL}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getTransactionReceipt',
                params: [hash],
              }),
            });

            const data = await response.json();
            const receipt = data.result;

            // Parse the logs to find PrizeAwarded event
            const prizeLog = receipt.logs.find(
              (log: any) => log.topics[0] === '0x....' // Add PrizeAwarded event signature
            );

            if (prizeLog) {
              // Decode the log data to get prize amount and isSpecial
              // You'll need to decode this based on your event structure
              return {
                txHash: hash,
                prize: 'X ETH', // Decode from log
                isSpecial: false, // Decode from log
                timestamp: new Date().toISOString(), // You might want to fetch block timestamp
              };
            }
          })
        );

        setDetails(details.filter((d): d is TransactionDetail => d !== undefined));
      } catch (error) {
        console.error('Error fetching transaction details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [txHashes]);

  return { details, loading };
} 