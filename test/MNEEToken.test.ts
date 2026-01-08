import { expect } from "chai";
import { ethers } from "hardhat";
import { MNEEToken } from "../typechain-types";

describe("MNEEToken", function () {
  let mneeToken: MNEEToken;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MNEEToken = await ethers.getContractFactory("MNEEToken");
    mneeToken = await MNEEToken.deploy(owner.address);
    await mneeToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await mneeToken.owner()).to.equal(owner.address);
    });

    it("Should mint max supply to owner", async function () {
      const maxSupply = await mneeToken.MAX_SUPPLY();
      expect(await mneeToken.balanceOf(owner.address)).to.equal(maxSupply);
      expect(await mneeToken.totalSupply()).to.equal(maxSupply);
    });

    it("Should have correct name and symbol", async function () {
      expect(await mneeToken.name()).to.equal("MNEE Token");
      expect(await mneeToken.symbol()).to.equal("MNEE");
    });

    it("Should support ERC2612 Permit", async function () {
      // Check if permit function exists
      const permitABI = [
        "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external"
      ];
      const contract = new ethers.Contract(await mneeToken.getAddress(), permitABI, owner);
      expect(contract.permit).to.not.be.undefined;
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("1000");
      await mneeToken.transfer(addr1.address, amount);
      expect(await mneeToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const amount = ethers.parseEther("1000000000");
      await expect(
        mneeToken.connect(addr1).transfer(addr2.address, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should update balances after transfers", async function () {
      const amount = ethers.parseEther("1000");
      const initialBalance = await mneeToken.balanceOf(owner.address);
      
      await mneeToken.transfer(addr1.address, amount);
      expect(await mneeToken.balanceOf(owner.address)).to.equal(initialBalance - amount);
      expect(await mneeToken.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Permit", function () {
    it("Should allow permit and transfer in single transaction", async function () {
      const amount = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Get domain separator
      const domain = {
        name: await mneeToken.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await mneeToken.getAddress(),
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const nonce = await mneeToken.nonces(owner.address);
      const value = {
        owner: owner.address,
        spender: addr1.address,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await owner.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);

      // Use permit
      await mneeToken.permit(
        owner.address,
        addr1.address,
        amount,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      // Now transfer should work
      await mneeToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      expect(await mneeToken.balanceOf(addr2.address)).to.equal(amount);
    });
  });

  describe("Burn", function () {
    it("Should allow burning tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      const initialBalance = await mneeToken.balanceOf(owner.address);
      const initialSupply = await mneeToken.totalSupply();

      await mneeToken.burn(burnAmount);
      expect(await mneeToken.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
      expect(await mneeToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });
  });
});

