// Mock for wagmi/core
export const watchContractEvent = jest.fn((...args) => {
  // Return a mock unwatch function regardless of args format
  return jest.fn();
});

// Mock other wagmi functions as needed
export const readContract = jest.fn();
export const writeContract = jest.fn();
export const waitForTransactionReceipt = jest.fn();
export const getPublicClient = jest.fn();

// Mock for connectors
export const injected = jest.fn(); 