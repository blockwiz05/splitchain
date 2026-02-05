/**
 * LI.FI SDK Integration
 * 
 * LI.FI provides cross-chain routing and bridging for multi-chain settlements.
 * This module handles route finding, quote generation, and cross-chain transfers.
 * 
 * Documentation: https://docs.li.fi
 */

import { createConfig, executeRoute, getRoutes } from '@lifi/sdk';

interface LifiConfig {
    apiKey?: string;
}

interface RouteRequest {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
}

interface RouteQuote {
    id: string;
    fromChain: number;
    toChain: number;
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    estimatedTime: number;
    steps: any[];
}

class LifiService {
    private config: LifiConfig;

    constructor(config: LifiConfig) {
        this.config = config;

        // Initialize LI.FI SDK
        createConfig({
            apiKey: config.apiKey,
            integrator: 'SplitChain',
        });
    }

    /**
     * Get cross-chain routes for settlement
     */
    async getSettlementRoutes(request: RouteRequest): Promise<RouteQuote[]> {
        try {
            const routes = await getRoutes({
                fromChainId: request.fromChain,
                toChainId: request.toChain,
                fromTokenAddress: request.fromToken,
                toTokenAddress: request.toToken,
                fromAmount: request.fromAmount,
                fromAddress: request.fromAddress,
                toAddress: request.toAddress,
                options: {
                    slippage: 0.03, // 3% slippage
                    order: 'FASTEST', // Prioritize speed
                },
            });

            return routes.routes.map((route: any) => ({
                id: route.id,
                fromChain: route.fromChainId,
                toChain: route.toChainId,
                fromAmount: route.fromAmount,
                toAmount: route.toAmount,
                estimatedGas: route.gasCosts?.[0]?.amount || '0',
                estimatedTime: route.steps.reduce((acc: number, step: any) =>
                    acc + (step.estimate?.executionDuration || 0), 0
                ),
                steps: route.steps,
            }));
        } catch (error) {
            console.error('Error getting LI.FI routes:', error);
            throw error;
        }
    }

    /**
     * Execute cross-chain settlement
     */
    async executeSettlement(
        route: any,
        signer: any,
        onUpdate?: (update: any) => void
    ): Promise<string> {
        try {
            const execution = await executeRoute(route, {
                signer,
                updateCallback: onUpdate,
            });

            // Wait for completion
            await execution.wait();

            return execution.transactionHash || '';
        } catch (error) {
            console.error('Error executing settlement:', error);
            throw error;
        }
    }

    /**
     * Get supported chains
     */
    async getSupportedChains(): Promise<any[]> {
        try {
            // LI.FI supports 20+ chains
            return [
                { id: 1, name: 'Ethereum', nativeCurrency: 'ETH' },
                { id: 137, name: 'Polygon', nativeCurrency: 'MATIC' },
                { id: 42161, name: 'Arbitrum', nativeCurrency: 'ETH' },
                { id: 10, name: 'Optimism', nativeCurrency: 'ETH' },
                { id: 56, name: 'BSC', nativeCurrency: 'BNB' },
                { id: 43114, name: 'Avalanche', nativeCurrency: 'AVAX' },
            ];
        } catch (error) {
            console.error('Error getting supported chains:', error);
            return [];
        }
    }

    /**
     * Get token list for a chain
     */
    async getTokens(chainId: number): Promise<any[]> {
        try {
            // Common stablecoins for settlements
            const tokens: { [key: number]: any[] } = {
                1: [
                    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
                    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
                ],
                137: [
                    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 },
                    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
                ],
                42161: [
                    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', decimals: 6 },
                    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
                ],
            };

            return tokens[chainId] || [];
        } catch (error) {
            console.error('Error getting tokens:', error);
            return [];
        }
    }

    /**
     * Estimate settlement cost
     */
    async estimateSettlementCost(
        fromChain: number,
        toChain: number,
        amount: string
    ): Promise<{ gasCost: string; bridgeFee: string; total: string }> {
        try {
            // This would use actual route quotes
            // For now, return estimates
            return {
                gasCost: '0.005',
                bridgeFee: '0.001',
                total: '0.006',
            };
        } catch (error) {
            console.error('Error estimating cost:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const lifiService = new LifiService({
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY,
});
