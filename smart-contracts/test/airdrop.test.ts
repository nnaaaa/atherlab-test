import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import { AtherlabsAirdrop, AtherlabsToken } from "../typechain-types";

describe("AtherlabsAirdrop", function () {
  let token: AtherlabsToken;
  let airdrop: AtherlabsAirdrop;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;
  let addrs: HardhatEthersSigner[];
  
  let merkleTree: MerkleTree;
  let merkleRoot: string;
  
  const amountPerAddress = ethers.parseEther("100"); // 100 tokens
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens for airdrop
  const airdropDuration = 60 * 60 * 24 * 30; // 30 days in seconds

  // Helper function to get Merkle proof for an address
  const getProof = (address: string) => {
    const leaf = keccak256(address.toLowerCase());
    return merkleTree.getHexProof(leaf);
  };

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    // Convert addresses to strings for merkle tree
    const whitelistAddresses = [
      ethers.getAddress(addr1.address), 
      ethers.getAddress(addr2.address)
    ];
    
    // Create leaf nodes
    const leafNodes = whitelistAddresses.map(addr => keccak256(addr));
    
    // Create Merkle tree
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    
    // Get Merkle root
    merkleRoot = merkleTree.getHexRoot();
    
    // Deploy token contract
    const TokenFactory = await ethers.getContractFactory("AtherlabsToken");
    token = await TokenFactory.deploy(owner.address);
    await token.waitForDeployment();
    
    // Deploy airdrop contract with end time in the future
    // Get current block timestamp to avoid timing issues
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore ? blockBefore.timestamp : Math.floor(Date.now() / 1000);
    const endTime = currentTimestamp + 60 * 60 * 24 * 7; // 7 days from current block
    
    const AirdropFactory = await ethers.getContractFactory("AtherlabsAirdrop");
    airdrop = await AirdropFactory.deploy(
      await token.getAddress(),
      amountPerAddress,
      merkleRoot,
      endTime
    );
    await airdrop.waitForDeployment();
    
    // Mint tokens to airdrop contract
    await token.mint(await airdrop.getAddress(), initialSupply);
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await airdrop.token()).to.equal(await token.getAddress());
    });

    it("Should set the correct amount per address", async function () {
      expect(await airdrop.amountPerAddress()).to.equal(amountPerAddress);
    });

    it("Should set the correct merkle root", async function () {
      expect(await airdrop.merkleRoot()).to.equal(merkleRoot);
    });

    it("Should have the correct initial token supply", async function () {
      const airdropAddress = await airdrop.getAddress();
      expect(await token.balanceOf(airdropAddress)).to.equal(initialSupply);
    });
  });

  describe("Claim functionality", function () {
    it("Should allow whitelisted addresses to claim tokens", async function () {
      const proof = getProof(addr1.address);
      
      // Check if address is eligible before claiming
      const isEligible = await airdrop.isEligible(addr1.address, proof);
      expect(isEligible).to.be.true;
      
      // Claim tokens
      await airdrop.connect(addr1).claim(proof);
      
      // Check balance after claiming
      expect(await token.balanceOf(addr1.address)).to.equal(amountPerAddress);
      
      // Check if claimed status is updated
      expect(await airdrop.isClaimed(addr1.address)).to.be.true;
      
      // Should no longer be eligible after claiming
      expect(await airdrop.isEligible(addr1.address, proof)).to.be.false;
    });
    
    it("Should not allow non-whitelisted addresses to claim", async function () {
      const nonWhitelistedAddress = addr3.address;
      const proof = getProof(nonWhitelistedAddress); // This will be an invalid proof
      
      // Check if address is not eligible
      expect(await airdrop.isEligible(nonWhitelistedAddress, proof)).to.be.false;
      
      // Attempt to claim should fail
      await expect(
        airdrop.connect(addr3).claim(proof)
      ).to.be.revertedWithCustomError(airdrop, "InvalidProof");
    });
    
    it("Should not allow double claiming", async function () {
      const proof = getProof(addr1.address);
      
      // First claim
      await airdrop.connect(addr1).claim(proof);
      
      // Second claim should fail
      await expect(
        airdrop.connect(addr1).claim(proof)
      ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
    });
    
    it("Should not allow claiming when paused", async function () {
      // Pause the airdrop
      await airdrop.setPaused(true);
      
      const proof = getProof(addr1.address);
      
      // Attempt to claim when paused should fail
      await expect(
        airdrop.connect(addr1).claim(proof)
      ).to.be.revertedWithCustomError(airdrop, "AirdropPaused");
      
      // Unpause the airdrop
      await airdrop.setPaused(false);
      
      // Claiming should now work
      await airdrop.connect(addr1).claim(proof);
      expect(await token.balanceOf(addr1.address)).to.equal(amountPerAddress);
    });
    
    it("Should not allow claiming after end time", async function () {
      // Fast forward time beyond the end time
      const endTime = await airdrop.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine", []);
      
      const proof = getProof(addr1.address);
      
      // Attempt to claim after end time should fail
      await expect(
        airdrop.connect(addr1).claim(proof)
      ).to.be.revertedWithCustomError(airdrop, "AirdropEnded");
    });
  });

  describe("Batch distribution", function () {
    beforeEach(async function () {
      // Format addresses for merkle tree
      const distributionAddresses = [
        owner.address.toLowerCase(),
        addrs[0].address.toLowerCase(),
        addrs[1].address.toLowerCase()
      ];
      
      // Create new merkle tree
      const distributionLeaves = distributionAddresses.map(addr => keccak256(addr));
      const distributionTree = new MerkleTree(distributionLeaves, keccak256, { sortPairs: true });
      const distributionRoot = distributionTree.getHexRoot();
      
      // Get proofs
      const getDistributionProof = (address: string) => {
        const leaf = keccak256(address.toLowerCase());
        return distributionTree.getHexProof(leaf);
      };
      
      // Deploy token
      const TokenFactory = await ethers.getContractFactory("AtherlabsToken");
      const distributionToken = await TokenFactory.deploy(owner.address);
      await distributionToken.waitForDeployment();
      
      // Deploy airdrop with future end time - use block.timestamp + 30 days to avoid timing issues
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentTimestamp = blockBefore ? blockBefore.timestamp : Math.floor(Date.now() / 1000);
      const futureEndTime = currentTimestamp + 60 * 60 * 24 * 30; // 30 days in the future from current block
      
      const AirdropFactory = await ethers.getContractFactory("AtherlabsAirdrop");
      const distributionAirdrop = await AirdropFactory.deploy(
        await distributionToken.getAddress(),
        amountPerAddress,
        distributionRoot,
        futureEndTime
      );
      await distributionAirdrop.waitForDeployment();
      
      // Mint tokens to airdrop contract
      const distributionSupply = amountPerAddress * BigInt(distributionAddresses.length);
      await distributionToken.mint(await distributionAirdrop.getAddress(), distributionSupply);
      
      // Make these available to the tests
      this.distributionToken = distributionToken;
      this.distributionAirdrop = distributionAirdrop;
      this.distributionAddresses = distributionAddresses.map(addr => addr.toLowerCase());
      this.getDistributionProof = getDistributionProof;
    });

    it("Should allow owner to distribute tokens to multiple addresses", async function () {
      const addresses = [
        this.distributionAddresses[0],
        this.distributionAddresses[1]
      ];
      const proofs = [
        this.getDistributionProof(this.distributionAddresses[0]),
        this.getDistributionProof(this.distributionAddresses[1])
      ];
      
      // Distribute tokens to both addresses
      await this.distributionAirdrop.distributeBatch(addresses, proofs);
      
      // Check balances
      expect(await this.distributionToken.balanceOf(this.distributionAddresses[0])).to.equal(amountPerAddress);
      expect(await this.distributionToken.balanceOf(this.distributionAddresses[1])).to.equal(amountPerAddress);
      
      // Check claimed status
      expect(await this.distributionAirdrop.isClaimed(this.distributionAddresses[0])).to.be.true;
      expect(await this.distributionAirdrop.isClaimed(this.distributionAddresses[1])).to.be.true;
    });
    
    it("Should skip already claimed addresses in batch distribution", async function () {
      // First claim for addr1
      await airdrop.connect(addr1).claim(getProof(addr1.address));
      
      const addresses = [addr1.address, addr2.address];
      const proofs = [getProof(addr1.address), getProof(addr2.address)];
      
      // Distribute tokens to both addresses (addr1 already claimed)
      await airdrop.distributeBatch(addresses, proofs);
      
      // addr1 should still have the same amount (no double claim)
      expect(await token.balanceOf(addr1.address)).to.equal(amountPerAddress);
      
      // addr2 should have received tokens
      expect(await token.balanceOf(addr2.address)).to.equal(amountPerAddress);
    });
    
    it("Should skip invalid addresses in batch distribution", async function () {
      // addr3 is not in the whitelist
      const addresses = [addr1.address, addr3.address];
      const proofs = [getProof(addr1.address), getProof(addr3.address)]; // Second proof is invalid
      
      // Distribute tokens
      await airdrop.distributeBatch(addresses, proofs);
      
      // addr1 should have received tokens
      expect(await token.balanceOf(addr1.address)).to.equal(amountPerAddress);
      
      // addr3 should not have received any tokens
      expect(await token.balanceOf(addr3.address)).to.equal(0);
      
      // addr3 should not be marked as claimed
      expect(await airdrop.isClaimed(addr3.address)).to.be.false;
    });
    
    it("Should not allow non-owners to perform batch distribution", async function () {
      const addresses = [addr1.address, addr2.address];
      const proofs = [getProof(addr1.address), getProof(addr2.address)];
      
      // Non-owner trying to distribute tokens
      await expect(
        airdrop.connect(addr1).distributeBatch(addresses, proofs)
      ).to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount");
    });
  });

  describe("Admin functionality", function () {
    it("Should allow owner to update merkle root", async function () {
      // Create new whitelist with addr3
      const newWhitelist = [owner.address, addr1.address, addr3.address].map(addr => addr.toLowerCase());
      const newLeaves = newWhitelist.map(addr => keccak256(addr));
      const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
      const newMerkleRoot = newMerkleTree.getHexRoot();
      
      // Update merkle root
      await airdrop.updateMerkleRoot(newMerkleRoot);
      
      // Check if root was updated
      expect(await airdrop.merkleRoot()).to.equal(newMerkleRoot);
      
      // addr3 should now be able to claim
      const proof = newMerkleTree.getHexProof(keccak256(addr3.address.toLowerCase()));
      expect(await airdrop.isEligible(addr3.address, proof)).to.be.true;
      
      // addr2 should no longer be able to claim
      expect(await airdrop.isEligible(addr2.address, getProof(addr2.address))).to.be.false;
    });
    
    it("Should allow owner to update airdrop parameters", async function () {
      const newAmount = ethers.parseEther("200"); // 200 tokens per user
      const newEndTime = Math.floor(Date.now() / 1000) + airdropDuration * 2; // Double the duration
      
      // Update airdrop parameters
      await airdrop.updateAirdrop(newAmount, newEndTime);
      
      // Check if parameters were updated
      expect(await airdrop.amountPerAddress()).to.equal(newAmount);
      expect(await airdrop.endTime()).to.equal(newEndTime);
    });
    
    it("Should allow owner to pause and unpause the airdrop", async function () {
      // Pause the airdrop
      await airdrop.setPaused(true);
      expect(await airdrop.paused()).to.be.true;
      
      // Unpause the airdrop
      await airdrop.setPaused(false);
      expect(await airdrop.paused()).to.be.false;
    });
    
    it("Should allow owner to perform emergency withdrawals", async function () {
      const withdrawAmount = ethers.parseEther("500");
      const recipient = addrs[0].address;
      
      // Get initial balances
      const initialAirdropBalance = await token.balanceOf(await airdrop.getAddress());
      const initialRecipientBalance = await token.balanceOf(recipient);
      
      // Perform emergency withdrawal
      await airdrop.emergencyWithdraw(await token.getAddress(), recipient, withdrawAmount);
      
      // Check balances after withdrawal
      expect(await token.balanceOf(await airdrop.getAddress())).to.equal(initialAirdropBalance - withdrawAmount);
      expect(await token.balanceOf(recipient)).to.equal(initialRecipientBalance + withdrawAmount);
    });
  });

  describe("Helper functions", function () {
    it("Should correctly report eligibility for claiming tokens", async function () {
      const whitelistedAddress = addr1.address;
      const nonWhitelistedAddress = addr3.address;
      
      // Whitelisted address should be eligible
      expect(await airdrop.isEligible(whitelistedAddress, getProof(whitelistedAddress))).to.be.true;
      
      // Non-whitelisted address should not be eligible
      expect(await airdrop.isEligible(nonWhitelistedAddress, getProof(nonWhitelistedAddress))).to.be.false;
      
      // After claiming, the address should no longer be eligible
      await airdrop.connect(addr1).claim(getProof(whitelistedAddress));
      expect(await airdrop.isEligible(whitelistedAddress, getProof(whitelistedAddress))).to.be.false;
    });
    
    it("Should correctly return the available tokens in the airdrop", async function () {
      const initialAvailable = await airdrop.getAvailableTokens();
      expect(initialAvailable).to.equal(initialSupply);
      
      // After a claim, available tokens should decrease
      await airdrop.connect(addr1).claim(getProof(addr1.address));
      expect(await airdrop.getAvailableTokens()).to.equal(initialAvailable - amountPerAddress);
    });
  });

  describe("Withdraw Unclaimed Tokens", function () {
    it("Should not allow withdrawing unclaimed tokens before airdrop ends", async function () {
      const recipient = addrs[0].address;
      
      // Attempt to withdraw unclaimed tokens before end time
      await expect(
        airdrop.withdrawUnclaimedTokens(recipient)
      ).to.be.revertedWithCustomError(airdrop, "AirdropNotEnded");
    });
    
    it("Should allow admin to withdraw unclaimed tokens after airdrop ends", async function () {
      const recipient = addrs[0].address;
      
      // Let one user claim tokens before the airdrop ends
      const proof = getProof(addr1.address);
      await airdrop.connect(addr1).claim(proof);
      
      // Fast forward time beyond the end time
      const endTime = await airdrop.endTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Calculate expected unclaimed tokens
      const claimedAmount = amountPerAddress;
      const expectedRemainingTokens = initialSupply - claimedAmount;
      
      // Check initial balance
      const initialRecipientBalance = await token.balanceOf(recipient);
      
      // Withdraw unclaimed tokens
      await airdrop.withdrawUnclaimedTokens(recipient);
      
      // Check recipient balance (should have received all unclaimed tokens)
      expect(await token.balanceOf(recipient)).to.equal(initialRecipientBalance + expectedRemainingTokens);
      
      // Check airdrop contract balance (should be 0 after full withdrawal)
      expect(await token.balanceOf(await airdrop.getAddress())).to.equal(0);
    });
  });
}); 