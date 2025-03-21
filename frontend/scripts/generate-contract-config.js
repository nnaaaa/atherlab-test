// This script can be run during build to generate the contract config
const fs = require('fs');
const path = require('path');

// Load deployment data from smart contracts
const deploymentPath = path.join(__dirname, '../../smart-contracts/data/deployment.json');
let deploymentData;

try {
  if (fs.existsSync(deploymentPath)) {
    deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log('Loaded contract addresses from deployment data');
  } else {
    console.warn('No deployment data found, using default values');
    deploymentData = {
      token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      airdrop: process.env.NEXT_PUBLIC_AIRDROP_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      network: 'localhost'
    };
  }

  // Create the .env.local file with the contract addresses
  const envContent = `
# This file is auto-generated from the deployment data
NEXT_PUBLIC_SUPPORTED_CHAIN_ID=${deploymentData.network === 'sepolia' ? '11155111' : '31337'}
NEXT_PUBLIC_AIRDROP_ADDRESS=${deploymentData.airdrop}
NEXT_PUBLIC_TOKEN_ADDRESS=${deploymentData.token}
  `.trim();

  fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
  console.log('Created .env.local with contract addresses');
} catch (error) {
  console.error('Failed to generate contract config:', error);
  process.exit(1);
} 