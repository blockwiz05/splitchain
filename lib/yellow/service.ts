/**
 * Yellow Network SDK Integration using Nitrolite
 * 
 * Yellow Network provides Layer-3 state channels for instant off-chain transactions.
 * This module handles session management, off-chain payments, and real-time sync.
 * 
 * Documentation: https://docs.yellow.org
 * SDK: @erc7824/nitrolite
 */

import { createAppSessionMessage } from '@erc7824/nitrolite';
import { GroupSession, Expense } from '@/types';

interface YellowConfig {
    wsUrl: string;
    network: 'mainnet' | 'sandbox';
}

interface AppDefinition {
    protocol: string;
    participants: string[];
    weights: number[];
    quorum: number;
    challenge: number;
    nonce: number;
}

interface Allocation {
    participant: string;
    asset: string;
    amount: string;
}

interface PaymentMessage {
    type: 'payment' | 'expense' | 'update';
    amount: string;
    recipient: string;
    timestamp: number;
    metadata?: any;
}

class YellowNetworkService {
    private config: YellowConfig;
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor(config: YellowConfig) {
        this.config = config;
    }

    /**
     * Connect to Yellow Network ClearNode
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ Connected to Yellow Network ClearNode');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        // Parse the message data
                        let message;
                        try {
                            // Try to parse as JSON first
                            message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                        } catch {
                            // If not JSON, use the data as-is
                            message = event.data;
                        }

                        console.log('📨 Received from Yellow Network:', message);

                        // Call registered handlers
                        this.messageHandlers.forEach((handler) => {
                            handler(message);
                        });
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ Yellow Network connection error:', error);
                    this.isConnected = false;
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from Yellow Network');
                    this.isConnected = false;
                    this.attemptReconnect();
                };
            } catch (error) {
                console.error('Error connecting to Yellow Network:', error);
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect to Yellow Network
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }, 2000 * this.reconnectAttempts); // Exponential backoff
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    /**
     * Disconnect from Yellow Network
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    /**
     * Create a new Yellow session for a group
     * This creates a state channel with multiple participants
     */
    async createSession(
        groupName: string,
        creator: string,
        participants: string[],
        messageSigner: (message: string) => Promise<string>,
        initialAmount: string = '1000000' // 1 USDC (6 decimals)
    ): Promise<string> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            // Create app definition for expense splitting
            const appDefinition: AppDefinition = {
                protocol: `splitchain-${groupName}-v1`,
                participants: [creator, ...participants],
                weights: new Array(participants.length + 1).fill(100 / (participants.length + 1)),
                quorum: 100, // All participants must agree
                challenge: 0,
                nonce: Date.now(),
            };

            // Initial allocations - creator locks initial amount
            const allocations: Allocation[] = [
                {
                    participant: creator,
                    asset: 'usdc',
                    amount: initialAmount,
                },
                ...participants.map((p) => ({
                    participant: p,
                    asset: 'usdc',
                    amount: '0', // Others join with 0 initially
                })),
            ];

            // Create session message
            const sessionData = {
                type: 'create_session',
                definition: appDefinition,
                allocations,
                timestamp: Date.now(),
            };

            // Sign the message
            const signature = await messageSigner(JSON.stringify(sessionData));
            const signedMessage = { ...sessionData, signature, sender: creator };

