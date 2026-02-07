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
            // Check if current toChain is in the available list
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
                fromAmount: Math.floor(debt.amount * 1000000).toString(), // Convert to USDC decimals (6)
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
            // Check if user has a wallet connected
            if (typeof window === 'undefined' || !(window as any).ethereum) {
                setError('⚠️ Please connect your wallet (MetaMask or similar) to execute the settlement.');
                setIsLoading(false);
                return;
            }

            console.log('🔐 Wallet connected, executing settlement...');

            // Use viem to create a wallet client
            const { createWalletClient, custom, parseAbi } = await import('viem');
            const { mainnet, polygon, arbitrum, optimism, bsc } = await import('viem/chains');

            // Helper to get viem chain object
            const getViemChain = (chainId: number) => {
                switch (chainId) {
                    case 1: return mainnet;
                    case 137: return polygon;
                    case 42161: return arbitrum;
                    case 10: return optimism;
                    case 56: return bsc;
                    default: return mainnet; // Fallback
                }
            };

            const tempClient = createWalletClient({
                chain: getViemChain(fromChain),
                transport: custom((window as any).ethereum)
            });

            // Get the address to ensure we have permission
            const [address] = await tempClient.requestAddresses();

            if (!address) {
                throw new Error('No account found');
            }

            // Create client with account
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

            // Better error messages
            if (err.code === 'ACTION_REJECTED') {
                setError('❌ Transaction rejected by user');
            } else if (err.message?.includes('insufficient funds')) {
                setError('❌ Insufficient funds for gas fees');
            } else if (err.message?.includes('user rejected')) {
                setError('❌ Transaction cancelled');
            } else {
                setError(err.message || 'Failed to settle debt. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Settle Debt</h2>
                            <p className="text-gray-400 mt-1">
                                Pay {formatCurrency(debt.amount)} to {formatAddress(debt.to)}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* From Chain Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            From Chain (Your Payment Source)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {chains.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => setFromChain(chain.id)}
                                    className={`p-4 rounded-xl border-2 transition-all ${fromChain === chain.id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{chain.icon}</div>
                                    <div className="text-xs font-medium text-white">{chain.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex justify-center">
                        <div className="text-3xl text-indigo-400">↓</div>
                    </div>

                    {/* To Chain Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            To Chain (Recipient Receives On)
                            {preferredChains && preferredChains.length > 0 && (
                                <span className="ml-2 text-xs text-indigo-400 font-normal">
                                    (Restricted to recipient's preference)
                                </span>
                            )}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {availableToChains.map((chain) => (
                                <button
                                    key={chain.id}
                                    onClick={() => setToChain(chain.id)}
                                    className={`p-4 rounded-xl border-2 transition-all ${toChain === chain.id
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{chain.icon}</div>
                                    <div className="text-xs font-medium text-white">{chain.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Route Summary */}
                    {fromChain && toChain && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Route:</span>
                                <span className="text-white font-medium">
                                    {chains.find(c => c.id === fromChain)?.name} → {chains.find(c => c.id === toChain)?.name}
                                </span>
                            </div>
                            {fromChain === toChain && (
                                <div className="mt-2 text-xs text-green-400">
                                    ✅ Same chain selected - performing direct transfer
                                </div>
                            )}
                        </div>
                    )}

                    {/* Get Routes Button */}
                    {!routes.length && (
                        <button
                            onClick={handleGetRoutes}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Finding Best Route...
                                </span>
                            ) : (
                                'Find Settlement Route'
                            )}
                        </button>
                    )}

                    {/* Routes Display */}
                    {routes.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Available Routes</h3>
                            {routes.map((route, index) => (
                                <div
                                    key={route.id}
                                    onClick={() => setSelectedRoute(route)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRoute?.id === route.id
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white font-medium">
                                            {(route as any).isDirect ? 'Direct Transfer' : `Route ${index + 1}`}
                                        </span>
                                        <span className="text-green-400 font-bold">
                                            {formatCurrency(parseFloat(route.toAmount) / 1000000)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-400">Estimated Time</div>
                                            <div className="text-white">{Math.ceil(route.estimatedTime / 60)}min</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400">Gas Cost</div>
                                            <div className="text-white">
                                                ${(parseFloat(route.estimatedGas) / 1e18 * 2000).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Settle Button */}
                    {selectedRoute && (
                        <button
                            onClick={handleSettle}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing Settlement...
                                </span>
                            ) : (
                                `Settle ${formatCurrency(debt.amount)} via ${selectedRoute.id === 'direct-transfer' ? 'Direct Transfer' : 'LI.FI'}`
                            )}
                        </button>
                    )}

                    {/* Info */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-400 mt-0.5">ℹ️</div>
                            <div className="text-sm text-blue-300">
                                <p className="font-medium mb-1">Powered by LI.FI</p>
                                <p className="text-blue-400">
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
