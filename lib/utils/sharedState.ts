/**
 * Simple shared state manager using localStorage
 * In production, this would be replaced with a real database or Yellow Network state
 */

import { GroupSession } from '@/types';

const STORAGE_KEY = 'splitchain_groups';

export const sharedState = {
    /**
     * Save group to shared state
     */
    saveGroup(group: GroupSession): void {
        try {
            const groups = this.getAllGroups();
            const existingIndex = groups.findIndex(g => g.id === group.id);

            if (existingIndex >= 0) {
                // Update existing group
                groups[existingIndex] = group;
            } else {
                // Add new group
                groups.push(group);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
            console.log('💾 Saved group to shared state:', group.id);
        } catch (error) {
            console.error('Error saving group:', error);
        }
    },

    /**
     * Get group by ID
     */
    getGroup(sessionId: string): GroupSession | null {
        try {
            const groups = this.getAllGroups();
            return groups.find(g => g.id === sessionId) || null;
        } catch (error) {
            console.error('Error getting group:', error);
            return null;
        }
    },

    /**
     * Get all groups
     */
    getAllGroups(): GroupSession[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting all groups:', error);
            return [];
        }
    },

    /**
     * Add participant to group
     */
    addParticipant(sessionId: string, participant: { address: string; ensName?: string }): void {
        try {
            const group = this.getGroup(sessionId);
            if (!group) {
                console.warn('Group not found:', sessionId);
                return;
            }

            // Check if participant already exists
            const exists = group.participants.some(p => p.address.toLowerCase() === participant.address.toLowerCase());
            if (!exists) {
                group.participants.push(participant);
                this.saveGroup(group);
                console.log('👥 Added participant to group:', participant.address);
            }
        } catch (error) {
            console.error('Error adding participant:', error);
        }
    },

    /**
     * Add expense to group
     */
    addExpense(sessionId: string, expense: any): void {
        try {
            const group = this.getGroup(sessionId);
            if (!group) {
                console.warn('Group not found:', sessionId);
                return;
            }

            group.expenses.push(expense);
            this.saveGroup(group);
            console.log('💸 Added expense to group:', expense.description);
        } catch (error) {
            console.error('Error adding expense:', error);
        }
    },

    /**
     * Clear all groups (for testing)
     */
    clearAll(): void {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ Cleared all groups');
    }
};
