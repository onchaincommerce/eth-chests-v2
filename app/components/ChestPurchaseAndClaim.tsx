import { useCallback, useState } from 'react';
import { 
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { Interface } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { 
  CONTRACT_ADDRESS, 
  CHEST_PRICE, 
  BASE_SEPOLIA_CHAIN_ID, 
  BASE_SEPOLIA_EXPLORER 
} from '../constants';
import { useTransactionDetails } from '../hooks/useTransactionDetails';
import BlockCountdown from './BlockCountdown';

type TransactionCall = {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
};

interface ChestInfo {
  index: number;
  blockNumber: number;
  special: boolean;
  claimed: boolean;
}

interface PrizeInfo {
  amount: string;
  isSpecial: boolean;
  txHash: string;
  chestIndex?: number;
}

const contractInterface = new Interface([
  "function buyChest() external payable",
  "function buyMultipleChests(uint256 quantity) external payable",
  "function claimPrize(uint256 chestIndex) external",
  "function claimAllPrizes() external",
  "event ChestPurchased(address indexed player, uint256 blockNumber, bool special, uint256 chestIndex)",
  "event PrizeAwarded(address indexed player, uint256 prize, bool special)"
]);

const QuantitySelector = ({ 
  quantity, 
  setQuantity, 
  totalCost 
}: { 
  quantity: number; 
  setQuantity: (n: number) => void; 
  totalCost: string;
}) => {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-8 h-8 flex items-center justify-center bg-amber-600/60 hover:bg-amber-600/80 rounded-lg disabled:opacity-50"
          disabled={quantity <= 1}
        >
          -
        </button>
        <div className="flex flex-col items-center">
          <span className="text-amber-200">Number of Chests:</span>
          <span className="text-xl font-bold">{quantity}</span>
        </div>
        <button 
          onClick={() => setQuantity(Math.min(10, quantity + 1))}
          className="w-8 h-8 flex items-center justify-center bg-amber-600/60 hover:bg-amber-600/80 rounded-lg disabled:opacity-50"
          disabled={quantity >= 10}
        >
          +
        </button>
      </div>
      <div className="text-center">
        <div className="text-amber-200/70">Total Cost:</div>
        <div className="text-lg font-bold">{totalCost} ETH</div>
      </div>
    </div>
  );
};

