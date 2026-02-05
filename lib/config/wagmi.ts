import { http, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum, sepolia, polygonAmoy } from 'wagmi/chains';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const config = createConfig({
    chains: [mainnet, polygon, arbitrum, sepolia, polygonAmoy],
    transports: {
        [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`),
        [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`),
        [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`),
        [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`),
        [polygonAmoy.id]: http(`https://polygon-amoy.g.alchemy.com/v2/${alchemyKey}`),
    },
});
