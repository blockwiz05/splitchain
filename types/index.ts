export interface User {
    address: string;
    ensName?: string;
    ensAvatar?: string;
    preferredChains?: number[];
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    paidBy: string;
    paidByEns?: string;
    splitAmong: string[];
    timestamp: number;
    currency: string;
}

export interface GroupSession {
    id: string;
    name: string;
    createdBy: string;
    createdAt: number;
    participants: User[];
    expenses: Expense[];
    isActive: boolean;
    yellowSessionId?: string;
    settlements?: Settlement[];
}

export interface Balance {
    address: string;
    ensName?: string;
    netAmount: number;
    currency: string;
}

export interface Settlement {
    id: string;
    from: string;
    to: string;
    amount: number;
    currency: string;
    fromChain?: number;
    toChain?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    txHash?: string;
    timestamp: number;
}
