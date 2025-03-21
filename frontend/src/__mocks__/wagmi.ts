// Mock wagmi hooks
export const useAccount = jest.fn(() => ({
  address: '0x123',
  isConnected: true,
}));

export const useReadContract = jest.fn(() => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
}));

export const useWaitForTransactionReceipt = jest.fn(() => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
}));

export const useWriteContract = jest.fn(() => ({
  writeContract: jest.fn(),
  data: undefined,
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
}));

// This function no longer exists in wagmi v2 but we're keeping it for backward compatibility in tests
export const useWatchContractEvent = jest.fn();

// Mock for createConfig
export const createConfig = jest.fn(() => ({}));
export const http = jest.fn((url) => ({ url }));

// Export mocked chains object
export const chains = {
  sepolia: { id: 11155111, name: 'Sepolia' }
};

// Export the chains module
export const sepolia = { id: 11155111, name: 'Sepolia' }; 