import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';

interface BlockCountdownProps {
  purchaseBlock: number;
  maxBlocks: number;
}

export default function BlockCountdown({ purchaseBlock, maxBlocks }: BlockCountdownProps) {
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const publicClient = usePublicClient();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateBlockAndTime = async () => {
      try {
        const blockNumber = Number(await publicClient.getBlockNumber());
        setCurrentBlock(blockNumber);

        const blocksLeft = purchaseBlock + maxBlocks - blockNumber;
        if (blocksLeft <= 0) {
          setTimeLeft('Expired');
          return;
        }

        // Estimate time left (2 seconds per block)
        const secondsLeft = blocksLeft * 2;
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        setTimeLeft(`${minutes}m ${seconds}s`);
      } catch (error) {
        console.error('Error fetching block number:', error);
      }
    };

    // Initial update
    updateBlockAndTime();

    // Update every 2 seconds
    interval = setInterval(updateBlockAndTime, 2000);

    return () => clearInterval(interval);
  }, [publicClient, purchaseBlock, maxBlocks]);

  const getProgressColor = () => {
    const blocksLeft = purchaseBlock + maxBlocks - currentBlock;
    if (blocksLeft <= 0) return 'text-red-400';
    if (blocksLeft <= 50) return 'text-red-400 animate-pulse';
    if (blocksLeft <= 100) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${getProgressColor()}`}>
        {timeLeft === 'Expired' ? (
          '⚠️ Expired'
        ) : (
          <>
            ⏳ {timeLeft}
          </>
        )}
      </span>
    </div>
  );
} 