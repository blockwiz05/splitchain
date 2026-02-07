'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { firebaseService } from '@/lib/firebase/database';
import { GroupSession } from '@/types';

// Helper to calculate user balance
function calculateBalance(group: GroupSession, userAddress: string): number {
    if (!group.expenses || group.expenses.length === 0) return 0;

    let balance = 0;
    const normalizedUserAddress = userAddress.toLowerCase();

    group.expenses.forEach(expense => {
        const amount = Number(expense.amount);
        const splitCount = expense.splitAmong.length;

        if (expense.paidBy.toLowerCase() === normalizedUserAddress) {
            balance += amount;
        }

        if (expense.splitAmong.some(addr => addr.toLowerCase() === normalizedUserAddress)) {
            balance -= amount / splitCount;
        }
    });

    return balance;
}

export default function DashboardPage() {
    const { ready, authenticated, user, login } = usePrivy();
    const [groups, setGroups] = useState<GroupSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    // Get user address
    useEffect(() => {
        if (ready && authenticated && user) {
            let address = (user as any).wallet?.address;
            if (!address) {
                const embeddedWallet = (user as any).linkedAccounts?.find(
                    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
                );
                address = embeddedWallet?.address;
            }
            // Smart wallet fallback
            if (!address && (user as any).smartWallet) {
                address = (user as any).smartWallet.address;
            }
            setUserAddress(address || null);
        }
    }, [ready, authenticated, user]);

    // Fetch and filter groups
    useEffect(() => {
        async function fetchGroups() {
            if (!userAddress) return;

            try {
                setLoading(true);
                const allGroups = await firebaseService.getAllGroups();

                // Filter groups where user is a participant
                const userGroups = allGroups.filter(group =>
                    group.participants?.some(p =>
                        p.address.toLowerCase() === userAddress.toLowerCase()
                    )
                );

                // Sort by most recently updated or created
                userGroups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

                setGroups(userGroups);
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                setLoading(false);
            }
        }

        if (userAddress) {
            fetchGroups();
        } else if (ready && !authenticated) {
            setLoading(false);
        }
    }, [userAddress, ready, authenticated]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-white animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                <div className="max-w-md w-full mx-4 text-center">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                        <p className="text-gray-400 mb-8">
                            Connect your wallet to view your active groups and expenses
                        </p>
                        <button
                            onClick={login}
                            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]"
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
            <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-20 bg-slate-950/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            SplitChain
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/create"
                            className="hidden sm:block px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors"
                        >
                            + New Group
                        </Link>
                        <div className="hidden sm:block px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs font-mono text-indigo-300">
                            {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">My Groups</h1>
                        <p className="text-gray-400">
                            Manage your shared groups and track balances
                        </p>
                    </div>
                    {/* Mobile Create Button */}
                    <Link
                        href="/create"
                        className="md:hidden w-full text-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold"
                    >
                        + Create New Group
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : groups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group) => {
                            const hasPendingSettlements = group.settlements?.some(s => s.status === 'pending' || s.status === 'processing');
                            const balance = userAddress ? calculateBalance(group, userAddress) : 0;
                            const isOwed = balance > 0.01;
                            const isOwing = balance < -0.01;

                            return (
                                <Link
                                    href={`/group/${group.id}`}
                                    key={group.id}
                                    className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </div>

                                    <div className="mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-2xl">💸</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                                            {group.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Created {new Date(group.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Total Expenses</span>
                                            <span className="text-white font-medium">
                                                {group.expenses?.length || 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Your Balance</span>
                                            <span className={`font-medium ${isOwed ? 'text-green-400' : isOwing ? 'text-red-400' : 'text-gray-400'}`}>
                                                {!isOwed && !isOwing ? 'Settled' : `${isOwed ? '+' : '-'}$${Math.abs(balance).toFixed(2)}`}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Participants</span>
                                            <div className="flex items-center -space-x-2">
                                                {group.participants?.slice(0, 3).map((p, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs text-white"
                                                        title={p.address}
                                                    >
                                                        {p.ensName ? p.ensName.charAt(0).toUpperCase() : '👤'}
                                                    </div>
                                                ))}
                                                {group.participants && group.participants.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs text-gray-400">
                                                        +{group.participants.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {hasPendingSettlements && (
                                            <div className="pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span>Active Settlement</span>
                                                    <span className="flex items-center gap-1 text-yellow-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                                        Pending
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl border-dashed">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl opacity-50">👥</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Groups Found</h3>
                        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                            You haven't joined any groups yet. Create one to start splitting expenses!
                        </p>
                        <Link
                            href="/create"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
                        >
                            <span>+</span> Create Group
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
