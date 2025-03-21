// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AtherlabsToken
 * @dev ERC20 token for Atherlabs with blacklist functionality and transfer restrictions
 */
contract AtherlabsToken is ERC20, ERC20Burnable, Ownable, Pausable {
    // Maximum token supply (100 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // Mapping of blacklisted addresses
    mapping(address => bool) private _blacklisted;
    
    // Events
    event Blacklisted(address indexed account);
    event RemovedFromBlacklist(address indexed account);
    event MintedTokens(address indexed to, uint256 amount);

    /**
     * @dev Constructor initializes the token with name and symbol
     * @param initialOwner The address that will be granted the owner role
     */
    constructor(address initialOwner) 
        ERC20("Atherlabs Token", "ATHER") 
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints new tokens to the specified address
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     * Requirements:
     * - Only callable by the owner
     * - Total supply after minting must not exceed MAX_SUPPLY
     * - 'to' address must not be blacklisted
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(!_blacklisted[to], "AtherlabsToken: recipient is blacklisted");
        require(totalSupply() + amount <= MAX_SUPPLY, "AtherlabsToken: exceeds maximum supply");
        
        _mint(to, amount);
        emit MintedTokens(to, amount);
    }

    /**
     * @dev Adds an address to the blacklist
     * @param account Address to blacklist
     * Requirements:
     * - Only callable by the owner
     */
    function blacklist(address account) external onlyOwner {
        require(!_blacklisted[account], "AtherlabsToken: account is already blacklisted");
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @dev Removes an address from the blacklist
     * @param account Address to remove from blacklist
     * Requirements:
     * - Only callable by the owner
     */
    function removeFromBlacklist(address account) external onlyOwner {
        require(_blacklisted[account], "AtherlabsToken: account is not blacklisted");
        _blacklisted[account] = false;
        emit RemovedFromBlacklist(account);
    }

    /**
     * @dev Checks if an address is blacklisted
     * @param account Address to check
     * @return bool True if the address is blacklisted
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev Pauses all token transfers
     * Requirements:
     * - Only callable by the owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Requirements:
     * - Only callable by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * @param from Address sending the tokens
     * @param to Address receiving the tokens
     * @param amount Amount of tokens being transferred
     * Requirements:
     * - Neither sender nor recipient can be blacklisted
     * - Transfers must not be paused
     */
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        require(!_blacklisted[from], "AtherlabsToken: sender is blacklisted");
        require(!_blacklisted[to], "AtherlabsToken: recipient is blacklisted");
        
        super._update(from, to, amount);
    }
} 