'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { firebaseService } from '@/lib/firebase/database';
import { GroupSession } from '@/types';
import logo from '@/app/assets/logo-splitchain.png';

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
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#822ca7] border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014] relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/15 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#a855f7]/10 blur-[120px]" />
                </div>
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: 'linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 70%)',
                    }}
                />

                <div className="relative font-comfortaa z-10 max-w-md w-full mx-4 text-center animate-reveal">
                    <div className="p-10 rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#822ca7]/15 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connect Your Wallet</h2>
                        <p className="text-gray-500 text-sm mb-8">
                            Connect your wallet to view your active groups and expenses
                        </p>
                        <button
                            onClick={login}
                            className="w-full cursor-pointer px-6 py-4 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(130,44,167,0.4)]"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes reveal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-reveal { animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030014] text-white font-comfortaa relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/15 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-[#a855f7]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Grid */}
            <div
                className="absolute inset-0 z-0 opacity-[0.08]"
                style={{
                    backgroundImage: 'linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 70%)',
                }}
            />

            {/* Vertical light beam */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-screen bg-gradient-to-b from-transparent via-[#822ca7]/40 to-transparent opacity-20 z-0" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
                        <div className="w-24 h-16 relative">
                            <Image src={logo} alt="SplitChain" fill className="object-contain" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/create"
                            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(130,44,167,0.4)]"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14m-7-7h14" /></svg>
                            New Group
                        </Link>
                        {userAddress && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-mono text-[#c084fc]">
                                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
                {/* Page title */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-reveal">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#822ca7]/30 bg-[#822ca7]/10 text-[#c084fc] text-xs font-medium mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                            </span>
                            Dashboard
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                            My <span className="bg-gradient-to-r from-[#822ca7] via-[#c084fc] to-[#822ca7] bg-clip-text text-transparent animate-gradient-x">Groups</span>
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Manage your shared groups and track balances
                        </p>
                    </div>
                    {/* Mobile Create Button */}
                    <Link
                        href="/create"
                        className="md:hidden w-full text-center px-6 py-4 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white font-bold transition-all hover:scale-[1.02]"
                    >
                        + Create New Group
                    </Link>
                </div>

                {/* Summary stats */}
                {!loading && groups.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-10 animate-reveal-delayed">
                        {[
                            { label: 'Active Groups', value: groups.length.toString(), icon: '📂' },
                            {
                                label: 'Total Expenses',
                                value: groups.reduce((sum, g) => sum + (g.expenses?.length || 0), 0).toString(),
                                icon: '📊'
                            },
                            {
                                label: 'Participants',
                                value: new Set(groups.flatMap(g => g.participants?.map(p => p.address.toLowerCase()) || [])).size.toString(),
                                icon: '👥'
                            },
                        ].map((s, i) => (
                            <div key={i} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm text-center">
                                <div className="text-2xl mb-2">{s.icon}</div>
                                <div className="text-2xl font-black text-white">{s.value}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-72 rounded-[2rem] border border-white/5 bg-white/[0.02] animate-pulse" />
                        ))}
                    </div>
                ) : groups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group, idx) => {
                            const hasPendingSettlements = group.settlements?.some(s => s.status === 'pending' || s.status === 'processing');
                            const balance = userAddress ? calculateBalance(group, userAddress) : 0;
                            const isOwed = balance > 0.01;
                            const isOwing = balance < -0.01;

                            return (
                                <Link
                                    href={`/group/${group.id}`}
                                    key={group.id}
                                    className="group relative p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-[#822ca7]/30 hover:shadow-[0_0_40px_rgba(130,44,167,0.1)] animate-reveal"
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    {/* Hover glow */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#822ca7]/0 to-transparent transition-all duration-500 group-hover:via-[#822ca7]/50" />
                                    <div className="absolute top-6 left-6 w-20 h-20 bg-purple-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Arrow icon */}
                                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                                        <svg className="w-5 h-5 text-[#822ca7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="mb-5">
                                            <div className="w-12 h-12 rounded-2xl bg-[#822ca7]/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#822ca7]/20 group-hover:shadow-[0_0_20px_rgba(130,44,167,0.2)]">
                                                <span className="text-xl">💸</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-[#c084fc] transition-colors duration-300">
                                                {group.name}
                                            </h3>
                                            <p className="text-xs text-gray-600">
                                                Created {new Date(group.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Expenses</span>
                                                <span className="text-white font-semibold">
                                                    {group.expenses?.length || 0}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Your Balance</span>
                                                <span className={`font-bold ${isOwed ? 'text-green-400' : isOwing ? 'text-red-400' : 'text-gray-500'}`}>
                                                    {!isOwed && !isOwing ? 'Settled' : `${isOwed ? '+' : '-'}$${Math.abs(balance).toFixed(2)}`}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Members</span>
                                                <div className="flex items-center -space-x-2">
                                                    {group.participants?.slice(0, 3).map((p, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-7 h-7 rounded-full bg-[#822ca7]/20 border-2 border-[#030014] flex items-center justify-center text-[10px] text-[#c084fc] font-bold"
                                                            title={p.address}
                                                        >
                                                            {p.ensName ? p.ensName.charAt(0).toUpperCase() : '👤'}
                                                        </div>
                                                    ))}
                                                    {group.participants && group.participants.length > 3 && (
                                                        <div className="w-7 h-7 rounded-full bg-white/5 border-2 border-[#030014] flex items-center justify-center text-[10px] text-gray-500">
                                                            +{group.participants.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {hasPendingSettlements && (
                                                <div className="pt-3 border-t border-white/5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-600">Settlement</span>
                                                        <span className="flex items-center gap-1.5 text-amber-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                            Pending
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom accent line */}
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-24 rounded-3xl border border-white/5 border-dashed bg-white/[0.02] animate-reveal">
                        <div className="w-20 h-20 rounded-full bg-[#822ca7]/10 flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl opacity-60">👥</span>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">No Groups Found</h3>
                        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
                            You haven&apos;t joined any groups yet. Create one to start splitting expenses!
                        </p>
                        <Link
                            href="/create"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(130,44,167,0.4)]"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14m-7-7h14" /></svg>
                            Create Group
                        </Link>
                    </div>
                )}
            </main>

            <footer className="relative z-10 border-t border-white/5 py-10 bg-black/30 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-600 text-xs">&copy; 2026 SplitChain. Built for HackMoney.</p>
                    <div className="flex gap-8 text-gray-600 text-xs">
                        <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Security</span>
                        <span className="hover:text-white transition-colors cursor-pointer">GitHub</span>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                @keyframes reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-reveal { animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-reveal-delayed { opacity: 0; animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards; }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 15s ease infinite;
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
}
