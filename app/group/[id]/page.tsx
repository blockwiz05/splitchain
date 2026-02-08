'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { yellowService } from '@/lib/yellow/service';
import { useAppStore } from '@/lib/store';
import { formatAddress, formatCurrency, formatDate, calculateBalances, simplifyDebts } from '@/lib/utils/helpers';
import { firebaseService } from '@/lib/firebase/database';
import SettlementModal from '@/components/SettlementModal';
import Link from 'next/link';
import Image from 'next/image';
import { createPublicClient, http, isAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import logo from '@/app/assets/logo-splitchain.png';

// Helper function to get block explorer URL
function getExplorerUrl(txHash: string, chainId?: number): string | null {
    const explorers: { [key: number]: string } = {
        1: 'https://etherscan.io/tx/',
        11155111: 'https://sepolia.etherscan.io/tx/',
        137: 'https://polygonscan.com/tx/',
        80002: 'https://mumbai.polygonscan.com/tx/',
        42161: 'https://arbiscan.io/tx/',
        421614: 'https://sepolia.arbiscan.io/tx/',
        10: 'https://optimistic.etherscan.io/tx/',
        11155420: 'https://sepolia-optimism.etherscan.io/tx/',
        56: 'https://bscscan.com/tx/',
    };

    if (chainId && explorers[chainId]) {
        return explorers[chainId] + txHash;
    }

    return null;
}


export default function GroupDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const { ready, authenticated, user, login } = usePrivy();
    const { currentGroup, expenses, addExpense, balances, updateBalances, setCurrentGroup } = useAppStore();

    const sessionId = params.id as string;
    const [isLoading, setIsLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettlement, setShowSettlement] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<any>(null);
    const [newExpense, setNewExpense] = useState({
        amount: '',
        description: '',
    });

    // Add Member State
    const [showAddMember, setShowAddMember] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [newMemberInput, setNewMemberInput] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [addMemberError, setAddMemberError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [settlementSuccess, setSettlementSuccess] = useState<{
        amount: number;
        from: string;
        to: string;
        txHash: string;
        chainId?: number;
    } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        showToast('Address copied to clipboard!');
    };

    // Load group data on mount (fixes refresh issue)
    useEffect(() => {
        if (!sessionId) return;

        const loadGroup = async () => {
            console.log('📥 Loading group on mount:', sessionId);
            const group = await firebaseService.getGroup(sessionId);
            if (group) {
                console.log('✅ Group loaded:', group);
                setCurrentGroup(group);
            } else {
                console.warn('⚠️ Group not found:', sessionId);
            }
        };

        loadGroup();
    }, [sessionId, setCurrentGroup]);

    // Subscribe to Firebase for real-time group updates
    useEffect(() => {
        if (!sessionId) return;

        console.log('📡 Subscribing to Firebase group updates:', sessionId);

        const unsubscribeFirebase = firebaseService.subscribeToGroup(sessionId, (group) => {
            if (group) {
                console.log('🔔 Group updated from Firebase:', group);
                setCurrentGroup(group);
            }
        });

        setIsLoading(false);

        return () => {
            console.log('🔇 Unsubscribing from Firebase');
            unsubscribeFirebase();
        };
    }, [sessionId, setCurrentGroup]);

    // Subscribe to Yellow Network updates
    useEffect(() => {
        if (!sessionId) return;

        console.log('📡 Subscribing to Yellow Network session:', sessionId);

        const unsubscribe = yellowService.subscribeToSession(sessionId, (update) => {
            console.log('🔔 Received update from Yellow Network:', update);

            // Handle different types of updates
            if (update.type === 'expense') {
                // Add expense to local state
                console.log('💸 New expense received:', update.metadata);
            } else if (update.type === 'payment') {
                console.log('💰 Payment received:', update);
            }
        });

        return () => {
            console.log('🔇 Unsubscribing from Yellow Network');
            unsubscribe();
        };
    }, [sessionId]);

    // Calculate balances when expenses or settlements change
    useEffect(() => {
        if (currentGroup && currentGroup.expenses && currentGroup.expenses.length > 0) {
            const participantAddresses = currentGroup.participants.map(p => p.address);
            const calculatedBalances = calculateBalances(
                currentGroup.expenses,
                participantAddresses,
                currentGroup.settlements
            );

            const balanceArray = Object.entries(calculatedBalances).map(([address, amount]) => ({
                address,
                ensName: currentGroup.participants.find(p => p.address === address)?.ensName,
                netAmount: amount,
                currency: 'USDC',
            }));

            updateBalances(balanceArray);
        }
    }, [currentGroup, currentGroup?.expenses, currentGroup?.settlements, updateBalances]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authenticated || !user) {
            login();
            return;
        }

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

        if (!userAddress) return;

        const expense = {
            id: `exp-${Date.now()}`,
            amount: parseFloat(newExpense.amount),
            description: newExpense.description,
            paidBy: userAddress,
            paidByEns: undefined,
            splitAmong: currentGroup?.participants.map(p => p.address) || [userAddress],
            timestamp: Date.now(),
            currency: 'USDC',
        };

        try {
            // Add to local state
            addExpense(expense);

            // Save to Firebase (for cross-browser sync)
            await firebaseService.addExpense(sessionId, expense);

            // Send to Yellow Network
            const messageSigner = async (message: string) => {
                return `signature-${Date.now()}`;
            };

            await yellowService.addExpense(sessionId, expense, messageSigner);

            // Reset form
            setNewExpense({ amount: '', description: '' });
            setShowAddExpense(false);

            console.log('✅ Expense added successfully');
            showToast('Expense added successfully!');
        } catch (error) {
            console.error('Error adding expense:', error);
            showToast('Failed to add expense', 'error');
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddMemberError(null);
        setIsAddingMember(true);

        try {
            const input = newMemberInput.trim();
            if (!input) {
                throw new Error('Please enter an address or ENS name');
            }

            let resolvedAddress = '';
            let ensName: string | undefined = undefined;

            // Initialize Viem Client for Mainnet (ENS)
            const publicClient = createPublicClient({
                chain: mainnet,
                transport: http()
            });

            if (isAddress(input)) {
                resolvedAddress = input;
                // Try to reverse resolve ENS (optional but nice)
                try {
                    const name = await publicClient.getEnsName({ address: input });
                    if (name) ensName = name;
                } catch (err) {
                    console.warn('Could not reverse resolve ENS', err);
                }
            } else if (input.endsWith('.eth')) {
                const address = await publicClient.getEnsAddress({
                    name: normalize(input),
                });
                if (address) {
                    resolvedAddress = address;
                    ensName = input;
                } else {
                    throw new Error('ENS name could not be resolved');
                }
            } else {
                throw new Error('Invalid Ethereum address or ENS name');
            }

            // Check if already in group
            const exists = currentGroup?.participants.some(
                p => p.address.toLowerCase() === resolvedAddress.toLowerCase()
            );

            if (exists) {
                throw new Error('This user is already in the group');
            }

            // Create new participant object
            const newParticipant = {
                address: resolvedAddress,
                ensName: ensName,
            };

            // Add to Firebase
            await firebaseService.addParticipant(sessionId, newParticipant);

            // Close modal and reset
            setShowAddMember(false);
            setNewMemberInput('');
            console.log('✅ Member added successfully:', newParticipant);
            showToast('Member added successfully!');

        } catch (err: any) {
            console.error('Error adding member:', err);
            setAddMemberError(err.message || 'Failed to add member');
            showToast(err.message || 'Failed to add member', 'error');
        } finally {
            setIsAddingMember(false);
        }
    };

    if (!ready || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-[#822ca7] border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Loading group...</span>
                </div>
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
                            You need to connect your wallet to view this group
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

    const userAddress = (user as any)?.wallet?.address;
    const groupName = sessionId.replace('splitchain-', '').replace('-v1', '');
    const simplifiedDebts = balances.length > 0 ? simplifyDebts(
        balances.reduce((acc, b) => ({ ...acc, [b.address]: b.netAmount }), {})
    ) : [];

    return (
        <div className="min-h-screen bg-[#030014] text-white font-comfortaa relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/15 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-[#a855f7]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
            <div
                className="absolute inset-0 z-0 opacity-[0.08]"
                style={{
                    backgroundImage: 'linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 70%)',
                }}
            />
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
                        <Link href="/dashboard" className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                            Dashboard
                        </Link>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-xs font-mono text-[#c084fc]">
                            {formatAddress(userAddress)}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/15">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-green-400 font-medium tracking-wide">Yellow Network</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">
                {/* Group Header */}
                <div className="mb-8 animate-reveal">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{groupName}</h1>
                            <p className="text-gray-400">Session ID: {sessionId}</p>
                        </div>
                        <div className="flex gap-3">
                            {/* View Participants Button */}
                            <button
                                onClick={() => setShowParticipants(true)}
                                className="cursor-pointer px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-white transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] flex items-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                Members ({currentGroup?.participants.length})
                            </button>

                            {userAddress && currentGroup?.createdBy === userAddress && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="cursor-pointer px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold text-white transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] flex items-center gap-2"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14m-7-7h14" /></svg>
                                    Add Member
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddExpense(true)}
                                className="cursor-pointer px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-sm font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(130,44,167,0.4)] flex items-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14m-7-7h14" /></svg>
                                Add Expense
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-reveal-delayed">
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2">Total Expenses</div>
                            <div className="text-2xl font-black text-white">
                                {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2">Participants</div>
                            <div className="text-2xl font-black text-white">
                                {currentGroup?.participants.length || 1}
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2">Your Balance</div>
                            <div className={`text-2xl font-black ${(balances.find(b => b.address === userAddress)?.netAmount || 0) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                                }`}>
                                {formatCurrency(balances.find(b => b.address === userAddress)?.netAmount || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Expenses List */}
                    <div className="animate-reveal-delayed">
                        <h2 className="text-xl font-black text-white mb-4 tracking-tight">Expenses</h2>
                        <div className="space-y-3">
                            {(!currentGroup?.expenses || currentGroup.expenses.length === 0) ? (
                                <div className="p-10 rounded-[2rem] border border-white/5 border-dashed bg-white/[0.02] text-center">
                                    <div className="w-14 h-14 rounded-full bg-[#822ca7]/10 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl opacity-60">📝</span>
                                    </div>
                                    <p className="text-gray-400 text-sm font-semibold">No expenses yet</p>
                                    <p className="text-xs text-gray-600 mt-1">Click &quot;Add Expense&quot; to get started</p>
                                </div>
                            ) : (
                                currentGroup.expenses.map((expense, idx) => (
                                    <div
                                        key={expense.id}
                                        className="group p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#822ca7]/20 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-semibold text-white text-sm">{expense.description}</div>
                                            <div className="text-base font-black text-[#c084fc]">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="text-gray-500">
                                                Paid by <span className="text-gray-400 font-mono">{formatAddress(expense.paidBy)}</span>
                                            </div>
                                            <div className="text-gray-600">
                                                {formatDate(expense.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Balances & Settlement */}
                    <div className="animate-reveal-more-delayed">
                        <h2 className="text-xl font-black text-white mb-4 tracking-tight">Balances</h2>
                        <div className="space-y-3 mb-6">
                            {balances.length === 0 ? (
                                <div className="p-10 rounded-[2rem] border border-white/5 border-dashed bg-white/[0.02] text-center">
                                    <div className="w-14 h-14 rounded-full bg-[#822ca7]/10 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl opacity-60">💰</span>
                                    </div>
                                    <p className="text-gray-400 text-sm font-semibold">No balances to show</p>
                                </div>
                            ) : (
                                balances.map((balance) => (
                                    <div
                                        key={balance.address}
                                        className="p-4 rounded-xl border border-white/5 bg-white/[0.03]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-white font-medium">
                                                {balance.ensName || formatAddress(balance.address)}
                                                {balance.address === userAddress && (
                                                    <span className="ml-2 text-[10px] text-[#c084fc] font-bold uppercase tracking-wide">You</span>
                                                )}
                                            </div>
                                            <div className={`font-black text-sm ${balance.netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {balance.netAmount >= 0 ? '+' : ''}
                                                {formatCurrency(balance.netAmount)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Simplified Settlements */}
                        {simplifiedDebts.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-white mb-3 tracking-tight">Suggested Settlements</h3>
                                <div className="space-y-3">
                                    {simplifiedDebts.map((debt, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl border border-[#822ca7]/15 bg-[#822ca7]/[0.06]"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-white font-mono font-medium">{formatAddress(debt.from)}</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#822ca7" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                                                    <span className="text-white font-mono font-medium">{formatAddress(debt.to)}</span>
                                                </div>
                                                <span className="text-[#c084fc] font-black text-sm">
                                                    {formatCurrency(debt.amount)}
                                                </span>
                                            </div>
                                            {debt.from.toLowerCase() === userAddress?.toLowerCase() && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedDebt({
                                                            from: debt.from,
                                                            to: debt.to,
                                                            amount: debt.amount,
                                                            currency: 'USDC'
                                                        });
                                                        setShowSettlement(true);
                                                    }}
                                                    className="w-full cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white font-bold text-xs transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(130,44,167,0.4)] flex items-center justify-center gap-2"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                                    Settle with LI.FI
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transaction History */}
                        {currentGroup?.settlements && currentGroup.settlements.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3">Transaction History</h3>
                                <div className="space-y-3">
                                    {[...currentGroup.settlements]
                                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                                        .map((settlement, idx) => {
                                            const explorerUrl = settlement.txHash
                                                ? getExplorerUrl(settlement.txHash, settlement.fromChain)
                                                : null;
                                            return (
                                                <div
                                                    key={settlement.id || idx}
                                                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-white font-medium">
                                                                {formatAddress(settlement.from)}
                                                            </span>
                                                            <span className="text-gray-400">→</span>
                                                            <span className="text-white font-medium">
                                                                {formatAddress(settlement.to)}
                                                            </span>
                                                        </div>
                                                        <span className="text-green-400 font-bold">
                                                            {formatCurrency(settlement.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                                                                settlement.status === 'completed'
                                                                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                                                    : settlement.status === 'pending'
                                                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                                                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                            }`}>
                                                                {settlement.status}
                                                            </span>
                                                            {settlement.txHash && explorerUrl && (
                                                                <a
                                                                    href={explorerUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
                                                                >
                                                                    {settlement.txHash.substring(0, 10)}...
                                                                </a>
                                                            )}
                                                            {settlement.txHash && !explorerUrl && (
                                                                <span className="text-gray-500 font-mono">
                                                                    {settlement.txHash.substring(0, 10)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                        {settlement.timestamp && (
                                                            <span className="text-gray-500">
                                                                {formatDate(settlement.timestamp)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Participants Modal */}
            {showParticipants && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0518] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-reveal">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white tracking-tight">Group Members</h3>
                            <button
                                onClick={() => setShowParticipants(false)}
                                className="cursor-pointer p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {currentGroup?.participants.map((participant) => (
                                <div
                                    key={participant.address}
                                    className="group p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#822ca7] to-[#a855f7] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {participant.ensName ? participant.ensName[0].toUpperCase() : participant.address.slice(2, 4)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white text-sm truncate">
                                                    {participant.ensName || formatAddress(participant.address)}
                                                </span>
                                                {participant.address === userAddress && (
                                                    <span className="px-1.5 py-0.5 bg-[#822ca7]/20 text-[#c084fc] text-[10px] rounded-full font-bold">You</span>
                                                )}
                                                {participant.address === currentGroup.createdBy && (
                                                    <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] rounded-full font-bold">Admin</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-gray-600 truncate font-mono">
                                                {participant.address}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleCopyAddress(participant.address)}
                                        className="cursor-pointer p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Copy Address"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {userAddress && currentGroup?.createdBy === userAddress && (
                            <button
                                onClick={() => {
                                    setShowParticipants(false);
                                    setShowAddMember(true);
                                }}
                                className="cursor-pointer w-full mt-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-bold transition-all hover:bg-white/[0.08] flex items-center justify-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14m-7-7h14" /></svg>
                                Add New Member
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0518] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full animate-reveal">
                        <h3 className="text-xl font-black text-white mb-5 tracking-tight">Add Member</h3>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    Wallet Address or ENS Name
                                </label>
                                <input
                                    type="text"
                                    value={newMemberInput}
                                    onChange={(e) => setNewMemberInput(e.target.value)}
                                    placeholder="0x... or name.eth"
                                    required
                                    className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#822ca7]/50 focus:ring-1 focus:ring-[#822ca7]/30 transition-all duration-300 text-sm"
                                />
                            </div>

                            {addMemberError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/15 rounded-xl text-xs text-red-400">
                                    {addMemberError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddMember(false);
                                        setNewMemberInput('');
                                        setAddMemberError(null);
                                    }}
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-bold transition-all hover:bg-white/[0.08]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAddingMember}
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(130,44,167,0.4)]"
                                >
                                    {isAddingMember ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0518] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full animate-reveal">
                        <h3 className="text-xl font-black text-white mb-5 tracking-tight">Add Expense</h3>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    placeholder="e.g., Dinner at restaurant"
                                    required
                                    className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#822ca7]/50 focus:ring-1 focus:ring-[#822ca7]/30 transition-all duration-300 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Amount (USDC)</label>
                                <input
                                    type="number"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                    className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#822ca7]/50 focus:ring-1 focus:ring-[#822ca7]/30 transition-all duration-300 text-sm"
                                />
                            </div>
                            <div className="p-4 rounded-xl border border-[#822ca7]/15 bg-[#822ca7]/[0.06]">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#822ca7]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-sm">⚡</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-xs mb-0.5">Instant Sync via Yellow Network</div>
                                        <div className="text-[11px] text-gray-500">
                                            This expense will be synced instantly to all participants with zero gas fees
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddExpense(false)}
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-bold transition-all hover:bg-white/[0.08]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white text-sm font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(130,44,167,0.4)]"
                                >
                                    Add Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settlement Modal */}
            {showSettlement && selectedDebt && (
                <SettlementModal
                    debt={selectedDebt}
                    preferredChains={
                        currentGroup?.participants.find(
                            p => p.address.toLowerCase() === selectedDebt.to.toLowerCase()
                        )?.preferredChains
                    }
                    onClose={() => {
                        setShowSettlement(false);
                        setSelectedDebt(null);
                    }}
                    onSettle={async (txHash) => {
                        console.log('💰 Settlement completed:', txHash);

                        try {
                            // Create settlement record
                            const settlement = {
                                id: `settlement-${Date.now()}`,
                                from: selectedDebt.from,
                                to: selectedDebt.to,
                                amount: selectedDebt.amount,
                                currency: selectedDebt.currency,
                                txHash: txHash,
                                timestamp: Date.now(),
                                status: 'completed',
                            };

                            // Save to Firebase
                            await firebaseService.addSettlement(sessionId, settlement);
                            console.log('✅ Settlement saved to Firebase');

                            // Try to send to Yellow Network (optional)
                            try {
                                if (typeof (yellowService as any).recordSettlement === 'function') {
                                    const messageSigner = async (message: string) => {
                                        return `signature-${Date.now()}`;
                                    };
                                    await (yellowService as any).recordSettlement(sessionId, settlement, messageSigner);
                                    console.log('✅ Settlement sent to Yellow Network');
                                }
                            } catch (yellowError) {
                                console.warn('⚠️ Could not send to Yellow Network:', yellowError);
                            }

                            console.log('✅ Settlement recorded successfully');

                            // Show success overlay
                            setSettlementSuccess({
                                amount: selectedDebt.amount,
                                from: selectedDebt.from,
                                to: selectedDebt.to,
                                txHash,
                                chainId: selectedDebt.chainId,
                            });

                            // Close settlement modal
                            setShowSettlement(false);
                            setSelectedDebt(null);
                        } catch (error) {
                            console.error('Error recording settlement:', error);
                            showToast(`Transaction sent but failed to record. Hash: ${txHash.substring(0, 10)}...`, 'error');
                        }
                    }}
                />
            )}
            {/* Settlement Success Overlay */}
            {settlementSuccess && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0518] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full animate-reveal">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white tracking-tight">Settlement Successful!</h3>
                            <button
                                onClick={() => setSettlementSuccess(null)}
                                className="cursor-pointer p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Animated Checkmark */}
                        <div className="w-16 h-16 mx-auto mb-5 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/40">
                            <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path className="animate-checkmark" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <p className="text-gray-400 text-sm text-center mb-5">Your payment has been sent on-chain.</p>

                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Amount</span>
                                <span className="text-white font-bold">{formatCurrency(settlementSuccess.amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">From</span>
                                <span className="text-white font-mono">{formatAddress(settlementSuccess.from)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">To</span>
                                <span className="text-white font-mono">{formatAddress(settlementSuccess.to)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-400">Tx Hash</span>
                                {(() => {
                                    const url = getExplorerUrl(settlementSuccess.txHash, settlementSuccess.chainId);
                                    return url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#c084fc] hover:text-[#a855f7] font-mono transition-colors"
                                        >
                                            {settlementSuccess.txHash.substring(0, 14)}...
                                        </a>
                                    ) : (
                                        <span className="text-white font-mono">{settlementSuccess.txHash.substring(0, 14)}...</span>
                                    );
                                })()}
                            </div>
                        </div>

                        <button
                            onClick={() => setSettlementSuccess(null)}
                            className="cursor-pointer w-full px-4 py-3 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white text-sm font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(130,44,167,0.4)]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-reveal">
                    <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${toast.type === 'success'
                        ? 'bg-[#0a0518]/90 border-green-500/20 text-green-400'
                        : 'bg-[#0a0518]/90 border-red-500/20 text-red-400'
                        }`}>
                        <span className="text-lg">
                            {toast.type === 'success' ? '✅' : '❌'}
                        </span>
                        <span className="font-semibold text-white text-sm">{toast.message}</span>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-reveal { animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-reveal-delayed { opacity: 0; animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards; }
                .animate-reveal-more-delayed { opacity: 0; animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards; }
            `}</style>
        </div>
    );
}
