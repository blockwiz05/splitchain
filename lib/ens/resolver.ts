import { normalize } from 'viem/ens';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
});

/**
 * Resolve ENS name to address
 */
export async function resolveEnsName(ensName: string): Promise<string | null> {
    try {
        const address = await publicClient.getEnsAddress({
            name: normalize(ensName),
        });
        return address;
    } catch (error) {
        console.error('Error resolving ENS name:', error);
        return null;
    }
}

/**
 * Reverse resolve address to ENS name
 */
export async function resolveAddress(address: string): Promise<string | null> {
    try {
        const ensName = await publicClient.getEnsName({
            address: address as `0x${string}`,
        });
        return ensName;
    } catch (error) {
        console.error('Error resolving address:', error);
        return null;
    }
}

/**
 * Get ENS avatar
 */
export async function getEnsAvatar(ensName: string): Promise<string | null> {
    try {
        const avatar = await publicClient.getEnsAvatar({
            name: normalize(ensName),
        });
        return avatar;
    } catch (error) {
        console.error('Error getting ENS avatar:', error);
        return null;
    }
}

/**
 * Get ENS text record
 */
export async function getEnsText(ensName: string, key: string): Promise<string | null> {
    try {
        const text = await publicClient.getEnsText({
            name: normalize(ensName),
            key,
        });
        return text;
    } catch (error) {
        console.error('Error getting ENS text:', error);
        return null;
    }
}
