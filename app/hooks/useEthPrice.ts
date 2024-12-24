import { useState, useEffect } from 'react';
import { BASESCAN_API_KEY } from '../constants';

export function useEthPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          `https://api-sepolia.basescan.org/api?module=stats&action=ethprice&apikey=${BASESCAN_API_KEY}`
        );
        const data = await response.json();
        
        if (data.status === '1' && data.result.ethusd) {
          setPrice(Number(data.result.ethusd));
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error);
      }
    };

    fetchPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchPrice, 60000);

    return () => clearInterval(interval);
  }, []);

  return price;
} 