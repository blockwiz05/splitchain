import React from 'react'

const Features = () => {
  return (
    <div id="features" className="grid md:grid-cols-3 gap-8 text-left">
  {[
    {
      title: 'Instant Sync',
      desc: 'State-channel updates via Yellow Network. Zero latency, zero gas for daily entries.',
      // FILLED 3D BOLT
      icon: (
        <div className="relative w-14 h-14">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="fillGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#822ca7" />
              </linearGradient>
            </defs>
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#fillGrad1)" className="drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]" />
            <path opacity="0.3" d="M13 2L7 14H12L13 2Z" fill="white" /> {/* Light hit */}
          </svg>
        </div>
      )
    },
    {
      title: 'Chain Agnostic',
      desc: 'Settle your debts from any chain to any chain. LI.FI handles the heavy lifting.',
      // FILLED 3D NODES
      icon: (
        <div className="relative w-14 h-14" style={{ animationDelay: '0.2s' }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="7" width="8" height="8" rx="2" fill="url(#fillGrad1)" className="animate-pulse" />
            <rect x="14" y="9" width="8" height="8" rx="2" fill="#822ca7" />
            <path d="M10 11H14" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="11" r="2" fill="white" />
          </svg>
        </div>
      )
    },
    {
      title: 'Human Readable',
      desc: 'No more hex strings. Full ENS support for a native social experience.',
      // FILLED 3D USER
      icon: (
        <div className="relative w-14 h-14" style={{ animationDelay: '0.4s' }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="7" r="5" fill="url(#fillGrad1)" />
            <path d="M3 21C3 17.134 6.13401 14 10 14H14C17.866 14 21 17.134 21 21" fill="#822ca7" />
            <circle cx="10" cy="5" r="1.5" fill="white" opacity="0.3" /> {/* 3D Highlight */}
          </svg>
        </div>
      )
    }
  ].map((f, i) => (
    <div key={i} className="group relative p-8 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-[2px]  overflow-hidden transition-all duration-500 hover:-translate-y-3 hover:border-purple-500/30">
      {/* Soft Glow behind icon */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-purple-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10">
        <div className="mb-6 transform transition-transform duration-500 group-hover:scale-110">
          {f.icon}
        </div>
        <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent italic">
          {f.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
          {f.desc}
        </p>
      </div>

      {/* Decorative accent light at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
    </div>
  ))}
</div>
  )
}

export default Features
