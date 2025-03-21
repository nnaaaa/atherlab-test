// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AtherlabsAirdrop
 * @dev Contract for distributing tokens via airdrop with Merkle proof verification
 */
contract AtherlabsAirdrop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Custom errors for gas optimization
    error AirdropPaused();
    error AirdropEnded();
    error AlreadyClaimed();
    error InvalidProof();
    error ZeroAddress();
    error ZeroAmount();
    error ZeroMerkleRoot();
    error EndTimeInPast();
    error AirdropNotEnded();
    error ArrayLengthMismatch();
    error NoTokensToWithdraw();
    error BatchSizeTooLarge();
    error TimelockNotElapsed();

    // Constants
    uint256 private constant MAX_BATCH_SIZE = 100;
    uint256 private constant MERKLE_UPDATE_TIMELOCK = 48 hours; // 48 hours timelock

    // Token to be distributed
    IERC20 public immutable token;
    
    // Amount of tokens per eligible address
    uint256 public amountPerAddress;
    
    // Merkle root for verification
    bytes32 public merkleRoot;
    
    // Timestamp of last merkle root update
    uint256 public merkleRootLastUpdated;
    
    // Airdrop end timestamp
    uint256 public endTime;
    
    // Storage packing: 1 slot for paused and bitmap
    bool public paused;
    
    // Mapping to track claimed addresses
    mapping(uint256 => uint256) private claimBitmap;
    
    // Events
    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot);
    event AirdropUpdated(uint256 newAmount, uint256 newEndTime);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    event Paused(bool isPaused);
    event UnclaimedTokensWithdrawn(address indexed to, uint256 amount);
    event BatchClaimed(uint256 numClaimed);

    /**
     * @dev Constructor initializes the airdrop
     * @param _token Address of the token to distribute
     * @param _amountPerAddress Amount of tokens per eligible address
     * @param _merkleRoot Initial merkle root for verification
     * @param _endTime Timestamp when airdrop ends
     */
    constructor(
        address _token,
        uint256 _amountPerAddress,
        bytes32 _merkleRoot,
        uint256 _endTime
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroAddress();
        if (_amountPerAddress == 0) revert ZeroAmount();
        if (_merkleRoot == bytes32(0)) revert ZeroMerkleRoot();
        if (_endTime <= block.timestamp) revert EndTimeInPast();
        
        token = IERC20(_token);
        amountPerAddress = _amountPerAddress;
        merkleRoot = _merkleRoot;
        merkleRootLastUpdated = block.timestamp;
        endTime = _endTime;
    }

    /**
     * @dev Allows eligible users to claim their tokens
     * @param proof Merkle proof for verification
     */
    function claim(bytes32[] calldata proof) external nonReentrant {
        // Memory instead of storage reads for gas savings
        if (paused) revert AirdropPaused();
        if (block.timestamp > endTime) revert AirdropEnded();
        if (isClaimed(msg.sender)) revert AlreadyClaimed();
        
        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();
        
        // Mark as claimed
        _setClaimed(msg.sender);
        
        // Transfer tokens
        token.safeTransfer(msg.sender, amountPerAddress);
        
        emit Claimed(msg.sender, amountPerAddress);
    }
    
    /**
     * @dev Distributes tokens to multiple addresses (push method)
     * @param addresses Array of addresses to receive tokens
     * @param proofs Array of merkle proofs
     * Requirements:
     * - Only callable by the owner
     */
    function distributeBatch(
        address[] calldata addresses,
        bytes32[][] calldata proofs
    ) external onlyOwner nonReentrant {
        if (paused) revert AirdropPaused();
        if (addresses.length != proofs.length) revert ArrayLengthMismatch();
        if (addresses.length > MAX_BATCH_SIZE) revert BatchSizeTooLarge();
        
        uint256 claimedCount = 0;
        uint256 amount = amountPerAddress; // Cache storage reads
        bytes32 root = merkleRoot; // Cache storage reads
        
        for (uint256 i = 0; i < addresses.length; i++) {
            address recipient = addresses[i];
            
            // Skip if already claimed
            if (isClaimed(recipient)) continue;
            
            // Verify merkle proof
            bytes32 leaf = keccak256(abi.encodePacked(recipient));
            if (!MerkleProof.verify(proofs[i], root, leaf)) continue;
            
            // Mark as claimed
            _setClaimed(recipient);
            
            // Transfer tokens
            token.safeTransfer(recipient, amount);
            
            emit Claimed(recipient, amount);
            claimedCount++;
        }
        
        emit BatchClaimed(claimedCount);
    }
    
    /**
     * @dev Updates the merkle root with a 48-hour timelock between updates
     * @param _merkleRoot New merkle root
     * Requirements:
     * - Only callable by the owner
     * - Must wait 48 hours since the last update
     */
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        if (_merkleRoot == bytes32(0)) revert ZeroMerkleRoot();
        
        bytes32 oldRoot = merkleRoot;
        merkleRoot = _merkleRoot;
        merkleRootLastUpdated = block.timestamp;
        
        emit MerkleRootUpdated(oldRoot, _merkleRoot);
    }
    
    /**
     * @dev Updates airdrop parameters
     * @param _amountPerAddress New amount per address
     * @param _endTime New end time
     * Requirements:
     * - Only callable by the owner
     */
    function updateAirdrop(uint256 _amountPerAddress, uint256 _endTime) external onlyOwner {
        if (_amountPerAddress == 0) revert ZeroAmount();
        if (_endTime <= block.timestamp) revert EndTimeInPast();
        
        amountPerAddress = _amountPerAddress;
        endTime = _endTime;
        
        emit AirdropUpdated(_amountPerAddress, _endTime);
    }
    
    /**
     * @dev Pauses or unpauses the airdrop
     * @param _paused New pause state
     * Requirements:
     * - Only callable by the owner
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }
    
    /**
     * @dev Withdraw tokens in case of emergency
     * @param _token Address of the token to withdraw
     * @param _to Address to receive the tokens
     * @param _amount Amount of tokens to withdraw
     * Requirements:
     * - Only callable by the owner
     */
    function emergencyWithdraw(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner nonReentrant {
        if (_to == address(0)) revert ZeroAddress();
        
        IERC20(_token).safeTransfer(_to, _amount);
        
        emit EmergencyWithdraw(_token, _to, _amount);
    }
    
    /**
     * @dev Withdraw unclaimed tokens after airdrop has ended
     * @param _to Address to receive the unclaimed tokens
     * Requirements:
     * - Only callable by the owner
     * - Airdrop must have ended (current time > endTime)
     */
    function withdrawUnclaimedTokens(address _to) external onlyOwner nonReentrant {
        if (block.timestamp <= endTime) revert AirdropNotEnded();
        if (_to == address(0)) revert ZeroAddress();
        
        uint256 remainingBalance = token.balanceOf(address(this));
        if (remainingBalance == 0) revert NoTokensToWithdraw();
        
        token.safeTransfer(_to, remainingBalance);
        
        emit UnclaimedTokensWithdrawn(_to, remainingBalance);
    }
    
    /**
     * @dev Checks if an address is eligible for the airdrop and hasn't claimed yet
     * @param account Address to check
     * @param proof Merkle proof for verification
     * @return bool True if the address is eligible and hasn't claimed
     */
    function isEligible(address account, bytes32[] calldata proof) external view returns (bool) {
        if (isClaimed(account)) return false;
        
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }
    
    /**
     * @dev Returns the amount of tokens available for claiming
     * @return uint256 Available token amount
     */
    function getAvailableTokens() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @dev Checks if the airdrop period has ended
     * @return bool True if the airdrop has ended
     */
    function hasEnded() external view returns (bool) {
        return block.timestamp > endTime;
    }
    
    /**
     * @dev Returns the remaining time until the airdrop ends (in seconds)
     * @return uint256 Remaining time in seconds, 0 if already ended
     */
    function getRemainingTime() external view returns (uint256) {
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @dev Internal function to check if an address has claimed tokens
     * @param account Address to check
     * @return bool True if the address has claimed
     */
    function isClaimed(address account) public view returns (bool) {
        uint256 claimedWordIndex = uint256(uint160(account)) / 256;
        uint256 claimedBitIndex = uint256(uint160(account)) % 256;
        uint256 claimedWord = claimBitmap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }
    
    /**
     * @dev Internal function to mark an address as claimed
     * @param account Address to mark as claimed
     */
    function _setClaimed(address account) private {
        uint256 claimedWordIndex = uint256(uint160(account)) / 256;
        uint256 claimedBitIndex = uint256(uint160(account)) % 256;
        claimBitmap[claimedWordIndex] = claimBitmap[claimedWordIndex] | (1 << claimedBitIndex);
    }
} 