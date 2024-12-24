import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { 
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import { Interface } from 'ethers';
import { CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from '../constants';

const contractInterface = new Interface([
  "function withdraw(uint256 amount) external",
  "function withdrawAll() external",
  "function owner() external view returns (address)"
]);

const OWNER_ADDRESS = '0xc17c78C007FC5C01d796a30334fa12b025426652';

export default function AdminPanel() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');

  // Simplified owner check
  if (!address || address.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    return null;
  }

  const handleWithdraw = (amount?: string) => {
    const calls = [{
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: amount 
        ? contractInterface.encodeFunctionData("withdraw", [parseEther(amount)]) as `0x${string}`
        : contractInterface.encodeFunctionData("withdrawAll", []) as `0x${string}`,
    }];

    return calls;
  };

  return (
    <div className="mt-8 p-6 bg-black/40 backdrop-blur-sm rounded-xl">
      <h2 className="text-xl font-bold mb-4 text-amber-300">Admin Controls</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2">Withdraw Amount (ETH)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-black/20 border border-amber-600/50 rounded text-amber-200"
            placeholder="Amount in ETH"
          />
        </div>

        <div className="flex gap-4">
          <Transaction
            chainId={BASE_SEPOLIA_CHAIN_ID}
            calls={handleWithdraw(amount)}
          >
            <TransactionButton 
              className="flex-1 py-2 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg"
              text="Withdraw Amount"
            />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>

          <Transaction
            chainId={BASE_SEPOLIA_CHAIN_ID}
            calls={handleWithdraw()}
          >
            <TransactionButton 
              className="flex-1 py-2 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg"
              text="Withdraw All"
            />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>
        </div>
      </div>
    </div>
  );
} 