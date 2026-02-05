/**
 * Format address to shortened version (0x1234...5678)
 */
export function formatAddress(address: string, chars = 4): string {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Generate unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate net balances from expenses
 */
export function calculateBalances(expenses: any[], participants: string[]) {
    const balances: { [address: string]: number } = {};

    // Initialize all participants with 0 balance
    participants.forEach((addr) => {
        balances[addr] = 0;
    });

    // Calculate balances
    expenses.forEach((expense) => {
        const { amount, paidBy, splitAmong } = expense;
        const splitAmount = amount / splitAmong.length;

        // Payer gets credited
        balances[paidBy] = (balances[paidBy] || 0) + amount;

        // Everyone in split gets debited
        splitAmong.forEach((addr: string) => {
            balances[addr] = (balances[addr] || 0) - splitAmount;
        });
    });

    return balances;
}

/**
 * Simplify debts (minimize transactions)
 */
export function simplifyDebts(balances: { [address: string]: number }) {
    const creditors: { address: string; amount: number }[] = [];
    const debtors: { address: string; amount: number }[] = [];

    // Separate creditors and debtors
    Object.entries(balances).forEach(([address, amount]) => {
        if (amount > 0.01) {
            creditors.push({ address, amount });
        } else if (amount < -0.01) {
            debtors.push({ address, amount: Math.abs(amount) });
        }
    });

    const transactions: { from: string; to: string; amount: number }[] = [];

    // Match debtors with creditors
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debt = debtors[i].amount;
        const credit = creditors[j].amount;
        const amount = Math.min(debt, credit);

        transactions.push({
            from: debtors[i].address,
            to: creditors[j].address,
            amount: Number(amount.toFixed(2)),
        });

        debtors[i].amount -= amount;
        creditors[j].amount -= amount;

        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}
