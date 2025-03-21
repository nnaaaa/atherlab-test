# Atherlabs Airdrop Scripts

This directory contains various scripts for managing and benchmarking the Atherlabs token airdrop.

## Batch Distribution Gas Benchmark

To compare gas usage for different batch sizes, we've created a comprehensive benchmarking setup:

### Option 1: Automated Setup and Benchmark (Recommended)

This approach automates generating test addresses, creating a Merkle tree, deploying contracts, and running the benchmark in a single command.

**Prerequisites:**
- Make sure you have a local Hardhat node running: `yarn node` (in a separate terminal)

**Run the full process:**
```bash
yarn setup-and-benchmark
```

This script:
1. Generates 98 test addresses (or specify a custom number with `--count`)
2. Creates a Merkle tree from those addresses
3. Deploys the contracts to your local node
4. Runs the gas benchmark for different batch sizes
5. Generates a visual report

### Option 2: Step-by-Step Approach

If you prefer running each step manually:

1. **Generate test addresses**:
   ```bash
   yarn generate-test-addresses [--count 98] [--force]
   ```
   The `--force` flag will delete any existing address file and create a new one.

2. **Generate the Merkle tree**:
   ```bash
   yarn generate-merkle
   ```

3. **Deploy contracts** (requires a running Hardhat node):
   ```bash
   yarn deploy:local
   ```

4. **Run the benchmark**:
   ```bash
   yarn gas-benchmark:local
   ```

5. **View visualization** (if you want to regenerate it separately):
   ```bash
   yarn visualize-benchmark
   ```

## Understanding Results

After running the benchmark, you'll find:
- A JSON report at `data/batch-size-benchmark.json`
- An HTML visualization at `data/batch-benchmark-chart.html`

The visualization includes:
- A bar chart of total gas used per batch size
- A line chart of gas used per address for each batch size
- A table with detailed results
- Highlighting of the optimal batch size (lowest gas per address)

## Testing with More Addresses

You can generate more test addresses by specifying the count:
```bash
yarn generate-test-addresses --count 500
```

Then follow the normal benchmark process to test with a larger dataset. 