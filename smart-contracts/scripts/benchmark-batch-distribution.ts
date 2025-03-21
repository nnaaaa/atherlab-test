import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import logger from "./utils/logger";

async function main() {
  logger.info("Starting batch distribution gas benchmark...");
  
  // Get deployer account (must be the contract owner)
  const [deployer] = await ethers.getSigners();
  logger.info(`Using account: ${deployer.address}`);
  logger.info(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Load deployment data
  const deploymentPath = path.join(__dirname, "../data/deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    logger.error("Deployment data not found. Please deploy the contracts first.");
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const airdropAddress = deploymentData.airdrop;
  logger.info(`Using AtherlabsAirdrop at: ${airdropAddress}`);
  
  // Load whitelist data
  const whitelistPath = path.join(__dirname, "../data/whitelist.json");
  if (!fs.existsSync(whitelistPath)) {
    logger.error("Whitelist data not found. Please generate the merkle tree first.");
    process.exit(1);
  }
  
  const whitelistData = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));
  const addresses = whitelistData.addresses;
  const addressToProofMap = whitelistData.addressToProofMap;
  
  logger.info(`Found ${addresses.length} addresses in the whitelist`);
  
  // Get the AtherlabsAirdrop contract
  const airdropContract = await ethers.getContractAt("AtherlabsAirdrop", airdropAddress);
  
  // Define different batch sizes to test
  const batchSizes = [10, 20, 50, 70, 90, 100, 110];
  
  // Results object
  const benchmarkResults = {
    totalAddresses: addresses.length,
    results: [] as {
      batchSize: number;
      gasUsed: string;
      gasPerAddress: string;
      txHash: string;
      status: string;
    }[]
  };
  
  // Test each batch size
  for (const batchSize of batchSizes) {
    // Skip if batch size is larger than available addresses
    if (batchSize > addresses.length) {
      logger.warn(`Skipping batch size ${batchSize} as it exceeds available addresses`);
      continue;
    }
    
    logger.info(`\nTesting batch size: ${batchSize}`);
    
    // Create a batch of specified size
    const batch = addresses.slice(0, batchSize);
    const batchAddresses = batch.map((addr: string) => addr);
    const batchProofs = batch.map((addr: string) => addressToProofMap[addr]);
    
    try {
      // Estimate gas first
      const gasEstimate = await airdropContract.distributeBatch.estimateGas(
        batchAddresses, 
        batchProofs
      );
      logger.info(`Gas estimate for batch size ${batchSize}: ${gasEstimate.toString()}`);
      
      // Execute the transaction
      const tx = await airdropContract.distributeBatch(batchAddresses, batchProofs);
      logger.info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      if (receipt) {
        const gasUsed = receipt.gasUsed.toString();
        const gasPerAddress = (Number(gasUsed) / batchSize).toFixed(0);
        
        logger.success(`Gas used for batch size ${batchSize}: ${gasUsed}`);
        logger.success(`Gas per address: ${gasPerAddress}`);
        
        benchmarkResults.results.push({
          batchSize,
          gasUsed,
          gasPerAddress,
          txHash: tx.hash,
          status: "success"
        });
      }
    } catch (error) {
      logger.error(`Error with batch size ${batchSize}:`, error);
      benchmarkResults.results.push({
        batchSize,
        gasUsed: "0",
        gasPerAddress: "0",
        txHash: "",
        status: "error"
      });
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Save benchmark results
  const benchmarkPath = path.join(__dirname, "../data/batch-size-benchmark.json");
  fs.writeFileSync(benchmarkPath, JSON.stringify(benchmarkResults, null, 2));
  logger.info(`\nBenchmark results saved to ${benchmarkPath}`);
  
  // Print summary
  logger.success("\nBenchmark Summary:");
  benchmarkResults.results.forEach(result => {
    if (result.status === "success") {
      logger.info(`Batch Size: ${result.batchSize}, Gas Used: ${result.gasUsed}, Gas/Address: ${result.gasPerAddress}`);
    } else {
      logger.error(`Batch Size: ${result.batchSize}, Status: Failed`);
    }
  });
  
  // Find optimal batch size (lowest gas per address)
  const successfulResults = benchmarkResults.results.filter(r => r.status === "success");
  if (successfulResults.length > 0) {
    const optimal = successfulResults.reduce((prev, curr) => 
      Number(prev.gasPerAddress) < Number(curr.gasPerAddress) ? prev : curr
    );
    
    logger.success(`\nOptimal batch size: ${optimal.batchSize} (${optimal.gasPerAddress} gas per address)`);
  }
}

// Execute the benchmark
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 