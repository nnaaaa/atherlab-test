import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Utility to generate an HTML file with a chart visualizing benchmark results
 */
async function visualizeBenchmark() {
  const benchmarkPath = path.join(__dirname, '../../data/batch-size-benchmark.json');
  
  if (!fs.existsSync(benchmarkPath)) {
    logger.error('Benchmark data not found. Run a benchmark first.');
    process.exit(1);
  }
  
  const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  
  // Only include successful results
  const results = benchmarkData.results.filter((r: any) => r.status === 'success');
  
  if (results.length === 0) {
    logger.error('No successful benchmark results found.');
    process.exit(1);
  }
  
  // Sort by batch size
  results.sort((a: any, b: any) => a.batchSize - b.batchSize);
  
  // Extract data for the chart
  const batchSizes = results.map((r: any) => r.batchSize);
  const gasUsedValues = results.map((r: any) => Number(r.gasUsed));
  const gasPerAddressValues = results.map((r: any) => Number(r.gasPerAddress));
  
  // Find the optimal batch size (lowest gas per address)
  const optimal = results.reduce((prev: any, curr: any) => 
    Number(prev.gasPerAddress) < Number(curr.gasPerAddress) ? prev : curr
  );
  
  // Create a simple HTML file with a chart
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Batch Distribution Gas Benchmark</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 40px;
    }
    .summary {
      margin-top: 30px;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .optimal {
      font-weight: bold;
      color: green;
    }
  </style>
</head>
<body>
  <h1>Batch Distribution Gas Benchmark</h1>
  
  <div class="chart-container">
    <canvas id="gasChart"></canvas>
  </div>
  
  <div class="chart-container">
    <canvas id="gasPerAddressChart"></canvas>
  </div>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Total addresses in whitelist: ${benchmarkData.totalAddresses}</p>
    <p>Optimal batch size: <span class="optimal">${optimal.batchSize}</span> (${optimal.gasPerAddress} gas per address)</p>
    
    <h3>Detailed Results</h3>
    <table>
      <thead>
        <tr>
          <th>Batch Size</th>
          <th>Total Gas</th>
          <th>Gas per Address</th>
          <th>Transaction Hash</th>
        </tr>
      </thead>
      <tbody>
        ${results.map((r: any) => `
          <tr ${r.batchSize === optimal.batchSize ? 'class="optimal"' : ''}>
            <td>${r.batchSize}</td>
            <td>${r.gasUsed}</td>
            <td>${r.gasPerAddress}</td>
            <td><a href="https://etherscan.io/tx/${r.txHash}" target="_blank">${r.txHash.substring(0, 10)}...</a></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <script>
    // Create total gas used chart
    const ctx1 = document.getElementById('gasChart').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(batchSizes)},
        datasets: [{
          label: 'Total Gas Used',
          data: ${JSON.stringify(gasUsedValues)},
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Gas Used'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Batch Size'
            }
          }
        }
      }
    });
    
    // Create gas per address chart
    const ctx2 = document.getElementById('gasPerAddressChart').getContext('2d');
    new Chart(ctx2, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(batchSizes)},
        datasets: [{
          label: 'Gas per Address',
          data: ${JSON.stringify(gasPerAddressValues)},
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Gas per Address'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Batch Size'
            }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;
  
  // Write the HTML file
  const htmlPath = path.join(__dirname, '../../data/batch-benchmark-chart.html');
  fs.writeFileSync(htmlPath, html);
  
  logger.success(`Chart generated at ${htmlPath}`);
  logger.info('Open this file in a browser to view the benchmark results.');
}

// Run the script directly if called
if (require.main === module) {
  visualizeBenchmark().catch(error => {
    logger.error(error);
    process.exit(1);
  });
}

export default visualizeBenchmark; 