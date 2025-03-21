// This script can be run during build to generate the contract config for backend
const fs = require('fs');
const path = require('path');

// Load deployment data from smart contracts
const deploymentPath = path.join(__dirname, '../../smart-contracts/data/deployment.json');
let deploymentData;

try {
  if (fs.existsSync(deploymentPath)) {
    deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log('Loaded contract addresses from deployment data:', deploymentData);
  } else {
    console.warn('No deployment data found, using default values');
    deploymentData = {
      token: process.env.TOKEN_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      airdrop: process.env.AIRDROP_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      network: 'localhost'
    };
  }

  // Determine RPC URL based on network
  const rpcUrl = deploymentData.network === 'sepolia' 
    ? process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/your-api-key'
    : 'http://127.0.0.1:8545';

  // Create the .env file with the contract addresses
  const envContent = `
# This file is auto-generated from the deployment data
TOKEN_ADDRESS=${deploymentData.token}
AIRDROP_ADDRESS=${deploymentData.airdrop}
NETWORK=${deploymentData.network}
CHAIN_ID=${deploymentData.network === 'sepolia' ? '11155111' : '31337'}
RPC_URL=${rpcUrl}
  `.trim();

  // Preserve existing env variables like PRIVATE_KEY if present
  let existingEnv = '';
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const privateKeyMatch = envContent.match(/PRIVATE_KEY=.+/);
    if (privateKeyMatch) {
      existingEnv = `\n${privateKeyMatch[0]}`;
    }
  }

  fs.writeFileSync(envPath, envContent + existingEnv);
  console.log('Created .env with contract addresses');
} catch (error) {
  console.error('Failed to generate contract config:', error);
  process.exit(1);
} 