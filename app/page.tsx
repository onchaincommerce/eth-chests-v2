'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import ChestPurchaseAndClaim from './components/ChestPurchaseAndClaim';
import WinningHistory from './components/WinningHistory';
import ContractInfo from './components/ContractInfo';
import GameRules from './components/GameRules';
import AdminPanel from './components/AdminPanel';
import { useAccount } from 'wagmi';

export default function App() {
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === '0xc17c78C007FC5C01d796a30334fa12b025426652'.toLowerCase();

  return (
    <div className="flex flex-col">
      <div className="absolute top-4 right-4">
        <div className="wallet-container">
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownLink
                icon="wallet"
                href="https://keys.coinbase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 p-4 mt-16">
        <div className="max-w-md w-full p-6 bg-black/40 backdrop-blur-sm rounded-xl">
          <ChestPurchaseAndClaim />
        </div>
        <div className="max-w-2xl w-full">
          <WinningHistory />
          <div className="mt-4">
            <ContractInfo />
          </div>
          {isOwner && <AdminPanel />}
        </div>
      </div>

      <GameRules />
    </div>
  );
}
