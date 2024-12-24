import '@coinbase/onchainkit/styles.css';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { pirataOne } from './fonts';

export const metadata: Metadata = {
  title: 'Eth Chests | Unlock Your Fortune',
  description: 'Open treasure chests to win ETH prizes, with special rewards every 10th chest!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-background dark ${pirataOne.className}`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="relative p-4">
              <div className="absolute right-4 top-4 z-10">
                {/* Wallet will be rendered here */}
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-amber-300">Eth Chests</h1>
                <p className="text-amber-200/70">Unlock Your Fortune</p>
              </div>
            </header>
            <main className="flex-grow">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
