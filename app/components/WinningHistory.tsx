import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { Interface } from 'ethers';
import { BASESCAN_API_KEY, BASE_SEPOLIA_EXPLORER, CONTRACT_ADDRESS } from '../constants';
import { useEthPrice } from '../hooks/useEthPrice';

interface WinningEvent {
  txHash: string;
  prize: string;
  isSpecial: boolean;
  timestamp: string;
  player: string;
}

const contractInterface = new Interface([
  "event PrizeAwarded(address indexed player, uint256 prize, bool special)"
]);

export default function WinningHistory() {
  const [winnings, setWinnings] = useState<WinningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const ethPrice = useEthPrice();

  // Fetch data only once on mount
  useEffect(() => {
    const fetchWinningHistory = async () => {
      try {
        const response = await fetch(
          `https://api-sepolia.basescan.org/api?module=logs&action=getLogs&address=${CONTRACT_ADDRESS}&fromBlock=0&toBlock=latest&apikey=${BASESCAN_API_KEY}`
        );

        const data = await response.json();
        if (data.status === '0') {
          throw new Error(data.message || 'Failed to fetch history');
        }

        const events = data.result || [];
        const processedEvents = events
          .map((log: any) => {
            try {
              const parsedLog = contractInterface.parseLog({
                topics: log.topics,
                data: log.data,
                address: log.address
              });

              return {
                txHash: log.transactionHash,
                prize: formatEther(parsedLog.args[1]),
                isSpecial: parsedLog.args[2],
                timestamp: new Date(parseInt(log.timeStamp) * 1000).toISOString(),
                player: parsedLog.args[0]
              };
            } catch (err) {
              console.error('Error processing log:', err);
              return null;
            }
          })
          .filter((event): event is WinningEvent => event !== null)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setWinnings(processedEvents);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWinningHistory();
  }, []);

  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(winnings.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const displayedWinnings = winnings.slice(startIndex, startIndex + itemsPerPage);

  // Format USD value
  const formatUsdValue = (ethAmount: string) => {
    if (!ethPrice) return '';
    const usdValue = Number(ethAmount) * ethPrice;
    return `≈$${usdValue.toFixed(2)}`;
  };

  // Get prize color based on amount
  const getPrizeColor = (amount: string) => {
    const value = parseFloat(amount);
    if (value >= 0.1) return 'text-purple-400';
    if (value >= 0.04) return 'text-yellow-400';
    if (value >= 0.015) return 'text-green-400';
    if (value >= 0.008) return 'text-blue-400';
    return 'text-amber-200';
  };

  return (
    <div className="w-full p-6 bg-black/40 backdrop-blur-sm rounded-xl text-amber-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-amber-300">
        Treasure Chest Winnings
      </h2>

      {loading ? (
        <div className="text-center animate-pulse">
          Loading treasure records...
        </div>
      ) : displayedWinnings.length > 0 ? (
        <>
          <div className="space-y-3">
            {displayedWinnings.map((win) => (
              <div
                key={win.txHash}
                className="flex justify-between items-center p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
              >
                <div className="flex flex-col">
                  <span className={`text-lg font-bold flex items-center gap-2 ${getPrizeColor(win.prize)}`}>
                    {win.prize} ETH 
                    {win.isSpecial && <span className="text-yellow-400">✨</span>}
                    {ethPrice && (
                      <span className="text-sm text-amber-200/70">
                        ({formatUsdValue(win.prize)})
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-amber-200/70">
                    {new Date(win.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-amber-200/50">
                    Winner: {win.player.slice(0, 6)}...{win.player.slice(-4)}
                  </span>
                </div>
                <a
                  href={`${BASE_SEPOLIA_EXPLORER}/tx/${win.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 text-sm"
                >
                  View ↗
                </a>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-amber-600/60 hover:bg-amber-600/80 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-amber-600/60 hover:bg-amber-600/80 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-amber-200/70">
          No treasure records found
        </div>
      )}
    </div>
  );
} 