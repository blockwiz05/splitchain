'use client';

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              SplitChain
            </span>
          </div>

          {ready && !authenticated && (
            <button
              onClick={login}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-indigo-500/50 hover:shadow-indigo-500/70"
            >
              Connect Wallet
            </button>
          )}

          {ready && authenticated && user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">
                  {(user as any).email?.address ||
                    (user as any).wallet?.address?.slice(0, 6) + '...' + (user as any).wallet?.address?.slice(-4) ||
                    'Connected'}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-all duration-200"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-300">Built for HackMoney 2026</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Split Expenses
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Across Any Chain
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Instant off-chain expense tracking with <span className="text-indigo-400 font-semibold">Yellow Network</span>,
            cross-chain settlements via <span className="text-purple-400 font-semibold">LI.FI</span>,
            and human-readable names with <span className="text-pink-400 font-semibold">ENS</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/create"
              className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-semibold text-lg transition-all duration-200 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-105"
            >
              Create Group
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/join"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 text-white rounded-2xl font-semibold text-lg transition-all duration-200"
            >
              Join Group
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {/* Feature 1 */}
            <div className="group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Sync</h3>
              <p className="text-gray-400">
                Off-chain expense tracking with Yellow Network for real-time updates across all participants
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🌉</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cross-Chain</h3>
              <p className="text-gray-400">
                Settle from any chain using LI.FI's routing - ETH, Polygon, Arbitrum, and more
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ENS Names</h3>
              <p className="text-gray-400">
                Human-readable identities - split with vinit.eth instead of 0x1234...
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                99%
              </div>
              <div className="text-gray-400 text-sm">Gas Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                6+
              </div>
              <div className="text-gray-400 text-sm">Chains Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                &lt;1s
              </div>
              <div className="text-gray-400 text-sm">Settlement Time</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-400 text-sm">
          <p>Built with Yellow Network, LI.FI, and ENS for HackMoney 2026</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