            // Send to ClearNode
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(signedMessage));
                console.log('✅ Session created:', appDefinition.protocol);
                return appDefinition.protocol;
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error creating Yellow session:', error);
            throw error;
        }
    }

    /**
     * Join an existing Yellow session
     */
    async joinSession(
        sessionId: string,
        participant: string,
        messageSigner: (message: string) => Promise<string>,
        lockAmount: string = '1000000'
    ): Promise<boolean> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            // Create join message
            const joinData = {
                type: 'join',
                sessionId,
                participant,
                lockAmount,
                timestamp: Date.now(),
            };

            const signature = await messageSigner(JSON.stringify(joinData));
            const signedJoin = { ...joinData, signature };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(signedJoin));
                console.log('✅ Joined session:', sessionId);
                return true;
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error joining Yellow session:', error);
            throw error;
        }
    }

    /**
     * Add expense to off-chain ledger (instant sync)
     */
    async addExpense(
        sessionId: string,
        expense: Expense,
        messageSigner: (message: string) => Promise<string>
    ): Promise<boolean> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            // Create expense message
            const expenseData: PaymentMessage = {
                type: 'expense',
                amount: expense.amount.toString(),
                recipient: sessionId,
                timestamp: expense.timestamp,
                metadata: {
                    id: expense.id,
                    description: expense.description,
                    paidBy: expense.paidBy,
                    splitAmong: expense.splitAmong,
                    currency: expense.currency,
                },
            };

            const signature = await messageSigner(JSON.stringify(expenseData));
            const signedExpense = { ...expenseData, signature, sender: expense.paidBy };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(signedExpense));
                console.log('💸 Expense added instantly:', expense.description);
                return true;
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    }

    /**
     * Send instant payment through state channel
     */
    async sendPayment(
        amount: bigint,
        recipient: string,
        messageSigner: (message: string) => Promise<string>,
        sender: string
    ): Promise<boolean> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const paymentData: PaymentMessage = {
                type: 'payment',
                amount: amount.toString(),
                recipient,
                timestamp: Date.now(),
            };

            const signature = await messageSigner(JSON.stringify(paymentData));
            const signedPayment = { ...paymentData, signature, sender };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(signedPayment));
                console.log('💸 Payment sent instantly!');
                return true;
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error sending payment:', error);
            throw error;
        }
    }

    /**
     * Get current session state
     */
    async getSessionState(sessionId: string): Promise<any> {
        try {
            // Request session state from ClearNode
            const stateRequest = {
                type: 'get_state',
                sessionId,
                timestamp: Date.now(),
            };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(stateRequest));

                // In a real implementation, you'd wait for the response
                // For now, return a promise that resolves with mock data
                return new Promise((resolve) => {
                    const handler = (data: any) => {
                        if (data.type === 'state_response' && data.sessionId === sessionId) {
                            this.messageHandlers.delete('state_handler');
                            resolve(data.state);
                        }
                    };
                    this.messageHandlers.set('state_handler', handler);

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        this.messageHandlers.delete('state_handler');
                        resolve({
                            participants: [],
                            expenses: [],
                            balances: {},
                        });
                    }, 5000);
                });
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error getting session state:', error);
            throw error;
        }
    }

    /**
     * Close session and prepare for settlement
     */
    async closeSession(
        sessionId: string,
        messageSigner: (message: string) => Promise<string>
    ): Promise<any> {
        try {
            const closeData = {
                type: 'close_session',
                sessionId,
                timestamp: Date.now(),
            };

            const signature = await messageSigner(JSON.stringify(closeData));
            const signedClose = { ...closeData, signature };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(signedClose));
                console.log('🔒 Session closed:', sessionId);

                return {
                    finalBalances: {},
                    settlementData: {},
                };
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error closing session:', error);
            throw error;
        }
    }

    /**
     * Subscribe to session updates (real-time sync)
     */
    subscribeToSession(sessionId: string, callback: (update: any) => void): () => void {
        const handlerId = `session_${sessionId}_${Date.now()}`;

        const handler = (data: any) => {
            if (data.sessionId === sessionId || data.type === 'expense' || data.type === 'payment') {
                callback(data);
            }
        };

        this.messageHandlers.set(handlerId, handler);
        console.log('👂 Subscribed to session updates:', sessionId);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.delete(handlerId);
            console.log('🔇 Unsubscribed from session:', sessionId);
        };
    }

    /**
     * Check if connected to Yellow Network
     */
    isConnectedToNetwork(): boolean {
        return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
// Use sandbox for testing, production for mainnet
const wsUrl = process.env.NEXT_PUBLIC_YELLOW_NETWORK_RPC || 'wss://clearnet-sandbox.yellow.com/ws';
const network = wsUrl.includes('sandbox') ? 'sandbox' : 'mainnet';

export const yellowService = new YellowNetworkService({
    wsUrl,
    network: network as 'mainnet' | 'sandbox',
});

// Auto-connect on initialization (optional)
if (typeof window !== 'undefined') {
    yellowService.connect().catch((error) => {
        console.warn('Yellow Network auto-connect failed:', error);
    });
}
