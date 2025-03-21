import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger';

/**
 * Generate a specified number of random Ethereum addresses
 * @param count Number of addresses to generate
 * @returns Array of addresses
 */
function generateRandomAddresses(count: number): string[] {
  const addresses: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random wallet
    const wallet = ethers.Wallet.createRandom();
    addresses.push(wallet.address);
  }
  
  return addresses;
}

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.indexOf('--count');
  const count = countArg !== -1 && countArg < args.length - 1 
    ? parseInt(args[countArg + 1], 10) 
    : 98; // Default to 98 addresses
  
  // Add force option to overwrite existing file
  const forceOverwrite = args.includes('--force');
  
  logger.info(`Generating ${count} test addresses...`);
  
  const addresses = generateRandomAddresses(count);
  
  // Check if address.json exists
  const dataDir = path.join(__dirname, '../data');
  const addressFilePath = path.join(dataDir, 'address.json');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Handle force overwrite option
  if (forceOverwrite && fs.existsSync(addressFilePath)) {
    logger.warn(`Force option detected. Deleting existing address file.`);
    fs.unlinkSync(addressFilePath);
  }
  
  // Load existing addresses or create new array
  let existingData: { addresses: string[] } = { addresses: [] };
  
  if (fs.existsSync(addressFilePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(addressFilePath, 'utf8'));
      
      // Ensure the addresses property exists and is an array
      if (!existingData.addresses || !Array.isArray(existingData.addresses)) {
        logger.warn('Existing address file has invalid format. Creating a new addresses array.');
        existingData.addresses = [];
      } else {
        logger.info(`Loaded ${existingData.addresses.length} existing addresses`);
      }
    } catch (error) {
      logger.error('Error reading existing address file, creating new one');
      existingData = { addresses: [] };
    }
  }
  
  // Add new addresses
  const allAddresses = [...existingData.addresses, ...addresses];
  
  // Write the updated addresses
  const addressData = {
    addresses: allAddresses
  };
  
  fs.writeFileSync(addressFilePath, JSON.stringify(addressData, null, 2));
  logger.success(`Successfully generated and saved ${count} test addresses`);
  logger.info(`Total addresses: ${allAddresses.length}`);
  logger.info(`Address file path: ${path.resolve(addressFilePath)}`);
  
  // Print instructions for next steps
  logger.info('\nNext steps:');
  logger.info('1. Generate the Merkle tree: yarn generate-merkle');
  logger.info('2. Start a local node (in another terminal): yarn node');
  logger.info('3. Deploy the contracts: yarn deploy:local');
  logger.info('4. Run the gas benchmark: yarn gas-benchmark:local');
}

// Execute the script
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 