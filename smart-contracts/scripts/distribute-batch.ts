import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import logger from "./utils/logger";

async function main() {
  logger.info("Starting batch distribution process...");
  
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
  
  // Get the MAX_BATCH_SIZE - since it's private in the contract, we'll use 100 as defined in the contract
  const MAX_BATCH_SIZE = 100;
  
  // Split addresses into batches
  const batches = [];
  for (let i = 0; i < addresses.length; i += MAX_BATCH_SIZE) {
    batches.push(addresses.slice(i, i + MAX_BATCH_SIZE));
  }
  
  logger.info(`Split addresses into ${batches.length} batches`);
  
  // Define types for batch result
  interface BatchResult {
    batchIndex: number;
    batchSize: number;
    successCount: number;
    txHash?: string;
    gasUsed?: string;
    error?: string;
  }
  
  // Distribution report
  const distributionReport = {
    totalBatches: batches.length,
    totalAddresses: addresses.length,
    successfulDistributions: 0,
    failedDistributions: 0,
    batchResults: [] as BatchResult[],
  };
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.info(`\nProcessing batch ${i + 1}/${batches.length} with ${batch.length} addresses...`);
    
    // Prepare batch arrays
    const batchAddresses = batch.map((addr: string) => addr);
    const batchProofs = batch.map((addr: string) => addressToProofMap[addr]);
    
    try {
      logger.info(`Distributing tokens to ${batchAddresses.length} addresses...`);
      
      // Call distributeBatch
      const tx = await airdropContract.distributeBatch(batchAddresses, batchProofs);
      logger.info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      let claimedCount = 0;
      if (receipt) {
        // Try to find the BatchClaimed event
        for (const log of receipt.logs) {
          try {
            const event = airdropContract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            if (event && event.name === 'BatchClaimed') {
              claimedCount = Number(event.args.numClaimed);
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }
      
      logger.success(`Successfully distributed tokens to ${claimedCount} addresses in batch ${i + 1}`);
      distributionReport.successfulDistributions += claimedCount;
      
      distributionReport.batchResults.push({
        batchIndex: i,
        batchSize: batch.length,
        successCount: claimedCount,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString(),
      });
    } catch (error) {
      logger.error(`Error processing batch ${i + 1}:`, error);
      distributionReport.failedDistributions += batch.length;
      
      distributionReport.batchResults.push({
        batchIndex: i,
        batchSize: batch.length,
        successCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  // Save distribution report
  distributionReport.failedDistributions = addresses.length - distributionReport.successfulDistributions;
  
  const reportPath = path.join(__dirname, "../data/batch-distribution-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(distributionReport, null, 2));
  logger.info(`\nDistribution report saved to ${reportPath}`);
  
  logger.success("\nBatch distribution completed!");
  logger.success(`Successfully distributed to ${distributionReport.successfulDistributions}/${addresses.length} addresses`);
}

// Execute the batch distribution
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 