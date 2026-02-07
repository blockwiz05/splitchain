'use client';

import { MAINNET_CHAINS } from '@/lib/config/chains';

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
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="text-indigo-400">🌐</span>
                    <span className="text-sm font-medium text-indigo-300">
                        Supported Networks
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {currentChains.map((chain) => (
                    <button
                        type="button"
                        key={chain.id}
                        onClick={() => handleChainToggle(chain.id)}
                        className={`p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${selectedChains.includes(chain.id)
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
                            }`}
                    >
                        <span className="text-2xl">{chain.icon}</span>
                        <div className="flex-1">
                            <div className="font-medium text-sm">{chain.name}</div>
                            {selectedChains.includes(chain.id) && (
                                <div className="text-xs text-indigo-300">Selected</div>
                            )}
                        </div>
                        {selectedChains.includes(chain.id) && (
                            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
                {allowMultiple
                    ? "Select the networks where you'd prefer to receive settlements."
                    : "Select the network to use."
                }
            </p>
        </div>
    );
}
