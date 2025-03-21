import { exec } from 'child_process';
import util from 'util';
import logger from './utils/logger';
import visualizeBenchmark from './utils/visualize-benchmark';

const execPromise = util.promisify(exec);

/**
 * Script to run the gas benchmark and visualize the results
 */
async function main() {
  logger.info('Starting batch distribution gas benchmark process...');
  
  try {
    // Determine the network to use
    const args = process.argv.slice(2);
    const networkOption = args.indexOf('--network');
    const network = networkOption !== -1 && networkOption < args.length - 1 
      ? args[networkOption + 1] 
      : 'localhost'; // Default to localhost
    
    logger.info(`Running benchmark on network: ${network}`);
    
    // Step 1: Run the benchmark
    logger.info('Running gas benchmark...');
    await execPromise(`npx hardhat run scripts/benchmark-batch-distribution.ts --network ${network}`);
    
    // Step 2: Generate visualization
    logger.info('Generating visualization...');
    await visualizeBenchmark();
    
    logger.success('Benchmark and visualization completed successfully!');
    logger.info('Open the generated HTML file to view the results.');
    
  } catch (error) {
    logger.error('Error running benchmark:', error);
    process.exit(1);
  }
}

// Execute the script
main().catch(error => {
  logger.error(error);
  process.exit(1);
}); 