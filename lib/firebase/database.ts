/**
 * Firebase Realtime Database Service
 * 
 * Handles all database operations for group state synchronization
 */

import { database } from './config';
import { ref, set, get, update, onValue, push, off } from 'firebase/database';
import { GroupSession, Expense } from '@/types';

/**
 * Remove undefined values from object (Firebase doesn't allow undefined)
 */
function cleanUndefined(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(cleanUndefined);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = cleanUndefined(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
}

/**
 * Check if Firebase is properly configured
 */
function isFirebaseConfigured(): boolean {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    return apiKey !== undefined &&
        apiKey !== 'your-api-key-here' &&
        apiKey !== '' &&
        database !== undefined;
}

/**
 * LocalStorage fallback when Firebase is not configured
 */
const localStorageFallback = {
    saveGroup(group: GroupSession): void {
        try {
            const groups = this.getAllGroups();
            const index = groups.findIndex(g => g.id === group.id);
            if (index >= 0) {
                groups[index] = group;
            } else {
                groups.push(group);
            }
            localStorage.setItem('splitchain_groups', JSON.stringify(groups));
            console.log('💾 Saved group to localStorage:', group.id);

            // Dispatch custom event for same-tab updates
            window.dispatchEvent(new CustomEvent('splitchain-update', {
                detail: { groupId: group.id }
            }));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    },

    getGroup(sessionId: string): GroupSession | null {
        try {
            const groups = this.getAllGroups();
            return groups.find(g => g.id === sessionId) || null;
        } catch (error) {
            console.error('Error getting from localStorage:', error);
            return null;
        }
    },

    getAllGroups(): GroupSession[] {
        try {
            const data = localStorage.getItem('splitchain_groups');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },
};

export const firebaseService = {
    /**
     * Save group to Firebase (or localStorage fallback)
     */
    async saveGroup(group: GroupSession): Promise<void> {
        // Use localStorage fallback if Firebase not configured
        if (!isFirebaseConfigured()) {
            console.warn('⚠️ Firebase not configured, using localStorage fallback');
            localStorageFallback.saveGroup(group);
            return;
        }

        try {
            const groupRef = ref(database, `groups/${group.id}`);

            // Clean undefined values before saving
            const cleanedGroup = cleanUndefined({
                ...group,
                updatedAt: Date.now(),
            });

            await set(groupRef, cleanedGroup);
            console.log('💾 Saved group to Firebase:', group.id);
        } catch (error) {
            console.error('Error saving group to Firebase:', error);
            throw error;
        }
    },

    /**
     * Get group from Firebase (or localStorage fallback)
     */
    async getGroup(sessionId: string): Promise<GroupSession | null> {
        // Use localStorage fallback if Firebase not configured
        if (!isFirebaseConfigured()) {
            console.warn('⚠️ Firebase not configured, using localStorage fallback');
            return localStorageFallback.getGroup(sessionId);
        }

        try {
            const groupRef = ref(database, `groups/${sessionId}`);
            const snapshot = await get(groupRef);

            if (snapshot.exists()) {
                console.log('📥 Loaded group from Firebase:', sessionId);
                return snapshot.val() as GroupSession;
            }

            console.log('❌ Group not found in Firebase:', sessionId);
            return null;
        } catch (error) {
            console.error('Error getting group from Firebase:', error);
            return null;
        }
    },

    /**
     * Add participant to group
     */
    async addParticipant(
        sessionId: string,
        participant: { address: string; ensName?: string }
    ): Promise<void> {
        try {
            const group = await this.getGroup(sessionId);
            if (!group) {
                console.warn('Group not found:', sessionId);
                return;
            }

            // Initialize participants array if it doesn't exist
            if (!group.participants) {
                group.participants = [];
            }

            // Check if participant already exists
            const exists = group.participants.some(
                (p) => p.address.toLowerCase() === participant.address.toLowerCase()
            );

            if (!exists) {
                group.participants.push(participant);
                await this.saveGroup(group);
                console.log('👥 Added participant:', participant.address);
            }
        } catch (error) {
            console.error('Error adding participant:', error);
            throw error;
        }
    },

    /**
     * Add expense to group
     */
    async addExpense(sessionId: string, expense: Expense): Promise<void> {
        try {
            const group = await this.getGroup(sessionId);
            if (!group) {
                console.warn('Group not found:', sessionId);
                return;
            }

            // Initialize expenses array if it doesn't exist
            if (!group.expenses) {
                group.expenses = [];
            }

            group.expenses.push(expense);
            await this.saveGroup(group);
            console.log('💸 Added expense to Firebase:', expense.description);
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    },

    /**
     * Subscribe to group updates (real-time)
     * Uses Firebase if configured, otherwise uses localStorage events for cross-tab sync
     */
    subscribeToGroup(
        sessionId: string,
        callback: (group: GroupSession | null) => void
    ): () => void {
        // Use localStorage event listener if Firebase not configured
        if (!isFirebaseConfigured()) {
            console.log('👂 Subscribing to localStorage events for:', sessionId);

            // Initial load
            const initialGroup = localStorageFallback.getGroup(sessionId);
            if (initialGroup) {
                callback(initialGroup);
            }

            // Listen for storage events (cross-tab sync)
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === 'splitchain_groups' && e.newValue) {
                    console.log('🔔 localStorage changed (cross-tab), reloading group:', sessionId);
                    const group = localStorageFallback.getGroup(sessionId);
                    if (group) {
                        callback(group);
                    }
                }
            };

            // Listen for custom events (same-tab sync)
            const handleCustomUpdate = ((e: CustomEvent) => {
                if (e.detail.groupId === sessionId) {
                    console.log('🔔 Group updated (same-tab):', sessionId);
                    const group = localStorageFallback.getGroup(sessionId);
                    if (group) {
                        callback(group);
                    }
                }
            }) as EventListener;

            window.addEventListener('storage', handleStorageChange);
            window.addEventListener('splitchain-update', handleCustomUpdate);

            // Return cleanup function
            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('splitchain-update', handleCustomUpdate);
                console.log('🔇 Unsubscribed from localStorage events:', sessionId);
            };
        }

        // Use Firebase if configured
        try {
            const groupRef = ref(database, `groups/${sessionId}`);

            const unsubscribe = onValue(groupRef, (snapshot) => {
                if (snapshot.exists()) {
                    const group = snapshot.val() as GroupSession;
                    console.log('🔔 Group updated from Firebase:', sessionId);
                    callback(group);
                } else {
                    callback(null);
                }
            });

            console.log('👂 Subscribed to Firebase group updates:', sessionId);

            // Return unsubscribe function
            return () => {
                off(groupRef);
                console.log('🔇 Unsubscribed from Firebase group:', sessionId);
            };
        } catch (error) {
            console.error('Error subscribing to group:', error);
            return () => { };
        }
    },

    /**
     * Get all groups (for listing)
     */
    async getAllGroups(): Promise<GroupSession[]> {
        try {
            const groupsRef = ref(database, 'groups');
            const snapshot = await get(groupsRef);

            if (snapshot.exists()) {
                const groupsObj = snapshot.val();
                return Object.values(groupsObj) as GroupSession[];
            }

            return [];
        } catch (error) {
            console.error('Error getting all groups:', error);
            return [];
        }
    },

    /**
     * Delete group
     */
    async deleteGroup(sessionId: string): Promise<void> {
        try {
            const groupRef = ref(database, `groups/${sessionId}`);
            await set(groupRef, null);
            console.log('🗑️ Deleted group from Firebase:', sessionId);
        } catch (error) {
            console.error('Error deleting group:', error);
            throw error;
        }
    },

    /**
     * Update group status
     */
    async updateGroupStatus(sessionId: string, isActive: boolean): Promise<void> {
        try {
            const groupRef = ref(database, `groups/${sessionId}`);
            await update(groupRef, {
                isActive,
                updatedAt: Date.now(),
            });
            console.log('✏️ Updated group status:', sessionId, isActive);
        } catch (error) {
            console.error('Error updating group status:', error);
            throw error;
        }
    },

    /**
     * Add settlement to group
     */
    async addSettlement(sessionId: string, settlement: any): Promise<void> {
        try {
            const group = await this.getGroup(sessionId);
            if (!group) {
                console.warn('Group not found:', sessionId);
                return;
            }

            // Initialize settlements array if it doesn't exist
            if (!group.settlements) {
                (group as any).settlements = [];
            }

            (group as any).settlements.push(settlement);
            await this.saveGroup(group);
            console.log('💰 Added settlement to Firebase:', settlement.id);
        } catch (error) {
            console.error('Error adding settlement:', error);
            throw error;
        }
    },
};
