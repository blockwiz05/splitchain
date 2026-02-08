'use client';

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import logo from "@/app/assets/logo-splitchain.png";
import Features from "@/components/ui/Features";

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  return (
    <div className="relative font-comfortaa min-h-screen overflow-hidden bg-[#030014] text-white">
      {/* --- MODERN BACKGROUND ARCHITECTURE --- */}
      {/* Animated Mesh Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#822ca7]/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#a855f7]/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Interactive Grid with Fade Mask */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.2]"
        style={{
          backgroundImage: `linear-gradient(#822ca7 1px, transparent 1px), linear-gradient(90deg, #822ca7 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)'
        }}
      />

      {/* Moving Light Beam Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-screen bg-gradient-to-b from-transparent via-[#822ca7]/50 to-transparent opacity-20" />

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
            <div className="w-24 h-16 relative">
              <Image src={logo} alt="SplitChain" fill className="object-contain" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full backdrop-blur-2xl">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Create', href: '/create' },
              { label: 'Join', href: '/join' },
              { label: 'Dashboard', href: '/dashboard' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-6 py-2 text-sm font-medium text-gray-400 hover:text-white transition-all rounded-full hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {ready && !authenticated && (
              <button
                onClick={login}
                className="px-8 py-2.5 cursor-pointer rounded-full bg-white text-black font-bold text-sm hover:bg-[#a855f7] hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[#822ca7]/40"
              >
                Connect Wallet
              </button>
            )}

            {ready && authenticated && user && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">Connected</span>
                  <span className="text-sm font-mono text-[#a855f7]">
                    {(user as any).wallet?.address?.slice(0, 6)}...{(user as any).wallet?.address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 cursor-pointer rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Disconnect"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#822ca7]/30 bg-[#822ca7]/10 text-[#c084fc] text-xs font-medium mb-8 animate-reveal">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Built for HackMoney 2026
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-8  animate-reveal-delayed">
            Split <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">Expenses</span>
            <br />
            <span className="italic bg-gradient-to-r from-[#822ca7] via-[#c084fc] to-[#822ca7] bg-clip-text text-transparent animate-gradient-x">
              Any Chain.
            </span>
          </h1>

          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed animate-reveal-more-delayed">
            Experience the future of group finances. Instant off-chain tracking on 
            <span className="text-white font-semibold"> Yellow Network</span> with 
            <span className="text-white font-semibold"> LI.FI </span> 
            cross-chain settlement.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-32 animate-reveal-more-delayed">
            <Link
              href="/create"
              className="px-10 py-4 rounded-2xl bg-gradient-to-br from-[#822ca7] to-[#a855f7] font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(130,44,167,0.4)] flex items-center gap-2"
            >
              Create Group
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </Link>
            <Link
              href="/join"
              className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
            >
              Join Group
            </Link>
          </div>

          {/* BENTO GRID FEATURES */}
          <Features/>

          {/* STATS BAR */}
          <div className="mt-20 py-12 px-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-wrap justify-around gap-8">
            {[
              { label: 'Network Cost', value: '~$0.00' },
              { label: 'Supported Chains', value: '15+' },
              { label: 'Sync Speed', value: 'Real-time' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-2">{s.label}</div>
                <div className="text-3xl font-black text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 relative z-10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-sm">© 2026 SplitChain. Built for HackMoney.</p>
          <div className="flex gap-8 text-gray-500 text-sm">
            <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
            <span className="hover:text-white transition-colors cursor-pointer">Security</span>
            <span className="hover:text-white transition-colors cursor-pointer">GitHub</span>
          </div>
        </div>
      </footer>

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