'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { yellowService } from '@/lib/yellow/service';
import { useAppStore } from '@/lib/store';
import { generateId } from '@/lib/utils/helpers';
import { firebaseService } from '@/lib/firebase/database';
import Link from 'next/link';
import { ChainSelector } from '@/components/ui/ChainSelector';

export default function CreateGroupPage() {
    const router = useRouter();
    const { ready, authenticated, user, login } = usePrivy();
    const { setCurrentGroup, setIsLoading, setError } = useAppStore();

    const [groupName, setGroupName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedChains, setSelectedChains] = useState<number[]>([]);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authenticated || !user) {
            login();
            return;
        }

        setIsCreating(true);
        setIsLoading(true);
        setError(null);

        try {
            // Get user's wallet address (supports both MetaMask and Privy email wallets)
            let userAddress = (user as any).wallet?.address;

            // If no wallet, check for embedded wallet from email login
            if (!userAddress) {
                const embeddedWallet = (user as any).linkedAccounts?.find(
                    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
                );
                userAddress = embeddedWallet?.address;
            }

            // Last fallback: check smart_wallet
            if (!userAddress && (user as any).smartWallet) {
                userAddress = (user as any).smartWallet.address;
            }

            if (!userAddress) {
                throw new Error('No wallet address found. Please connect a wallet or sign in with email.');
            }

            console.log('✅ User address:', userAddress);

            // Create message signer function
            const messageSigner = async (message: string) => {
                // In a real implementation, this would use Privy's signing method
                // For now, we'll simulate it
                console.log('Signing message:', message);
                return `signature-${Date.now()}`;
            };

            // Create Yellow Network session
            // We pass '0' as initial amount since we don't lock collateral on-chain in this version
            const sessionId = await yellowService.createSession(
                groupName,
                userAddress,
                [], // No initial participants
                messageSigner,
                '0' // Initial amount
            );

            // Create group object
            const newGroup = {
                id: sessionId,
                name: groupName,
                createdBy: userAddress,
                createdAt: Date.now(),
                participants: [
                    {
                        address: userAddress,
                        preferredChains: selectedChains,
                    },
                ],
                expenses: [],
                isActive: true,
                yellowSessionId: sessionId,
            };

            // Save to Firebase (for cross-browser sync)
            await firebaseService.saveGroup(newGroup);

            // Save to store
            setCurrentGroup(newGroup);

            // Navigate to group dashboard
            router.push(`/group/${sessionId}`);
        } catch (error: any) {
            console.error('Error creating group:', error);
            setError(error.message || 'Failed to create group');
        } finally {
            setIsCreating(false);
            setIsLoading(false);
        }
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                        <p className="text-gray-400 mb-6">
                            You need to connect your wallet to create a group
                        </p>
                        <button
                            onClick={login}
                            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            SplitChain
                        </span>
                    </Link>
                    <div className="text-sm text-gray-400">
                        {(user as any)?.wallet?.address?.slice(0, 6)}...{(user as any)?.wallet?.address?.slice(-4)}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Create New Group</h1>
                    <p className="text-gray-400">
                        Start a new expense group using Yellow Network's instant state channels
                    </p>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                    {/* Group Name */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g., Ahmedabad Dinner"
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Choose a memorable name for your expense group
                        </p>
                    </div>

                    {/* Preferred Chains */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Preferred Chains for Receiving Funds
                        </label>
                        <ChainSelector
                            selectedChains={selectedChains}
                            onChange={setSelectedChains}
                        />
                        {selectedChains.length === 0 && (
                            <p className="mt-2 text-sm text-red-400">
                                Please select at least one preferred chain.
                            </p>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">ℹ️</span>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">How it works</h3>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Yellow Network creates an off-chain state channel</li>
                                    <li>• All expenses are tracked instantly with zero gas fees</li>
                                    <li>• Share the group link with friends to join</li>
                                    <li>• Settle final balances cross-chain when done</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isCreating || !groupName || selectedChains.length === 0}
                        className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all duration-200 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70"
                    >
                        {isCreating ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Creating Group...
                            </span>
                        ) : (
                            'Create Group'
                        )}
                    </button>
                </form>

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </main>
        </div>
    );
}
