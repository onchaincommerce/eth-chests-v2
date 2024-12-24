import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, BASE_SEPOLIA_EXPLORER, BASESCAN_API_KEY } from '../constants';
import { useEthPrice } from '../hooks/useEthPrice';

export default function ContractInfo() {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();
  const ethPrice = useEthPrice();

  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        setLoading(true);
        
        // Fetch contract balance using BaseScan API
        const balanceResponse = await fetch(
          `https://api-sepolia.basescan.org/api?module=account&action=balance&address=${CONTRACT_ADDRESS}&tag=latest&apikey=${BASESCAN_API_KEY}`
        );
        
        const balanceData = await balanceResponse.json();
        
        if (balanceData.status === '1' && balanceData.result) {
          setBalance(formatEther(BigInt(balanceData.result)));
        } else {
          // Fallback to RPC call if API fails
          const contractBalance = await publicClient.getBalance({
            address: CONTRACT_ADDRESS as `0x${string}`,
          });
          setBalance(formatEther(contractBalance));
        }
      } catch (error) {
        console.error('Error fetching contract info:', error);
        // Fallback to RPC call if API fails
        try {
          const contractBalance = await publicClient.getBalance({
            address: CONTRACT_ADDRESS as `0x${string}`,
          });
          setBalance(formatEther(contractBalance));
        } catch (e) {
          console.error('Error fetching balance via RPC:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContractInfo();
    // Update every 30 seconds
    const interval = setInterval(fetchContractInfo, 30000);

    return () => clearInterval(interval);
  }, [publicClient]);

  const formatUsdValue = (ethAmount: string) => {
    if (!ethPrice) return '';
    const usdValue = Number(ethAmount) * ethPrice;
    return `≈$${usdValue.toFixed(2)}`;
  };

  return (
    <div className="text-amber-200 bg-black/40 backdrop-blur-sm rounded-xl p-4 text-center">
      <h2 className="text-xl font-bold mb-2">Treasure Chest Contract</h2>
      <div className="space-y-2">
        {loading ? (
          <div className="animate-pulse">Loading contract info...</div>
        ) : (
          <>
            <div>
              <span className="text-amber-200/70">Balance: </span>
              <span className="font-bold">{Number(balance).toFixed(4)} ETH</span>
              {ethPrice && (
                <span className="text-sm text-amber-200/70 ml-2">
                  ({formatUsdValue(balance)})
                </span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-amber-200/70">Address: </span>
              <a
                href={`${BASE_SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 break-all"
              >
                {CONTRACT_ADDRESS}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 