import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import logger from "./utils/logger";

/**
 * Script to withdraw unclaimed tokens after the airdrop period has ended
 * 
 * Usage:
 * Run: yarn hardhat run scripts/withdraw-unclaimed.ts --network <network-name>
 */

async function main() {
  logger.info("Starting withdrawal of unclaimed tokens...");
  
  // Load deployment data
  const deploymentPath = path.join(__dirname, "../data/deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    logger.error("Deployment data not found. Please deploy contracts first.");
    process.exit(1);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const airdropAddress = deploymentData.airdrop;
  const tokenAddress = deploymentData.token;
  
  logger.info(`Using airdrop contract at: ${airdropAddress}`);
  logger.info(`Using token contract at: ${tokenAddress}`);
  
  // Get signer
  const [signer] = await ethers.getSigners();
  logger.info(`Using signer: ${signer.address}`);
  
  // Get contracts
  const airdrop = await ethers.getContractAt("AtherlabsAirdrop", airdropAddress);
  const token = await ethers.getContractAt("AtherlabsToken", tokenAddress);
  
  // Check if the airdrop has ended
  const hasEnded = await airdrop.hasEnded();
  if (!hasEnded) {
    logger.error("Airdrop has not ended yet. Cannot withdraw unclaimed tokens.");
    
    // Check when it will end
    const endTime = await airdrop.endTime();
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = Number(endTime) - currentTime;
    
    if (remainingTime > 0) {
      const days = Math.floor(remainingTime / (60 * 60 * 24));
      const hours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
      
      logger.info(`Airdrop will end in: ${days} days, ${hours} hours, ${minutes} minutes`);
      logger.info(`End time: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
    } else {
      logger.warn("Airdrop end time has passed, but the contract reports it hasn't ended.");
      logger.warn("This may be due to a block timestamp discrepancy.");
    }
    
    logger.info("\nWould you like to force extend the airdrop end time to now? (y/n)");
    const shouldForceEnd = await promptContinue();
    
    if (shouldForceEnd) {
      // Set end time to current time minus 1 hour to ensure it's recognized as ended
      const newEndTime = currentTime - 3600;
      try {
        logger.info(`Setting end time to ${new Date(newEndTime * 1000).toLocaleString()}...`);
        const tx = await airdrop.updateAirdrop(await airdrop.amountPerAddress(), newEndTime);
        await tx.wait();
        logger.success("Airdrop end time updated successfully!");
      } catch (error) {
        logger.error("Failed to update airdrop end time:", error);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
  
  // Get available tokens in the airdrop contract
  const availableTokens = await airdrop.getAvailableTokens();
  logger.info(`Available tokens in the airdrop contract: ${ethers.formatEther(availableTokens)} ATHER`);
  
  if (availableTokens === 0n) {
    logger.info("No tokens to withdraw.");
    process.exit(0);
  }
  
  // Ask for confirmation
  logger.info(`\nYou are about to withdraw ${ethers.formatEther(availableTokens)} ATHER tokens to ${signer.address}.`);
  logger.info("Continue? (y/n)");
  
  const shouldContinue = await promptContinue();
  if (!shouldContinue) {
    logger.info("Withdrawal cancelled by user.");
    process.exit(0);
  }
  
  // Withdraw unclaimed tokens
  try {
    logger.info("\nWithdrawing unclaimed tokens...");
    const tx = await airdrop.withdrawUnclaimedTokens(signer.address);
    logger.info(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    logger.info(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    // Verify the token balance
    const newBalance = await token.balanceOf(signer.address);
    logger.info(`Your new token balance: ${ethers.formatEther(newBalance)} ATHER`);
    
    // Create withdrawal report
    const reportData = {
      timestamp: new Date().toISOString(),
      withdrawnBy: signer.address,
      amount: ethers.formatEther(availableTokens),
      transactionHash: tx.hash,
    };
    
    const reportPath = path.join(__dirname, "../data/withdrawal-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    logger.info(`Withdrawal report saved to ${reportPath}`);
    
    logger.success("\n✅ Unclaimed tokens successfully withdrawn!");
  } catch (error) {
    logger.error("Failed to withdraw unclaimed tokens:", error);
    process.exit(1);
  }
}

async function promptContinue(): Promise<boolean> {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question("> ", (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Execute the script
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 