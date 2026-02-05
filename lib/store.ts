import { create } from 'zustand';
import { User, GroupSession, Expense, Balance } from '@/types';

interface AppState {
    // User state
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;

    // Group state
    currentGroup: GroupSession | null;
    setCurrentGroup: (group: GroupSession | null) => void;

    // Expenses
    expenses: Expense[];
    addExpense: (expense: Expense) => void;
    removeExpense: (expenseId: string) => void;

    // Balances
    balances: Balance[];
    updateBalances: (balances: Balance[]) => void;

    // UI state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // User state
    currentUser: null,
    setCurrentUser: (user) => set({ currentUser: user }),

    // Group state
    currentGroup: null,
    setCurrentGroup: (group) => set({ currentGroup: group }),

    // Expenses
    expenses: [],
    addExpense: (expense) =>
        set((state) => ({
            expenses: [...state.expenses, expense],
        })),
    removeExpense: (expenseId) =>
        set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== expenseId),
        })),

    // Balances
    balances: [],
    updateBalances: (balances) => set({ balances }),

    // UI state
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    error: null,
    setError: (error) => set({ error }),
}));