export default function ChestPurchaseAndClaim() {
  const { address } = useAccount();
  const [purchasedChests, setPurchasedChests] = useState<ChestInfo[]>([]);
  const [canClaim, setCanClaim] = useState(false);
  const [prizeAmount, setPrizeAmount] = useState<string | null>(null);
  const [isSpecial, setIsSpecial] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const ethPrice = useEthPrice();
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const { details: txDetails, loading: txDetailsLoading } = useTransactionDetails(txHashes);
  const [individualPrizes, setIndividualPrizes] = useState<PrizeInfo[]>([]);

  const handleOnStatus = useCallback(async (status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    switch (status.statusName) {
      case 'transactionPending':
      case 'buildingTransaction':
        setTransactionInProgress(true);
        break;
      case 'success':
        setTransactionInProgress(true);
        const receipt = status.statusData.transactionReceipts[0];
        const newTxHash = receipt.transactionHash;
        setTxHash(newTxHash);

        const logs = receipt.logs;
        const newChests: ChestInfo[] = [];
        const prizes: PrizeInfo[] = [];

        // First pass: collect chest purchases
        for (const log of logs) {
          try {
            const parsedLog = contractInterface.parseLog({
              topics: log.topics,
              data: log.data,
              address: log.address
            });

            if (parsedLog.name === 'ChestPurchased') {
              newChests.push({
                blockNumber: Number(parsedLog.args.blockNumber),
                index: Number(parsedLog.args.chestIndex),
                special: parsedLog.args.special,
                claimed: false
              });
            }
          } catch (e) {
            console.error('Error parsing ChestPurchased log:', e);
          }
        }

        // Second pass: collect prizes
        for (const log of logs) {
          try {
            const parsedLog = contractInterface.parseLog({
              topics: log.topics,
              data: log.data,
              address: log.address
            });

            if (parsedLog.name === 'PrizeAwarded') {
              const prize = formatEther(parsedLog.args[1]);
              const isSpecial = parsedLog.args[2];
              const prizeInfo = { 
                amount: prize, 
                isSpecial,
                txHash: log.transactionHash,
                chestIndex: newChests[prizes.length]?.index
              };
              prizes.push(prizeInfo);
              
              setPrizeAmount((prev) => {
                const current = prev ? Number(prev) : 0;
                return (current + Number(prize)).toFixed(4);
              });

              setIndividualPrizes(prev => [...prev, prizeInfo]);
              
              // Update the specific chest that was claimed
              setPurchasedChests(chests => 
                chests.map(chest => 
                  chest.index === prizeInfo.chestIndex
                    ? { ...chest, claimed: true }
                    : chest
                )
              );
            }
          } catch (e) {
            console.error('Error parsing PrizeAwarded log:', e);
          }
        }

        // Update state with collected data
        if (prizes.length > 0) {
          setCanClaim(false); // Hide claim UI after successful claim
          setTransactionInProgress(false);
        }

        if (newChests.length > 0) {
          setPurchasedChests(newChests);
          setIsSpecial(newChests.some(chest => chest.special));
          setTimeout(() => {
            setCanClaim(true);
            setTransactionInProgress(false);
          }, 15000);
        } else {
          setTransactionInProgress(false);
        }
        break;

      case 'error':
      case 'transactionLegacyExecuted':
        setTransactionInProgress(false);
        break;
    }
  }, []);

  const purchaseCalls: TransactionCall[] = [{
    to: CONTRACT_ADDRESS,
    data: quantity === 1 
      ? contractInterface.encodeFunctionData("buyChest", []) as `0x${string}`
      : contractInterface.encodeFunctionData("buyMultipleChests", [quantity]) as `0x${string}`,
    value: BigInt(parseEther((Number(CHEST_PRICE) * quantity).toString()).toString()),
  }];

  const getClaimCalls = (): TransactionCall[] => {
    if (purchasedChests.length === 0) return [];
    
    const unclaimedChests = purchasedChests.filter(chest => !chest.claimed);
    if (unclaimedChests.length > 1) {
      return [{
        to: CONTRACT_ADDRESS,
        data: contractInterface.encodeFunctionData("claimAllPrizes", []) as `0x${string}`,
      }];
    }
    
    const chestToClaim = unclaimedChests[0];
    if (chestToClaim) {
      return [{
        to: CONTRACT_ADDRESS,
        data: contractInterface.encodeFunctionData("claimPrize", [chestToClaim.index]) as `0x${string}`,
      }];
    }
    
    return [];
  };

  const resetGame = useCallback(() => {
    setPurchasedChests([]);
    setCanClaim(false);
    setPrizeAmount(null);
    setIsSpecial(false);
    setTxHash(null);
  }, []);

  const formatUsdValue = (ethAmount: string) => {
    if (!ethPrice) return '';
    const usdValue = Number(ethAmount) * ethPrice;
    return `(≈$${usdValue.toFixed(2)})`;
  };

  const totalCost = (Number(CHEST_PRICE) * quantity).toFixed(3);

  return (
    <div className="text-amber-200">
      {purchasedChests.length === 0 ? (
        <div className="w-full">
          <h3 className="text-2xl font-pirata mb-6 text-center text-amber-300 drop-shadow-lg">
            Unlock the Chest's Secrets
          </h3>

          <QuantitySelector 
            quantity={quantity} 
            setQuantity={setQuantity} 
            totalCost={totalCost} 
          />

          <Transaction
            chainId={BASE_SEPOLIA_CHAIN_ID}
            calls={purchaseCalls}
            onStatus={handleOnStatus}
          >
            <TransactionButton 
              className={`w-full py-3 px-4 ${
                transactionInProgress 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-amber-600/80 hover:bg-amber-600'
              } text-white rounded-lg transition-colors`}
              text={
                transactionInProgress 
                  ? "Processing..." 
                  : quantity === 1 
                    ? "Buy Chest 🎁" 
                    : `Buy ${quantity} Chests 🎁`
              }
              disabled={transactionInProgress}
            />
            <TransactionSponsor />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>
          
          {quantity > 1 && (
            <p className="mt-4 text-sm text-amber-200/70 italic text-center">
              Remember: Each chest must be claimed within 256 blocks of purchase! ⏳
            </p>
          )}
        </div>
      ) : canClaim ? (
        <div className="w-full">
          <h3 className="text-2xl font-semibold mb-6 text-center text-amber-300 drop-shadow-lg">
            {purchasedChests.length > 1 
              ? '🎁 Multiple Chests Ready!' 
              : isSpecial 
                ? '✨ Special Chest Ready! ✨' 
                : 'Claim Yer Bounty!'}
          </h3>
          
          <div className="mb-6 space-y-2">
            {purchasedChests.map((chest) => {
              const prizeInfo = individualPrizes.find(p => p.chestIndex === chest.index);
              
              return (
                <div 
                  key={chest.index}
                  className="flex justify-between items-center p-4 rounded bg-black/20"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-pirata">
                      Chest #{chest.index} {chest.special && <span className="text-yellow-400">✨</span>}
                    </span>
                    {!chest.claimed && (
                      <BlockCountdown 
                        purchaseBlock={chest.blockNumber} 
                        maxBlocks={256}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {chest.claimed && prizeInfo ? (
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          Number(prizeInfo.amount) >= 0.1 ? 'text-purple-400' :
                          Number(prizeInfo.amount) >= 0.04 ? 'text-yellow-400' :
                          Number(prizeInfo.amount) >= 0.015 ? 'text-green-400' :
                          Number(prizeInfo.amount) >= 0.008 ? 'text-blue-400' :
                          'text-amber-200'
                        }`}>
                          {Number(prizeInfo.amount).toFixed(4)} ETH
                        </span>
                        <a
                          href={`${BASE_SEPOLIA_EXPLORER}/tx/${prizeInfo.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 text-sm"
                        >
                          View ↗
                        </a>
                      </div>
                    ) : (
                      <span className="text-amber-200/70 animate-pulse font-pirata">
                        Ready to claim... ⏳
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {purchasedChests.every(chest => chest.claimed) && (
            <>
              <div className="mb-6 p-4 bg-black/30 rounded-lg border border-amber-900/30">
                <div className="flex justify-between items-center">
                  <span className="text-amber-300 font-bold font-pirata">Total Claimed:</span>
                  <div className="text-right">
                    <span className="text-xl font-bold">{Number(prizeAmount).toFixed(4)} ETH</span>
                    <span className="text-sm text-amber-200/70 ml-2">
                      {formatUsdValue(prizeAmount || '0')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={resetGame}
                className="w-full py-3 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                Play Again! 🎲
              </button>
            </>
          )}

          {!purchasedChests.every(chest => chest.claimed) && (
            <Transaction 
              chainId={BASE_SEPOLIA_CHAIN_ID}
              calls={getClaimCalls()}
              onStatus={handleOnStatus}
            >
              <TransactionButton 
                className={`w-full py-3 px-4 ${
                  transactionInProgress 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-amber-600/80 hover:bg-amber-600'
                } text-white rounded-lg transition-colors`}
                text={
                  transactionInProgress 
                    ? "Processing..." 
                    : purchasedChests.length > 1
                      ? "Claim All Prizes 💎"
                      : isSpecial 
                        ? 'Claim Special Prize 💫' 
                        : 'Claim Prize 💰'
                }
                disabled={transactionInProgress}
              />
              <TransactionSponsor />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          )}
        </div>
      ) : prizeAmount ? (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4 text-amber-300 drop-shadow-lg">
            {isSpecial ? '✨ Special Treasure Secured! ✨' : '🎉 Treasure Secured! 🎉'}
          </h3>
          
          <div className="space-y-4">
            {individualPrizes.map((prize, index) => (
              <div 
                key={index} 
                className="p-4 bg-black/20 rounded-lg border border-amber-900/30"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${
                        prize.amount >= '0.1' ? 'text-purple-400' :
                        prize.amount >= '0.04' ? 'text-yellow-400' :
                        prize.amount >= '0.015' ? 'text-green-400' :
                        prize.amount >= '0.008' ? 'text-blue-400' :
                        'text-amber-200'
                      }`}>
                        {prize.amount} ETH
                      </span>
                      {prize.isSpecial && (
                        <span className="text-yellow-400 text-lg">✨ Special Prize!</span>
                      )}
                    </div>
                    <span className="text-sm text-amber-200/70">
                      {formatUsdValue(prize.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-200/70">
                      Chest #{index + 1} of {individualPrizes.length}
                    </span>
                    <a
                      href={`${BASE_SEPOLIA_EXPLORER}/tx/${prize.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      View on Explorer
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {individualPrizes.length > 1 && (
              <div className="mt-6 pt-4 border-t border-amber-900/30">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-amber-300">
                    Total Winnings:
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {prizeAmount} ETH
                    </div>
                    <div className="text-sm text-amber-200/70">
                      {formatUsdValue(prizeAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={resetGame}
              className="mt-8 w-full py-3 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Play Again! 🎲
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <span className="text-amber-200">
            {isSpecial ? 
              '✨ Special chest unlocking... Stand ready! ⏳' :
              'The chest\'s lock be turnin\'... Stand ready to claim yer prize! ⏳'}
          </span>
        </div>
      )}
    </div>
  );
} 