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

    // Calculate balances when expenses change
    useEffect(() => {
        if (currentGroup && currentGroup.expenses && currentGroup.expenses.length > 0) {
            const participantAddresses = currentGroup.participants.map(p => p.address);
            const calculatedBalances = calculateBalances(currentGroup.expenses, participantAddresses);

            const balanceArray = Object.entries(calculatedBalances).map(([address, amount]) => ({
                address,
                ensName: currentGroup.participants.find(p => p.address === address)?.ensName,
                netAmount: amount,
                currency: 'USDC',
            }));

            updateBalances(balanceArray);
        }
    }, [currentGroup, currentGroup?.expenses, updateBalances]);

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
        } catch (error) {
            console.error('Error adding expense:', error);
        }
    };

    if (!ready || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-white">Loading group...</div>
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
                            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const userAddress = (user as any)?.wallet?.address;
    const groupName = sessionId.replace('splitchain-', '').replace('-v1', '');
    const simplifiedDebts = balances.length > 0 ? simplifyDebts(
        balances.reduce((acc, b) => ({ ...acc, [b.address]: b.netAmount }), {})
    ) : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
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
                        <div className="text-sm text-gray-400">
                            {formatAddress(userAddress)}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-400">Yellow Network</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Group Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{groupName}</h1>
                            <p className="text-gray-400">Session ID: {sessionId}</p>
                        </div>
                        <button
                            onClick={() => setShowAddExpense(true)}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/50"
                        >
                            + Add Expense
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="text-gray-400 text-sm mb-1">Total Expenses</div>
                            <div className="text-3xl font-bold text-white">
                                {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="text-gray-400 text-sm mb-1">Participants</div>
                            <div className="text-3xl font-bold text-white">
                                {currentGroup?.participants.length || 1}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="text-gray-400 text-sm mb-1">Your Balance</div>
                            <div className={`text-3xl font-bold ${(balances.find(b => b.address === userAddress)?.netAmount || 0) >= 0
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
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Expenses</h2>
                        <div className="space-y-3">
                            {(!currentGroup?.expenses || currentGroup.expenses.length === 0) ? (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                                    <span className="text-4xl mb-2 block">📝</span>
                                    <p className="text-gray-400">No expenses yet</p>
                                    <p className="text-sm text-gray-500 mt-1">Click "Add Expense" to get started</p>
                                </div>
                            ) : (
                                currentGroup.expenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-semibold text-white">{expense.description}</div>
                                            <div className="text-lg font-bold text-indigo-400">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="text-gray-400">
                                                Paid by {formatAddress(expense.paidBy)}
                                            </div>
                                            <div className="text-gray-500">
                                                {formatDate(expense.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Balances & Settlement */}
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Balances</h2>
                        <div className="space-y-3 mb-6">
                            {balances.length === 0 ? (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                                    <span className="text-4xl mb-2 block">💰</span>
                                    <p className="text-gray-400">No balances to show</p>
                                </div>
                            ) : (
                                balances.map((balance) => (
                                    <div
                                        key={balance.address}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="text-white">
                                                {balance.ensName || formatAddress(balance.address)}
                                                {balance.address === userAddress && (
                                                    <span className="ml-2 text-xs text-indigo-400">(You)</span>
                                                )}
                                            </div>
                                            <div className={`font-bold ${balance.netAmount >= 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
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
                                <h3 className="text-xl font-bold text-white mb-3">Suggested Settlements</h3>
                                <div className="space-y-3">
                                    {simplifiedDebts.map((debt, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-white font-medium">{formatAddress(debt.from)}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-white font-medium">{formatAddress(debt.to)}</span>
                                                </div>
                                                <span className="text-purple-400 font-bold">
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
                                                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                                                >
                                                    💳 Settle with LI.FI
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-2xl font-bold text-white mb-4">Add Expense</h3>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    placeholder="e.g., Dinner at restaurant"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-sm text-gray-300">
                                <div className="flex items-start gap-2">
                                    <span>⚡</span>
                                    <div>
                                        <div className="font-semibold text-white mb-1">Instant Sync via Yellow Network</div>
                                        <div className="text-xs text-gray-400">
                                            This expense will be synced instantly to all participants with zero gas fees
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddExpense(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all"
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
                                // Continue anyway - Firebase save is more important
                            }

                            console.log('✅ Settlement recorded successfully');

                            // Show success message with transaction link
                            const explorerUrl = getExplorerUrl(txHash, selectedDebt.chainId);
                            alert(
                                `🎉 Settlement successful!\n\n` +
                                `Amount: ${formatCurrency(selectedDebt.amount)}\n` +
                                `From: ${formatAddress(selectedDebt.from)}\n` +
                                `To: ${formatAddress(selectedDebt.to)}\n\n` +
                                `Transaction: ${txHash.substring(0, 10)}...\n\n` +
                                (explorerUrl ? `View on explorer:\n${explorerUrl}` : 'Check your wallet for details')
                            );

                            // Close modal
                            setShowSettlement(false);
                            setSelectedDebt(null);
                        } catch (error) {
                            console.error('Error recording settlement:', error);
                            alert(
                                `⚠️ Transaction completed but failed to record:\n${txHash}\n\n` +
                                `Please save this transaction hash for your records.`
                            );
                        }
                    }}
                />
            )}
        </div>
    );
}
