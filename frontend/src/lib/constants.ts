// Import ABIs from contract artifacts
import AirdropArtifact from '../../../smart-contracts/artifacts/contracts/AtherlabsAirdrop.sol/AtherlabsAirdrop.json';
import TokenArtifact from '../../../smart-contracts/artifacts/contracts/AtherlabsToken.sol/AtherlabsToken.json';

// Network configuration
export const SUPPORTED_CHAIN_ID = process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_ID 
  ? parseInt(process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_ID) 
  : 11155111; // Default to Sepolia

// Contract addresses - fallback to development addresses if env vars not set
export const AIRDROP_ADDRESS = process.env.NEXT_PUBLIC_AIRDROP_ADDRESS || 
  '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'; // Default to local deployment

export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || 
  '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'; // Default to local deployment

// Contract ABIs with proper typing
export const AIRDROP_ABI = AirdropArtifact.abi as const;
export const TOKEN_ABI = TokenArtifact.abi as const;

// Helper function to dynamically get contract deployment data
export const getDeploymentData = () => {
  try {
    // For client-side, we rely on the env variables
    // This approach allows local development without requiring the deployment.json file
    return {
      token: TOKEN_ADDRESS,
      airdrop: AIRDROP_ADDRESS,
      network: SUPPORTED_CHAIN_ID === 11155111 ? 'sepolia' : 'localhost'
    };
  } catch (error) {
    console.warn('Failed to load deployment data, using default values', error);
    return {
      token: TOKEN_ADDRESS,
      airdrop: AIRDROP_ADDRESS,
      network: 'sepolia'
    };
  }
}; 