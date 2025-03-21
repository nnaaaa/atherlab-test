import { ethers } from "ethers";
import fs from "fs";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import path from "path";
import logger from "./utils/logger";

/**
 * Generates a Merkle tree and root from a list of addresses
 * 
 * Usage:
 * 1. Create a CSV file with one address per line
 * 2. Run: yarn generate-merkle --file <path-to-csv>
 */

// Function to generate a Merkle tree and root from a list of addresses
function generateMerkleTreeAndRoot(addresses: string[]): {
  merkleTree: MerkleTree;
  merkleRoot: string;
  addressToProofMap: Record<string, string[]>;
} {
  // Validate and normalize addresses
  const validAddresses = addresses
    .filter(addr => ethers.isAddress(addr))
    .map(addr => addr.toLowerCase());

  // Sort addresses to ensure consistent tree generation
  validAddresses.sort();

  // Create leaf nodes by hashing the addresses
  const leafNodes = validAddresses.map(addr => keccak256(addr));
  
  // Create the Merkle tree
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  
  // Get the Merkle root
  const merkleRoot = merkleTree.getHexRoot();
  
  logger.success(`Generated Merkle Root: ${merkleRoot}`);
  logger.success(`Number of addresses: ${validAddresses.length}`);
  
  // Generate proofs for each address
  const addressToProofMap: Record<string, string[]> = {};
  
  validAddresses.forEach(address => {
    const leaf = keccak256(address);
    const proof = merkleTree.getHexProof(leaf);
    addressToProofMap[address] = proof;
  });
  
  return {
    merkleTree,
    merkleRoot,
    addressToProofMap,
  };
}

// Main function
async function main() {
  logger.info("Starting Merkle root generation...");
  
  // Get correct file paths relative to script location
  const dataDir = path.join(__dirname, '../data');
  const filePath = path.join(dataDir, 'address.json');
  const outputPath = path.join(dataDir, 'whitelist.json');
  
  // Read addresses from file
  try {
    // Ensure the directories exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      logger.error(`Address file not found at ${filePath}`);
      logger.error('Please generate addresses first using yarn generate-test-addresses');
      process.exit(1);
    }
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse addresses from the file content
    let addresses: string[] = [];
    
    try {
      const jsonData = JSON.parse(fileContent);
      
      if (jsonData && Array.isArray(jsonData.addresses)) {
        addresses = jsonData.addresses;
      } else {
        logger.error('JSON file should contain an "addresses" array property.');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Error parsing JSON file:', error);
      process.exit(1);
    }
    
    if (addresses.length === 0) {
      logger.error('No addresses found in the file.');
      process.exit(1);
    }
    
    logger.success(`Read ${addresses.length} addresses from ${filePath}`);
    
    // Generate the Merkle tree and root
    const { merkleRoot, addressToProofMap } = generateMerkleTreeAndRoot(addresses);
    
    // Create the output data
    const outputData = {
      merkleRoot,
      addresses: Object.keys(addressToProofMap),
      addressToProofMap,
    };
    
    // Save to output file
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    logger.success(`Whitelist and proofs saved to ${outputPath}`);
    
    // Also output a deployParams.json that can be used for deployment
    const deployParamsPath = path.join(dataDir, 'deployParams.json');
    const deployParams = {
      merkleRoot,
      whitelistSize: Object.keys(addressToProofMap).length,
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(deployParamsPath, JSON.stringify(deployParams, null, 2));
    logger.success(`Deployment parameters saved to ${deployParamsPath}`);
    
  } catch (error) {
    logger.error('Error processing addresses file:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 