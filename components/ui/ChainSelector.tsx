'use client';

import Image from 'next/image';
import { MAINNET_CHAINS } from '@/lib/config/chains';

import ethereumImg from '@/app/assets/chain/ethe.png';
import polygonImg from '@/app/assets/chain/polygon.png';
import arbitrumImg from '@/app/assets/chain/arbitrum.png';
import optimismImg from '@/app/assets/chain/optimism.png';
import bscImg from '@/app/assets/chain/bsc.png';

const chainImages: Record<number, any> = {
    1: ethereumImg,
    137: polygonImg,
    42161: arbitrumImg,
    10: optimismImg,
    56: bscImg,
};

interface ChainSelectorProps {
    selectedChains: number[];
    onChange: (chains: number[]) => void;
    allowMultiple?: boolean;
}

export function ChainSelector({
    selectedChains,
    onChange,
    allowMultiple = true
}: ChainSelectorProps) {

    const currentChains = MAINNET_CHAINS;

    const handleChainToggle = (chainId: number) => {
        if (!allowMultiple) {
            onChange([chainId]);
            return;
        }

        if (selectedChains.includes(chainId)) {
            // Cannot deselect if it's the last one
            if (selectedChains.length > 1) {
                onChange(selectedChains.filter(id => id !== chainId));
            }
        } else {
            onChange([...selectedChains, chainId]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="px-4 py-2.5 bg-[#822ca7]/[0.08] border border-[#822ca7]/15 rounded-xl flex items-center gap-2.5">
                <span className="text-[#c084fc]">🌐</span>
                <span className="text-xs font-semibold text-[#c084fc] tracking-wide">
                    Supported Networks
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {currentChains.map((chain) => {
                    const isSelected = selectedChains.includes(chain.id);
                    return (
                        <button
                            type="button"
                            key={chain.id}
                            onClick={() => handleChainToggle(chain.id)}
                            className={`group relative p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all duration-300 cursor-pointer overflow-hidden ${
                                isSelected
                                    ? 'border-[#822ca7]/40 bg-[#822ca7]/15 text-white'
                                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-gray-500'
                            }`}
                        >
                            {/* Top glow line when selected */}
                            {isSelected && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#822ca7]/60 to-transparent" />
                            )}

                            <div className={`w-8 h-8 rounded-fulloverflow-hidden flex-shrink-0 transition-transform duration-300 ${isSelected ? 'scale-110 ring-2 ring-[#822ca7]/50' : 'group-hover:scale-105'}`}>
                                <Image
                                    src={chainImages[chain.id]}
                                    alt={chain.name}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                    {chain.name}
                                </div>
                                {isSelected && (
                                    <div className="text-[10px] text-[#c084fc] font-medium tracking-wide uppercase">Selected</div>
                                )}
                            </div>
                            {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-[#822ca7] shadow-[0_0_8px_rgba(130,44,167,0.6)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="text-[11px] text-gray-600">
                {allowMultiple
                    ? "Select the networks where you'd prefer to receive settlements."
                    : "Select the network to use."
                }
            </p>
        </div>
    );
}
