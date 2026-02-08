'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { yellowService } from '@/lib/yellow/service';
import { resolveAddress } from '@/lib/ens/resolver';
import { useAppStore } from '@/lib/store';
import { firebaseService } from '@/lib/firebase/database';
import Link from 'next/link';
import Image from 'next/image';
import { ChainSelector } from '@/components/ui/ChainSelector';
import logo from '@/app/assets/logo-splitchain.png';

export default function JoinGroupPage() {
    const router = useRouter();
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { setCurrentGroup, setIsLoading, setError } = useAppStore();

    const [sessionId, setSessionId] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [creatorEns, setCreatorEns] = useState<string | null>(null);
    const [selectedChains, setSelectedChains] = useState<number[]>([]);

    const handleSessionIdChange = async (value: string) => {
        setSessionId(value);

        // Try to extract creator address and resolve ENS
        // Session ID format: splitchain-{groupName}-v1
        // For demo, we'll just show the session ID
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authenticated || !user) {
            login();
            return;
        }

        setIsJoining(true);
        setIsLoading(true);
        setError(null);

        try {
            // Debug: Log entire Privy user object
            console.log('🔍 Full Privy user object:', user);
            console.log('🔍 user.wallet:', (user as any).wallet);
            console.log('🔍 user.linkedAccounts:', (user as any).linkedAccounts);
            console.log('🔍 user.smartWallet:', (user as any).smartWallet);
            console.log('🔍 user.id:', (user as any).id);

            // Get user's wallet address (supports both MetaMask and Privy email wallets)
            let userAddress = (user as any).wallet?.address;

            // If no wallet, check for embedded wallet from email login
            if (!userAddress) {
                const embeddedWallet = (user as any).linkedAccounts?.find(
                    (account: any) => account.type === 'wallet' || account.walletClientType === 'privy'
                );
                console.log('🔍 Found embedded wallet:', embeddedWallet);
                userAddress = embeddedWallet?.address;
            }

            // Last fallback: check smart_wallet
            if (!userAddress && (user as any).smartWallet) {
                userAddress = (user as any).smartWallet.address;
            }

            if (!userAddress) {
                console.error('❌ Could not find wallet address in any location');
                throw new Error('No wallet address found. Please connect a wallet or sign in with email.');
            }

            console.log('✅ User address:', userAddress);

            // Create message signer function
            const messageSigner = async (message: string) => {
                console.log('Signing message:', message);
                return `signature-${Date.now()}`;
            };

            // Join Yellow Network session
            await yellowService.joinSession(
                sessionId,
                userAddress,
                messageSigner,
                '0'
            );

            // Fetch existing group from Firebase
            let group = await firebaseService.getGroup(sessionId);

            if (!group) {
                throw new Error('Group not found. Please check the session ID.');
            }

            // Add current user as participant
            await firebaseService.addParticipant(sessionId, {
                address: userAddress,
                preferredChains: selectedChains,
            });

            // Reload group to get updated participants
            group = await firebaseService.getGroup(sessionId);

            // Save to store
            if (group) {
                setCurrentGroup(group);
            }

            // Navigate to group dashboard
            router.push(`/group/${sessionId}`);
        } catch (error: any) {
            console.error('Error joining group:', error);
            setError(error.message || 'Failed to join group');
        } finally {
            setIsJoining(false);
            setIsLoading(false);
        }
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#822ca7] border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014] relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/15 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#a855f7]/10 blur-[120px]" />
                </div>
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: 'linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 70%)',
                    }}
                />

                <div className="relative font-comfortaa z-10 max-w-md w-full mx-4 text-center animate-reveal">
                    <div className="p-10 rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#822ca7]/15 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connect Your Wallet</h2>
                        <p className="text-gray-500 text-sm mb-8">
                            You need to connect your wallet to join a group
                        </p>
                        <button
                            onClick={login}
                            className="w-full cursor-pointer px-6 py-4 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] text-white font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(130,44,167,0.4)]"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes reveal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-reveal { animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030014] text-white font-comfortaa relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/15 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-[#a855f7]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Grid */}
            <div
                className="absolute inset-0 z-0 opacity-[0.08]"
                style={{
                    backgroundImage: 'linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 70%)',
                }}
            />

            {/* Vertical light beam */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-screen bg-gradient-to-b from-transparent via-[#822ca7]/40 to-transparent opacity-20 z-0" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
                        <div className="w-24 h-16 relative">
                            <Image src={logo} alt="SplitChain" fill className="object-contain" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                        >
                            Dashboard
                        </Link>
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-mono text-[#c084fc]">
                                {(user as any)?.email?.address ||
                                    ((user as any)?.wallet?.address ?
                                        (user as any).wallet.address.slice(0, 6) + '...' + (user as any).wallet.address.slice(-4) :
                                        'Connected')}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2.5 rounded-full border border-red-500/15 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 cursor-pointer"
                            title="Disconnect"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-2xl mx-auto px-6 pt-32 pb-20">
                {/* Page title */}
                <div className="mb-10 animate-reveal">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#822ca7]/30 bg-[#822ca7]/10 text-[#c084fc] text-xs font-medium mb-4">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                        Join Group
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                        Join <span className="bg-gradient-to-r from-[#822ca7] via-[#c084fc] to-[#822ca7] bg-clip-text text-transparent animate-gradient-x">Group</span>
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Enter the group session ID to join an existing expense group
                    </p>
                </div>

                <form onSubmit={handleJoinGroup} className="space-y-6">
                    {/* Session ID */}
                    <div className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-sm animate-reveal-delayed">
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                            Group Session ID
                        </label>
                        <input
                            type="text"
                            value={sessionId}
                            onChange={(e) => handleSessionIdChange(e.target.value)}
                            placeholder="splitchain-dinner-v1"
                            required
                            className="w-full px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#822ca7]/50 focus:ring-1 focus:ring-[#822ca7]/30 transition-all duration-300 font-mono text-sm"
                        />
                        <p className="mt-2.5 text-xs text-gray-600">
                            Paste the session ID shared by the group creator
                        </p>
                    </div>

                    {/* Preferred Chains */}
                    <div className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-sm animate-reveal-delayed" style={{ animationDelay: '0.3s' }}>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                            Preferred Chains for Receiving Funds
                        </label>
                        <ChainSelector
                            selectedChains={selectedChains}
                            onChange={setSelectedChains}
                        />
                        {selectedChains.length === 0 && (
                            <p className="mt-2.5 text-xs text-red-400/80">
                                Please select at least one preferred chain.
                            </p>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="p-6 rounded-[2rem] border border-[#822ca7]/15 bg-[#822ca7]/[0.06] backdrop-blur-sm animate-reveal-delayed" style={{ animationDelay: '0.4s' }}>
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#822ca7]/15 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm mb-2">What happens next?</h3>
                                <ul className="text-xs text-gray-400 space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#822ca7] mt-0.5">&#x2022;</span>
                                        You&apos;ll join the Yellow Network state channel
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#822ca7] mt-0.5">&#x2022;</span>
                                        You can add and view expenses instantly
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-[#822ca7] mt-0.5">&#x2022;</span>
                                        Settle your share when the group closes
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="animate-reveal-more-delayed">
                        <button
                            type="submit"
                            disabled={isJoining || !sessionId || selectedChains.length === 0}
                            className="w-full cursor-pointer px-8 py-4 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(130,44,167,0.4)] disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                        >
                            {isJoining ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Joining Group...
                                </>
                            ) : (
                                <>
                                    Join Group
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Back Link */}
                <div className="mt-10 text-center animate-reveal-more-delayed">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm group">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" /></svg>
                        Back to Home
                    </Link>
                </div>
            </main>

            <style jsx global>{`
                @keyframes reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-reveal { animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-reveal-delayed { opacity: 0; animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards; }
                .animate-reveal-more-delayed { opacity: 0; animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards; }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 15s ease infinite;
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
}
