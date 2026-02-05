'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { yellowService } from '@/lib/yellow/service';
import { resolveAddress } from '@/lib/ens/resolver';
import { useAppStore } from '@/lib/store';
import { firebaseService } from '@/lib/firebase/database';
import Link from 'next/link';

export default function JoinGroupPage() {
    const router = useRouter();
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { setCurrentGroup, setIsLoading, setError } = useAppStore();

    const [sessionId, setSessionId] = useState('');
    const [lockAmount, setLockAmount] = useState('100');
    const [isJoining, setIsJoining] = useState(false);
    const [creatorEns, setCreatorEns] = useState<string | null>(null);

    const handleSessionIdChange = async (value: string) => {
        setSessionId(value);

        // Try to extract creator address and resolve ENS
        // Session ID format: splitchain-{groupName}-v1
        // For demo, we'll just show the session ID
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authenticated || !user) {
            login();
            return;
        }

        setIsJoining(true);
        setIsLoading(true);
        setError(null);

        try {
            // Debug: Log entire Privy user object
            console.log('🔍 Full Privy user object:', user);
            console.log('🔍 user.wallet:', (user as any).wallet);
            console.log('🔍 user.linkedAccounts:', (user as any).linkedAccounts);
            console.log('🔍 user.smartWallet:', (user as any).smartWallet);
            console.log('🔍 user.id:', (user as any).id);

            // Get user's wallet address (supports both MetaMask and Privy email wallets)
            let userAddress = (user as any).wallet?.address;

            // If no wallet, check for embedded wallet from email login
            if (!userAddress) {
                const embeddedWallet = (user as any).linkedAccounts?.find(
                    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
                );
                console.log('🔍 Found embedded wallet:', embeddedWallet);
                userAddress = embeddedWallet?.address;
            }

            // Last fallback: check smart_wallet
            if (!userAddress && (user as any).smartWallet) {
                userAddress = (user as any).smartWallet.address;
            }

            if (!userAddress) {
                console.error('❌ Could not find wallet address in any location');
                throw new Error('No wallet address found. Please connect a wallet or sign in with email.');
            }

            console.log('✅ User address:', userAddress);

            // Create message signer function
            const messageSigner = async (message: string) => {
                console.log('Signing message:', message);
                return `signature-${Date.now()}`;
            };

            // Join Yellow Network session
            await yellowService.joinSession(
                sessionId,
                userAddress,
                messageSigner,
                (parseFloat(lockAmount) * 1000000).toString()
            );

            // Fetch existing group from Firebase
            let group = await firebaseService.getGroup(sessionId);

            if (!group) {
                throw new Error('Group not found. Please check the session ID.');
            }

            // Add current user as participant
            await firebaseService.addParticipant(sessionId, {
                address: userAddress,
            });

            // Reload group to get updated participants
            group = await firebaseService.getGroup(sessionId);

            // Save to store
            if (group) {
                setCurrentGroup(group);
            }

            // Navigate to group dashboard
            router.push(`/group/${sessionId}`);
        } catch (error: any) {
            console.error('Error joining group:', error);
            setError(error.message || 'Failed to join group');
        } finally {
            setIsJoining(false);
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
                            You need to connect your wallet to join a group
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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-300">
                                {(user as any)?.email?.address ||
                                    ((user as any)?.wallet?.address ?
                                        (user as any).wallet.address.slice(0, 6) + '...' + (user as any).wallet.address.slice(-4) :
                                        'Connected')}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-all duration-200"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Join Expense Group</h1>
                    <p className="text-gray-400">
                        Enter the group session ID to join an existing expense group
                    </p>
                </div>

                <form onSubmit={handleJoinGroup} className="space-y-6">
                    {/* Session ID */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Group Session ID
                        </label>
                        <input
                            type="text"
                            value={sessionId}
                            onChange={(e) => handleSessionIdChange(e.target.value)}
                            placeholder="splitchain-dinner-v1"
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Paste the session ID shared by the group creator
                        </p>
                    </div>

                    {/* Lock Amount */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Collateral Amount (USDC)
                        </label>
                        <input
                            type="number"
                            value={lockAmount}
                            onChange={(e) => setLockAmount(e.target.value)}
                            placeholder="100"
                            min="1"
                            step="0.01"
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Amount to lock in the state channel (refundable on settlement)
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">💡</span>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">What happens next?</h3>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• You'll join the Yellow Network state channel</li>
                                    <li>• Your collateral is locked securely</li>
                                    <li>• You can add and view expenses instantly</li>
                                    <li>• Settle your share when the group closes</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isJoining || !sessionId}
                        className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all duration-200 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70"
                    >
                        {isJoining ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Joining Group...
                            </span>
                        ) : (
                            'Join Group'
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
