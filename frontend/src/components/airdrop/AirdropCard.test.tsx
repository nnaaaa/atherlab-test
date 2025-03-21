import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { formatEther } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { AirdropCard } from './AirdropCard';

// First add necessary mocks for wagmi-related imports
jest.mock('@/lib/wagmiConfig', () => ({
  config: {}
}));

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

// Mock the hooks
jest.mock('viem', () => ({
  formatEther: jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock fetch for Merkle proof
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ proof: ['0xproof1', '0xproof2'] }),
  })
);

describe('AirdropCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useAccount as jest.Mock).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true
    });
    
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
        case 'isClaimed':
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
    
    (formatEther as jest.Mock).mockImplementation((value) => {
      if (value === BigInt(100)) return '100';
      if (value === BigInt(1000000)) return '1000000';
      if (value === BigInt(0)) return '0';
      return '0';
    });
    
    const mockClaim = jest.fn();
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockClaim,
      data: '0xtxhash',
      isPending: false
    });
    
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false
    });
  });
  
  test('renders eligible user with claim button', async () => {
    render(<AirdropCard />);
    
    // Wait for component to fetch Merkle proof and update state
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show eligible status
    expect(screen.getByText('Eligible')).toBeInTheDocument();
    
    // Should show allocation amount
    expect(screen.getByText(/100/)).toBeInTheDocument();
    
    // Should have a claim button that is enabled
    const claimButton = screen.getByTestId('claim-button');
    expect(claimButton).toBeInTheDocument();
    expect(claimButton).not.toBeDisabled();
  });
  
  test('displays claiming state during transaction processing', async () => {
    // Mock pending transaction
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: '0xtxhash',
      isPending: true
    });
    
    render(<AirdropCard />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Should show claiming state
    expect(screen.getByText(/Waiting for Confirmation/i)).toBeInTheDocument();
    
    // Claim button should be disabled during transaction
    const claimButton = screen.getByTestId('claim-button');
    expect(claimButton).toBeDisabled();
  });
  
  test('shows success message after successful claim', async () => {
    // Setup initial state
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: '0xtxhash',
      isPending: false
    });
    
    // Mock successful transaction
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: true
    });
    
    render(<AirdropCard />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Check that success toast was called
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });
  
  test('shows already claimed message for users who already claimed', async () => {
    // Mock has claimed
    (useReadContract as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === 'isClaimed') {
        return { data: true };
      }
      return { data: undefined };
    });
    
    render(<AirdropCard />);
    
    // Should show claimed status
    await waitFor(() => {
      expect(screen.getByText('Claimed')).toBeInTheDocument();
    });
    
    // Should show success message
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('You have successfully claimed your tokens.')).toBeInTheDocument();
    
    // Claim button should be disabled
    const claimButton = screen.getByTestId('claim-button');
    expect(claimButton).toBeDisabled();
  });
  
  test('shows airdrop ended message when airdrop has ended', async () => {
    // Mock airdrop ended
    (useReadContract as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === 'hasEnded') {
        return { data: true };
      }
      if (functionName === 'getRemainingTime') {
        return { data: BigInt(0), refetch: jest.fn() };
      }
      return { data: undefined };
    });
    
    render(<AirdropCard />);
    
    // Should show airdrop ended message
    await waitFor(() => {
      expect(screen.getByText('Airdrop Ended')).toBeInTheDocument();
    });
    expect(screen.getByText('The airdrop period has ended. Unclaimed tokens can no longer be claimed.')).toBeInTheDocument();
  });
  
  test('shows airdrop paused message when airdrop is paused', async () => {
    // Mock airdrop paused
    (useReadContract as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === 'paused') {
        return { data: true };
      }
      return { data: undefined };
    });
    
    render(<AirdropCard />);
    
    // Should show airdrop paused message
    await waitFor(() => {
      expect(screen.getByText('Airdrop Paused')).toBeInTheDocument();
    });
    expect(screen.getByText('The airdrop is currently paused by the administrators.')).toBeInTheDocument();
  });
  
  test('clicking claim button initiates claim transaction', async () => {
    const mockWriteContract = jest.fn();
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: null,
      isPending: false
    });
    
    // Mock all necessary values to ensure the claim button is clickable
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
        case 'isClaimed':
          return { data: false };
        case 'getAvailableTokens':
          return { data: BigInt(1000000), refetch: jest.fn() };
        case 'amountPerAddress':
          return { data: BigInt(100) };
        case 'isEligible':
          return { data: true };
        case 'balanceOf':
          return { data: BigInt(0), refetch: jest.fn() };
        default:
          return { data: undefined };
      }
    });
    
    render(<AirdropCard />);
    
    // Wait for component to fetch Merkle proof and update state
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Wait for the claim button to be available and enabled
    await waitFor(() => {
      const claimButton = screen.getByTestId('claim-button');
      expect(claimButton).not.toBeDisabled();
    });
    
    // Find and click claim button
    const claimButton = screen.getByTestId('claim-button');
    fireEvent.click(claimButton);
    
    // Wait for the mock to be called
    await waitFor(() => {
      expect(mockWriteContract).toHaveBeenCalled();
    });
    
    // Verify that writeContract was called with correct args
    expect(mockWriteContract.mock.calls[0][0]).toHaveProperty('functionName', 'claim');
    expect(mockWriteContract.mock.calls[0][0]).toHaveProperty('args');
    expect(mockWriteContract.mock.calls[0][0].args).toEqual([['0xproof1', '0xproof2']]);
  });
}); 