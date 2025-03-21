import { exec } from 'child_process';
import util from 'util';
import logger from './utils/logger';

const execPromise = util.promisify(exec);

/**
 * Script to set up test addresses, generate merkle tree, deploy contracts, and run benchmark
 */
async function main() {
  logger.info('Starting complete setup and benchmark process...');
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const countArg = args.indexOf('--count');
    const addressCount = countArg !== -1 && countArg < args.length - 1 
      ? args[countArg + 1] 
      : '98';
    
    // Step 1: Generate test addresses
    logger.info('\n=== STEP 1: Generating test addresses ===');
    logger.info(`Generating ${addressCount} test addresses...`);
    
    try {
      const generateResult = await execPromise(`ts-node scripts/generate-test-addresses.ts --count ${addressCount} --force`);
      if (generateResult.stdout) {
        logger.info(generateResult.stdout);
      }
    } catch (error: any) {
      logger.error('Error generating test addresses:');
      if (error.stdout) logger.info(error.stdout);
      if (error.stderr) logger.error(error.stderr);
      throw new Error('Address generation failed');
    }
    
    // Step 2: Generate merkle tree
    logger.info('\n=== STEP 2: Generating Merkle tree ===');
    try {
      const merkleResult = await execPromise('yarn generate-merkle');
      if (merkleResult.stdout) {
        logger.info(merkleResult.stdout);
      }
    } catch (error: any) {
      logger.error('Error generating Merkle tree:');
      if (error.stdout) logger.info(error.stdout);
      if (error.stderr) logger.error(error.stderr);
      throw new Error('Merkle tree generation failed');
    }
    
    // Step 3: Deploy contracts to local network
    logger.info('\n=== STEP 3: Deploying contracts ===');
    try {
      const deployResult = await execPromise('yarn deploy:local');
      if (deployResult.stdout) {
        logger.info(deployResult.stdout);
      }
    } catch (error: any) {
      logger.error('Error deploying contracts:');
      if (error.stdout) logger.info(error.stdout);
      if (error.stderr) logger.error(error.stderr);
      throw new Error('Contract deployment failed');
    }
    
    // Step 4: Run gas benchmark
    logger.info('\n=== STEP 4: Running gas benchmark ===');
    try {
      const benchmarkResult = await execPromise('yarn gas-benchmark:local');
      if (benchmarkResult.stdout) {
        logger.info(benchmarkResult.stdout);
      }
    } catch (error: any) {
      logger.error('Error running gas benchmark:');
      if (error.stdout) logger.info(error.stdout);
      if (error.stderr) logger.error(error.stderr);
      throw new Error('Gas benchmark failed');
    }
    
    logger.success('\n✅ Complete process finished successfully!');
    logger.info('You can view the benchmark results in data/batch-benchmark-chart.html');
    
  } catch (error) {
    logger.error('Error during setup and benchmark process:', error);
    process.exit(1);
  }
}

// Execute the script
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 