'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={{
                loginMethods: ['wallet', 'email'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#6366F1',
                    logo: '/logo.png',
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                },
                defaultChain: {
                    id: 1,
                    name: 'Ethereum',
                },
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
