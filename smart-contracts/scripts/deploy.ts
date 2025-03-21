import fs from "fs";
import { ethers } from "hardhat";
import path from "path";
import logger from "./utils/logger";

async function main() {
  logger.info("Starting deployment process...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  logger.info(`Deploying contracts with the account: ${deployer.address}`);
  logger.info(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Load whitelist addresses if available
  let merkleRoot = "";
  try {
    // Try to load from deployParams.json first
    const deployParamsPath = path.join(__dirname, "../data/deployParams.json");
    if (fs.existsSync(deployParamsPath)) {
      const deployParams = JSON.parse(fs.readFileSync(deployParamsPath, "utf8"));
      merkleRoot = deployParams.merkleRoot;
      logger.info(`Loaded Merkle root from deployParams.json: ${merkleRoot}`);
    } else {
      // Try to load from whitelist.json
      const whitelistPath = path.join(__dirname, "../data/whitelist.json");
      if (fs.existsSync(whitelistPath)) {
        const whitelistData = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));
        merkleRoot = whitelistData.merkleRoot;
        logger.info(`Loaded Merkle root from whitelist.json: ${merkleRoot}`);
      } 
    }
  } catch (error) {
    logger.error("Error loading whitelist:", error);
    process.exit(1);
  }
  
  // Deploy token contract
  logger.info("\nDeploying AtherlabsToken contract...");
  const AtherlabsToken = await ethers.getContractFactory("AtherlabsToken");
  const token = await AtherlabsToken.deploy(deployer.address);
  await token.waitForDeployment();
  
  const tokenAddress = await token.getAddress();
  logger.success(`AtherlabsToken deployed to: ${tokenAddress}`);
  
  // Set up airdrop parameters
  const amountPerUser = ethers.parseEther("100"); // 100 tokens per user
  const airdropDuration = 60 * 60 * 24 * 30; // 30 days
  const endTime = Math.floor(Date.now() / 1000) + airdropDuration;
  
  // Deploy airdrop contract
  logger.info("\nDeploying AtherlabsAirdrop contract...");
  const AtherlabsAirdrop = await ethers.getContractFactory("AtherlabsAirdrop");
  const airdrop = await AtherlabsAirdrop.deploy(
    tokenAddress,
    amountPerUser,
    merkleRoot,
    endTime
  );
  await airdrop.waitForDeployment();
  
  const airdropAddress = await airdrop.getAddress();
  logger.success(`AtherlabsAirdrop deployed to: ${airdropAddress}`);
  
  // Mint tokens to the airdrop contract
  logger.info("\nMinting tokens to the airdrop contract...");
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
  const mintTx = await token.mint(airdropAddress, initialSupply);
  await mintTx.wait();
  logger.success(`Minted ${ethers.formatEther(initialSupply)} tokens to the airdrop contract`);
  
  // Save deployment information
  const deploymentData = {
    token: tokenAddress,
    airdrop: airdropAddress,
    network: (await ethers.provider.getNetwork()).name || (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    merkleRoot,
    amountPerUser: amountPerUser.toString(),
    endTime: endTime.toString(),
    initialSupply: initialSupply.toString(),
  };
  
  // Create the data directory if it doesn't exist
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const deploymentPath = path.join(dataDir, "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  logger.info(`\nDeployment information saved to ${deploymentPath}`);
  
  logger.success("\nDeployment completed successfully!");
  logger.success(`AtherlabsToken: ${tokenAddress}`);
  logger.success(`AtherlabsAirdrop: ${airdropAddress}`);
}

// Execute the deployment
main().catch(error => {
  logger.error(error);
  console.error(error);
  process.exit(1);
}); 