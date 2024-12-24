import { useState } from 'react';
import { CHEST_PRICE } from '../constants';

export default function GameRules() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-amber-600/80 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        How to Play ❓
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-black/40 backdrop-blur-sm text-amber-200 p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-amber-300">How to Play Treasure Chests</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-amber-200/70 hover:text-amber-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <section>
                  <h3 className="text-lg font-semibold mb-2">🎁 Basic Rules</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Each chest costs {CHEST_PRICE} ETH to open</li>
                    <li>Every 10th chest opened is a Special Chest with better odds!</li>
                    <li>Prizes must be claimed within 256 blocks of purchase</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">💰 Regular Chest Prizes</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>65% chance: 0.004 ETH</li>
                    <li>20% chance: 0.008 ETH</li>
                    <li>10% chance: 0.015 ETH</li>
                    <li>4% chance: 0.04 ETH</li>
                    <li>1% chance: 0.1 ETH</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">✨ Special Chest Prizes</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>50% chance: 0.005 ETH</li>
                    <li>25% chance: 0.01 ETH</li>
                    <li>15% chance: 0.02 ETH</li>
                    <li>7% chance: 0.05 ETH</li>
                    <li>3% chance: 0.15 ETH</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">📝 How to Play</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Connect your wallet</li>
                    <li>Choose how many chests to open (1-10)</li>
                    <li>Click "Buy Chest" and confirm the transaction</li>
                    <li>Wait for the next block</li>
                    <li>Click "Claim Prize" to receive your treasure!</li>
                  </ol>
                </section>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
} 