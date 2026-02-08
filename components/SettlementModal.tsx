'use client';

import { useState, useEffect } from 'react';
import { lifiService } from '@/lib/lifi/service';
import { formatCurrency, formatAddress } from '@/lib/utils/helpers';
import { MAINNET_CHAINS } from '@/lib/config/chains';

interface SettlementModalProps {
    debt: {
        from: string;
        to: string;
        amount: number;
        currency: string;
    };
    onClose: () => void;
    onSettle: (txHash: string) => void;
    preferredChains?: number[];
}

export default function SettlementModal({ debt, onClose, onSettle, preferredChains }: SettlementModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [fromChain, setFromChain] = useState(1); // Ethereum default
    const [toChain, setToChain] = useState(42161); // Arbitrum default
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const chains = MAINNET_CHAINS;

    // Filter available destination chains based on user preferences
    const availableToChains = (preferredChains && preferredChains.length > 0)
        ? chains.filter(c => preferredChains.includes(c.id))
        : chains;

    // Ensure selected toChain is valid for the current preferences
    useEffect(() => {
        if (availableToChains.length > 0) {
            const isValid = availableToChains.some(c => c.id === toChain);
            if (!isValid) {
                setToChain(availableToChains[0].id);
            }
        }
    }, [availableToChains, toChain, preferredChains]);

    const handleGetRoutes = async () => {
        setIsLoading(true);
        setError(null);
        setRoutes([]);
        setSelectedRoute(null);

        try {
            const fromChainData = chains.find(c => c.id === fromChain);
            const toChainData = chains.find(c => c.id === toChain);

            if (!fromChainData || !toChainData) {
                setError('Invalid chain selection');
                setIsLoading(false);
                return;
            }

            // Handle Same Chain (Direct Transfer)
            if (fromChain === toChain) {
                console.log('🔄 Same chain detected, setting up direct transfer');
                const amountInUnits = Math.floor(debt.amount * 1000000).toString(); // USDC 6 decimals

                const directRoute = {
                    id: 'direct-transfer',
                    fromChainId: fromChain,
                    toChainId: toChain,
                    fromAmount: amountInUnits,
                    toAmount: amountInUnits,
                    estimatedTime: 15, // ~15 seconds
                    estimatedGas: '100000000000000', // Dummy gas value
                    isDirect: true
                };

                setRoutes([directRoute]);
                setSelectedRoute(directRoute);
                setIsLoading(false);
                return;
            }

            const routeRequest = {
                fromChain: fromChain,
                toChain: toChain,
                fromToken: fromChainData.usdc,
                toToken: toChainData.usdc,
                fromAmount: Math.floor(debt.amount * 1000000).toString(),
                fromAddress: debt.from,
                toAddress: debt.to,
            };

            console.log('📨 Requesting routes:', routeRequest);

            const foundRoutes = await lifiService.getSettlementRoutes(routeRequest);
            setRoutes(foundRoutes);

            if (foundRoutes.length > 0) {
                setSelectedRoute(foundRoutes[0]);
            } else {
                setError('No routes found. Try different chains or check if you have sufficient balance.');
            }
        } catch (err: any) {
            console.error('Error getting routes:', err);
            setError(err.message || 'Failed to get routes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettle = async () => {
        if (!selectedRoute) return;

        setIsLoading(true);
        setError(null);

        try {
            if (typeof window === 'undefined' || !(window as any).ethereum) {
                setError('Please connect your wallet (MetaMask or similar) to execute the settlement.');
                setIsLoading(false);
                return;
            }

            console.log('🔐 Wallet connected, executing settlement...');

            const { createWalletClient, custom, parseAbi } = await import('viem');
            const { mainnet, polygon, arbitrum, optimism, bsc } = await import('viem/chains');

            const getViemChain = (chainId: number) => {
                switch (chainId) {
                    case 1: return mainnet;
                    case 137: return polygon;
                    case 42161: return arbitrum;
                    case 10: return optimism;
                    case 56: return bsc;
                    default: return mainnet;
                }
            };

            const tempClient = createWalletClient({
                chain: getViemChain(fromChain),
                transport: custom((window as any).ethereum)
            });

            const [address] = await tempClient.requestAddresses();

            if (!address) {
                throw new Error('No account found');
            }

            const client = createWalletClient({
                account: address,
                chain: getViemChain(fromChain),
                transport: custom((window as any).ethereum)
            });

            // Handle Direct Transfer
            if (selectedRoute.id === 'direct-transfer') {
                const tokenAddress = chains.find(c => c.id === fromChain)?.usdc;
                if (!tokenAddress) throw new Error("USDC address not found for this chain");

                console.log('💸 Executing direct transfer:', {
                    token: tokenAddress,
                    to: debt.to,
                    amount: selectedRoute.fromAmount
                });

                const hash = await client.writeContract({
                    address: tokenAddress as `0x${string}`,
                    abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
                    functionName: 'transfer',
                    args: [debt.to as `0x${string}`, BigInt(selectedRoute.fromAmount)],
                    chain: getViemChain(fromChain),
                    account: address
                });

                console.log('✅ Direct transfer successful! Tx:', hash);
                onSettle(hash);
                onClose();
                return;
            }

            // Handle LI.FI Settlement
            console.log('📋 Executing LI.FI Route:', selectedRoute);
            const txHash = await lifiService.executeSettlement(
                selectedRoute,
                client,
                (update) => {
                    console.log('📊 Settlement progress:', update);
                }
            );

            console.log('✅ Settlement successful! Tx:', txHash);
            onSettle(txHash);
            onClose();
        } catch (err: any) {
            console.error('Error settling:', err);

            if (err.code === 'ACTION_REJECTED') {
                setError('Transaction rejected by user');
            } else if (err.message?.includes('insufficient funds')) {
                setError('Insufficient funds for gas fees');
            } else if (err.message?.includes('user rejected')) {
                setError('Transaction cancelled');
            } else {
                setError(err.message || 'Failed to settle debt. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0518] border border-white/[0.08] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-[#822ca7]/10">

                {/* Header */}
                <div className="p-6 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#822ca7]/30">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Settle Debt</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Pay <span className="text-[#c084fc] font-semibold">{formatCurrency(debt.amount)}</span> to <span className="text-gray-400 font-mono text-xs">{formatAddress(debt.to)}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* From Chain Selection */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500 mb-3">
                            From Chain (Your Payment Source)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {chains.map((chain) => {
                                const isSelected = fromChain === chain.id;
                                return (
                                    <button
                                        key={chain.id}
                                        onClick={() => setFromChain(chain.id)}
                                        className={`group relative p-3.5 rounded-xl border text-center transition-all duration-300 cursor-pointer overflow-hidden ${isSelected
                                            ? 'border-[#822ca7]/40 bg-[#822ca7]/15 text-white'
                                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-gray-500'
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#822ca7]/60 to-transparent" />
                                        )}
                                        <div className={`text-2xl mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                                            {chain.icon}
                                        </div>
                                        <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                            {chain.name}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#822ca7] shadow-[0_0_8px_rgba(130,44,167,0.6)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#a855f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                    </div>

                    {/* To Chain Selection */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500 mb-3">
                            To Chain (Recipient Receives On)
                            {preferredChains && preferredChains.length > 0 && (
                                <span className="ml-2 text-[#c084fc] normal-case tracking-normal">
                                    — Restricted to recipient's preference
                                </span>
                            )}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {availableToChains.map((chain) => {
                                const isSelected = toChain === chain.id;
                                return (
                                    <button
                                        key={chain.id}
                                        onClick={() => setToChain(chain.id)}
                                        className={`group relative p-3.5 rounded-xl border text-center transition-all duration-300 cursor-pointer overflow-hidden ${isSelected
                                            ? 'border-[#a855f7]/40 bg-[#a855f7]/15 text-white'
                                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-gray-500'
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#a855f7]/60 to-transparent" />
                                        )}
                                        <div className={`text-2xl mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                                            {chain.icon}
                                        </div>
                                        <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                            {chain.name}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Route Summary */}
                    {fromChain && toChain && (
                        <div className="p-4 bg-[#822ca7]/[0.08] border border-[#822ca7]/15 rounded-xl">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Route</span>
                                <span className="text-white font-semibold text-sm">
                                    {chains.find(c => c.id === fromChain)?.name}
                                    <span className="text-[#a855f7] mx-2">→</span>
                                    {chains.find(c => c.id === toChain)?.name}
                                </span>
                            </div>
                            {fromChain === toChain && (
                                <div className="mt-2.5 flex items-center gap-2 text-xs text-[#c084fc]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                                    Same chain selected — performing direct transfer
                                </div>
                            )}
                        </div>
                    )}

                    {/* Get Routes Button */}
                    {!routes.length && (
                        <button
                            onClick={handleGetRoutes}
                            disabled={isLoading}
                            className="w-full py-3.5 px-4 bg-gradient-to-br from-[#822ca7] to-[#a855f7] hover:shadow-lg hover:shadow-[#822ca7]/25 hover:scale-[1.02] disabled:from-gray-700 disabled:to-gray-600 disabled:hover:shadow-none disabled:hover:scale-100 text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2.5">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Finding Best Route...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Find Settlement Route
                                </span>
                            )}
                        </button>
                    )}

                    {/* Routes Display */}
                    {routes.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-500">Available Routes</h3>
                            {routes.map((route, index) => {
                                const isSelected = selectedRoute?.id === route.id;
                                return (
                                    <div
                                        key={route.id}
                                        onClick={() => setSelectedRoute(route)}
                                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${isSelected
                                            ? 'border-[#822ca7]/40 bg-[#822ca7]/10'
                                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#822ca7]/60 to-transparent" />
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-white font-semibold text-sm">
                                                {(route as any).isDirect ? 'Direct Transfer' : `Route ${index + 1}`}
                                            </span>
                                            <span className="text-[#c084fc] font-bold text-sm">
                                                {formatCurrency(parseFloat(route.toAmount) / 1000000)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-0.5">Estimated Time</div>
                                                <div className="text-gray-300 font-medium">{Math.ceil(route.estimatedTime / 60)}min</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-0.5">Gas Cost</div>
                                                <div className="text-gray-300 font-medium">
                                                    ${(parseFloat(route.estimatedGas) / 1e18 * 2000).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#822ca7] shadow-[0_0_8px_rgba(130,44,167,0.6)]" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 bg-red-500/[0.08] border border-red-500/20 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Settle Button */}
                    {selectedRoute && (
                        <button
                            onClick={handleSettle}
                            disabled={isLoading}
                            className="w-full py-3.5 px-4 bg-gradient-to-br from-[#822ca7] to-[#a855f7] hover:shadow-lg hover:shadow-[#822ca7]/25 hover:scale-[1.02] disabled:from-gray-700 disabled:to-gray-600 disabled:hover:shadow-none disabled:hover:scale-100 text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2.5">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing Settlement...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    {`Settle ${formatCurrency(debt.amount)} via ${selectedRoute.id === 'direct-transfer' ? 'Direct Transfer' : 'LI.FI'}`}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Info Box */}
                    <div className="p-4 bg-[#822ca7]/[0.06] border border-[#822ca7]/10 rounded-xl">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-[#a855f7] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold text-[#c084fc] mb-1">Powered by LI.FI</p>
                                <p className="text-gray-500 leading-relaxed">
                                    LI.FI automatically finds the best route across 20+ chains and 30+ bridges to settle your debt with minimal fees and fastest execution.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
