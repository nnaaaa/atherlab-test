import { SUPPORTED_CHAIN_ID } from '@/lib/constants';
import { fireEvent, render, screen } from '@testing-library/react';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { WalletConnect } from './WalletConnect';

// Mock the hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  useConnect: jest.fn(),
  useDisconnect: jest.fn(),
  useSwitchChain: jest.fn()
}));

// Mock constants
jest.mock('@/lib/constants', () => ({
  SUPPORTED_CHAIN_ID: 1 // Ethereum Mainnet
}));

describe('WalletConnect', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
      isConnected: false
    });
    
    (useChainId as jest.Mock).mockReturnValue(1);
    
    const mockConnect = jest.fn();
    (useConnect as jest.Mock).mockReturnValue({
      connect: mockConnect,
      connectors: [
        { id: 'injected', name: 'MetaMask' },
        { id: 'walletConnect', name: 'WalletConnect' }
      ],
      isPending: false
    });
    
    const mockDisconnect = jest.fn();
    (useDisconnect as jest.Mock).mockReturnValue({
      disconnect: mockDisconnect
    });
    
    const mockSwitchChain = jest.fn();
    (useSwitchChain as jest.Mock).mockReturnValue({
      switchChain: mockSwitchChain
    });
  });
  
  test('renders connect buttons when not connected', () => {
    render(<WalletConnect />);
    
    // Should show connect buttons
    expect(screen.getByText('Connect MetaMask')).toBeInTheDocument();
    expect(screen.getByText('Connect WalletConnect')).toBeInTheDocument();
    
    // Should show description text
    expect(screen.getByText(/Connect your wallet to check eligibility and claim tokens/i)).toBeInTheDocument();
  });
  
  test('renders connected state with address', () => {
    // Mock connected state
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    render(<WalletConnect />);
    
    // Should show connected address (shortened version with ellipsis)
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    
    // Should show disconnect button
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });
  
  test('connects wallet when connect button is clicked', () => {
    const mockConnect = jest.fn();
    (useConnect as jest.Mock).mockReturnValue({
      connect: mockConnect,
      connectors: [
        { id: 'injected', name: 'MetaMask' }
      ],
      isPending: false
    });
    
    render(<WalletConnect />);
    
    // Click connect button
    const connectButton = screen.getByText('Connect MetaMask');
    fireEvent.click(connectButton);
    
    // Verify connect was called with the right connector
    expect(mockConnect).toHaveBeenCalledWith({
      connector: { id: 'injected', name: 'MetaMask' }
    });
  });
  
  test('disconnects wallet when disconnect button is clicked', () => {
    // Mock connected state
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    const mockDisconnect = jest.fn();
    (useDisconnect as jest.Mock).mockReturnValue({
      disconnect: mockDisconnect
    });
    
    render(<WalletConnect />);
    
    // Click disconnect button
    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);
    
    // Verify disconnect was called
    expect(mockDisconnect).toHaveBeenCalled();
  });
  
  test('shows network warning when on wrong network', () => {
    // Mock connected state but wrong network
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    // Mock chain ID different from supported chain
    (useChainId as jest.Mock).mockReturnValue(5); // Goerli testnet
    
    render(<WalletConnect />);
    
    // Should show network warning
    expect(screen.getByText(/Please switch to the correct network/i)).toBeInTheDocument();
    
    // Should show switch network button
    expect(screen.getByText('Switch Network')).toBeInTheDocument();
  });
  
  test('switches network when switch network button is clicked', () => {
    // Mock connected state but wrong network
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true
    });
    
    // Mock chain ID different from supported chain
    (useChainId as jest.Mock).mockReturnValue(5); // Goerli testnet
    
    const mockSwitchChain = jest.fn();
    (useSwitchChain as jest.Mock).mockReturnValue({
      switchChain: mockSwitchChain
    });
    
    render(<WalletConnect />);
    
    // Click switch network button
    const switchButton = screen.getByText('Switch Network');
    fireEvent.click(switchButton);
    
    // Verify switchChain was called with correct chain ID
    expect(mockSwitchChain).toHaveBeenCalledWith({
      chainId: SUPPORTED_CHAIN_ID
    });
  });
  
  test('shows loading state during connection', () => {
    // Mock pending connection
    (useConnect as jest.Mock).mockReturnValue({
      connect: jest.fn(),
      connectors: [
        { id: 'injected', name: 'MetaMask' }
      ],
      isPending: true
    });
    
    render(<WalletConnect />);
    
    // Should show loading state
    expect(screen.getByText('Connect MetaMask...')).toBeInTheDocument();
  });
}); 