import { expect } from "chai";
import { ethers } from "hardhat";
import { MNEEToken, MNEEPaymaster } from "../typechain-types";
import { EntryPoint } from "../typechain-types/@account-abstraction/contracts/core";

describe("MNEEPaymaster", function () {
  let mneeToken: MNEEToken;
  let paymaster: MNEEPaymaster;
  let entryPoint: EntryPoint;
  let owner: any;
  let user: any;
  let treasury: any;

  const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  const MNEERate = ethers.parseEther("1"); // 1 MNEE = 1 ETH worth of gas

  beforeEach(async function () {
    [owner, user, treasury] = await ethers.getSigners();

    // Deploy MNEE Token
    const MNEEToken = await ethers.getContractFactory("MNEEToken");
    mneeToken = await MNEEToken.deploy(owner.address);
    await mneeToken.waitForDeployment();

    // Get EntryPoint (on testnet, use actual address)
    // For testing, we'll use a mock or the actual address
    entryPoint = await ethers.getContractAt("EntryPoint", ENTRY_POINT_ADDRESS);

    // Deploy Paymaster
    const MNEEPaymaster = await ethers.getContractFactory("MNEEPaymaster");
    paymaster = await MNEEPaymaster.deploy(
      ENTRY_POINT_ADDRESS,
      await mneeToken.getAddress(),
      owner.address,
      treasury.address,
      MNEERate
    );
    await paymaster.waitForDeployment();

    // Give user some MNEE tokens
    const userAmount = ethers.parseEther("1000");
    await mneeToken.transfer(user.address, userAmount);
  });

  describe("Deployment", function () {
    it("Should set the right values", async function () {
      expect(await paymaster.mneeToken()).to.equal(await mneeToken.getAddress());
      expect(await paymaster.treasury()).to.equal(treasury.address);
      expect(await paymaster.mneeRate()).to.equal(MNEERate);
      expect(await paymaster.owner()).to.equal(owner.address);
    });

    it("Should calculate required MNEE correctly", async function () {
      const gasCost = ethers.parseEther("0.01"); // 0.01 ETH
      const requiredMNEE = await paymaster.calculateRequiredMNEE(gasCost);
      expect(requiredMNEE).to.equal(ethers.parseEther("0.01")); // Should be 0.01 MNEE
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to propose rate update", async function () {
      const newRate = ethers.parseEther("2");
      await paymaster.proposeRateUpdate(newRate);
      const pending = await paymaster.pendingRateUpdate();
      expect(pending.newValue).to.equal(newRate);
      expect(pending.isRateUpdate).to.be.true;
    });

    it("Should allow owner to propose treasury update", async function () {
      const newTreasury = user.address;
      await paymaster.proposeTreasuryUpdate(newTreasury);
      const pending = await paymaster.pendingTreasuryUpdate();
      expect(pending.newAddress).to.equal(newTreasury);
      expect(pending.isRateUpdate).to.be.false;
    });

    it("Should prevent non-owner from proposing updates", async function () {
      await expect(
        paymaster.connect(user).proposeRateUpdate(ethers.parseEther("2"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        paymaster.connect(user).proposeTreasuryUpdate(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow executing update before timelock expires", async function () {
      const newRate = ethers.parseEther("2");
      await paymaster.proposeRateUpdate(newRate);
      
      await expect(
        paymaster.executeRateUpdate()
      ).to.be.revertedWith("MNEEPaymaster: Timelock not expired");
    });

    it("Should allow canceling pending updates", async function () {
      const newRate = ethers.parseEther("2");
      await paymaster.proposeRateUpdate(newRate);
      
      await paymaster.cancelRateUpdate();
      const pending = await paymaster.pendingRateUpdate();
      expect(pending.timestamp).to.equal(0);
    });
  });

  describe("Pause", function () {
    it("Should allow owner to pause", async function () {
      await paymaster.pause();
      expect(await paymaster.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await paymaster.pause();
      await paymaster.unpause();
      expect(await paymaster.paused()).to.be.false;
    });
  });
});

