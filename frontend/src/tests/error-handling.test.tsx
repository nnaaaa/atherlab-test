import { AirdropCard } from '@/components/airdrop/AirdropCard';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { formatEther } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

// Mock wagmi modules and dependencies
jest.mock('@/lib/wagmiConfig', () => ({
  config: {}
}));

// Mock the hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  createConfig: jest.fn(() => ({})),
  http: jest.fn((url) => ({ url })),
  sepolia: { id: 11155111, name: 'Sepolia' }
}));

jest.mock('wagmi/chains', () => ({
  sepolia: { id: 11155111, name: 'Sepolia' }
}));

jest.mock('wagmi/connectors', () => ({
  injected: jest.fn(),
  metaMask: jest.fn()
}));

jest.mock('viem', () => ({
  formatEther: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('Error Handling', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined
    });
    
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: null,
      isPending: false
    });
    
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false
    });
    
    (formatEther as jest.Mock).mockImplementation((value) => {
      if (value === BigInt(100)) return '100';
      if (value === BigInt(1000000)) return '1000000';
      if (value === BigInt(0)) return '0';
      return '0';
    });
  });
  
  test('displays error when API call fails', async () => {
    // Mock fetch failure
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    );
    
    render(<AirdropCard />);
    
    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('Unable to fetch eligibility data');
  });
  
  test('displays error when transaction fails', async () => {
    // Mock successful fetch
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ proof: ['0xproof1', '0xproof2'] }),
      })
    );
    
    // Mock transaction error
    const mockError = new Error('Transaction failed: insufficient funds');
    const mockWriteContract = jest.fn().mockImplementation(() => {
      throw mockError;
    });
    
    // Setup eligibility
    (useReadContract as jest.Mock).mockImplementation(({ functionName }) => {
      switch (functionName) {
        case 'endTime':
          return { data: BigInt(Math.floor(Date.now() / 1000) + 3600) }; // 1 hour from now
        case 'getRemainingTime':
          return { data: BigInt(3600), refetch: jest.fn() }; // 1 hour
        case 'paused':
          return { data: false };
        case 'hasEnded':
          return { data: false };
        case 'hasClaimed':
          return { data: false };
        case 'getAvailableTokens':
          return { data: BigInt(1000000) };
        case 'amountPerAddress':
          return { data: BigInt(100) };
        case 'isEligible':
          return { data: true };
        case 'balanceOf':
          return { data: BigInt(0) };
        default:
          return { data: undefined };
      }
    });
    
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: null,
      isPending: false,
      error: mockError
    });
    
    render(<AirdropCard />);
    
    // Wait for fetch to be called and component to update
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Find and click the claim button
    const claimButton = await screen.findByTestId('claim-button');
    fireEvent.click(claimButton);
    
    // Should show error toast
    expect(toast.error).toHaveBeenCalled();
  });
  
  test('handles network connection issues gracefully', async () => {
    // Mock network error
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Network Error'))
    );
    
    render(<AirdropCard />);
    
    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show network error toast
    expect(toast.error).toHaveBeenCalledWith('Unable to connect to the server');
  });
  
  test('displays form validation errors', async () => {
    // Mock successful fetch
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ proof: ['0xproof1', '0xproof2'] }),
      })
    );
    
    // Mock eligibility status
    (useReadContract as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === 'isEligible') {
        return { 
          data: false,
          error: null
        };
      }
      return { data: undefined };
    });
    
    render(<AirdropCard />);
    
    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show the not eligible status
    const notEligibleText = screen.getByText('Not Eligible');
    expect(notEligibleText).toBeInTheDocument();
  });
  
  test('handles unauthorized access attempts', async () => {
    // Mock fetch unauthorized
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })
    );
    
    render(<AirdropCard />);
    
    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show unauthorized toast
    expect(toast.error).toHaveBeenCalledWith('You are not authorized to access this resource');
  });
  
  test('shows fallback UI when component crashes', async () => {
    // Force an error during render
    (useReadContract as jest.Mock).mockImplementation(() => {
      throw new Error('Component crashed');
    });
    
    // In a real app, you would use an error boundary component
    // For this test, we're just checking that the error is thrown
    expect(() => {
      render(<AirdropCard />);
    }).toThrow();
  });
}); 