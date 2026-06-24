const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignalRegistry", function () {
  const URI = "0g-storage://attestra/signal-1.json";
  const SYMBOL = "BTCUSDT";
  const HASH_1 = ethers.id("signal-payload-1");
  const HASH_2 = ethers.id("signal-payload-2");

  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SignalRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();
    return { registry, owner, alice, bob };
  }

  describe("deployment", function () {
    it("starts with zero signals", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.signalCount()).to.equal(0);
    });

    it("rejects getSignal(0) before any registration", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.getSignal(0)).to.be.revertedWith("not found");
    });
  });

  describe("registerSignal", function () {
    it("registers a signal and returns incremental id", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      const tx = await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      await expect(tx).to.emit(registry, "SignalRegistered");

      expect(await registry.signalCount()).to.equal(1);
      expect(await registry.hashToSignalId(HASH_1)).to.equal(1);
    });

    it("stores all fields retrievable via getSignal", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      const tx = await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const record = await registry.getSignal(1);
      expect(record.contentHash).to.equal(HASH_1);
      expect(record.storageUri).to.equal(URI);
      expect(record.symbol).to.equal(SYMBOL);
      expect(record.submitter).to.equal(alice.address);
      expect(record.timestamp).to.equal(block.timestamp);
    });

    it("assigns unique ids across multiple registrations", async function () {
      const { registry, alice, bob } = await loadFixture(deployFixture);

      await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      await registry.connect(bob).registerSignal(HASH_2, URI, "ETHUSDT");

      expect(await registry.signalCount()).to.equal(2);
      expect(await registry.hashToSignalId(HASH_1)).to.equal(1);
      expect(await registry.hashToSignalId(HASH_2)).to.equal(2);

      const second = await registry.getSignal(2);
      expect(second.submitter).to.equal(bob.address);
      expect(second.symbol).to.equal("ETHUSDT");
    });

    it("reverts on zero content hash", async function () {
      const { registry, alice } = await loadFixture(deployFixture);
      const zero = ethers.ZeroHash;

      await expect(registry.connect(alice).registerSignal(zero, URI, SYMBOL)).to.be.revertedWith(
        "empty hash",
      );
      expect(await registry.signalCount()).to.equal(0);
    });

    it("reverts on duplicate content hash (replay protection)", async function () {
      const { registry, alice, bob } = await loadFixture(deployFixture);

      await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      await expect(
        registry.connect(bob).registerSignal(HASH_1, "other-uri", "ETHUSDT"),
      ).to.be.revertedWith("hash exists");

      expect(await registry.signalCount()).to.equal(1);
    });

    it("allows same submitter to register different hashes", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      await registry.connect(alice).registerSignal(HASH_2, URI, SYMBOL);

      expect(await registry.signalCount()).to.equal(2);
    });

    it("accepts empty strings for uri and symbol", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      await registry.connect(alice).registerSignal(HASH_1, "", "");
      const record = await registry.getSignal(1);
      expect(record.storageUri).to.equal("");
      expect(record.symbol).to.equal("");
    });

    it("accepts long uri and symbol strings", async function () {
      const { registry, alice } = await loadFixture(deployFixture);
      const longUri = "0g-storage://" + "a".repeat(512);
      const longSymbol = "B".repeat(32);

      await registry.connect(alice).registerSignal(HASH_1, longUri, longSymbol);
      const record = await registry.getSignal(1);
      expect(record.storageUri).to.equal(longUri);
      expect(record.symbol).to.equal(longSymbol);
    });

    it("records block.timestamp at registration time", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      await time.increase(3600);
      const tx = await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const record = await registry.getSignal(1);
      expect(record.timestamp).to.equal(block.timestamp);
    });
  });

  describe("getSignal", function () {
    it("reverts for unregistered id", async function () {
      const { registry, alice } = await loadFixture(deployFixture);
      await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);

      await expect(registry.getSignal(2)).to.be.revertedWith("not found");
      await expect(registry.getSignal(999)).to.be.revertedWith("not found");
    });

    it("is callable by any address (public read)", async function () {
      const { registry, alice, bob } = await loadFixture(deployFixture);
      await registry.connect(alice).registerSignal(HASH_1, URI, SYMBOL);

      const record = await registry.connect(bob).getSignal(1);
      expect(record.contentHash).to.equal(HASH_1);
    });
  });

  describe("signalCount", function () {
    it("tracks count after many registrations", async function () {
      const { registry, alice } = await loadFixture(deployFixture);

      for (let i = 0; i < 10; i++) {
        const hash = ethers.id(`payload-${i}`);
        await registry.connect(alice).registerSignal(hash, URI, SYMBOL);
        expect(await registry.signalCount()).to.equal(i + 1);
      }
    });
  });

  describe("hashToSignalId", function () {
    it("returns zero for unknown hash", async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.hashToSignalId(HASH_1)).to.equal(0);
    });
  });
});

describe("SignalRegistry — fuzz", function () {
  async function deployFixture() {
    const [submitter] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SignalRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();
    return { registry, submitter };
  }

  it("never allows duplicate hashes across random registrations", async function () {
    const { registry, submitter } = await loadFixture(deployFixture);
    const seen = new Set();

    for (let i = 0; i < 25; i++) {
      const hash = ethers.id(`fuzz-${i}-${Math.random()}`);
      expect(seen.has(hash)).to.equal(false);
      seen.add(hash);
      await registry.connect(submitter).registerSignal(hash, `uri-${i}`, "BTCUSDT");
    }

    expect(await registry.signalCount()).to.equal(25);
  });

  it("reverts duplicate in fuzzed sequence", async function () {
    const { registry, submitter } = await loadFixture(deployFixture);
    const hash = ethers.id("duplicate-fuzz");
    await registry.connect(submitter).registerSignal(hash, "u1", "BTCUSDT");
    await expect(registry.connect(submitter).registerSignal(hash, "u2", "ETHUSDT")).to.be.revertedWith(
      "hash exists",
    );
  });
});

describe("SignalRegistry — security", function () {
  const URI = "0g-storage://attestra/signal.json";

  async function deployFixture() {
    const signers = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SignalRegistry");
    const registry = await factory.deploy();
    await registry.waitForDeployment();
    return { registry, signers };
  }

  it("has no owner-only functions — permissionless registration is intentional", async function () {
    const { registry, signers } = await loadFixture(deployFixture);
    const attacker = signers[5];
    const hash = ethers.id("attacker-signal");

    await expect(registry.connect(attacker).registerSignal(hash, URI, "BTCUSDT")).to.not.be
      .reverted;
  });

  it("cannot overwrite an existing signal id or hash mapping", async function () {
    const { registry, signers } = await loadFixture(deployFixture);
    const alice = signers[1];
    const bob = signers[2];
    const hash = ethers.id("immutable");

    await registry.connect(alice).registerSignal(hash, URI, "BTCUSDT");
    await expect(registry.connect(bob).registerSignal(hash, "evil-uri", "SCAM")).to.be.revertedWith(
      "hash exists",
    );

    const record = await registry.getSignal(1);
    expect(record.storageUri).to.equal(URI);
    expect(record.submitter).to.equal(alice.address);
  });

  it("does not expose a way to delete or update signals", async function () {
    const { registry } = await loadFixture(deployFixture);
    const iface = registry.interface;
    const selectors = [
      "registerSignal(bytes32,string,string)",
      "getSignal(uint256)",
      "signalCount()",
      "hashToSignalId(bytes32)",
    ];

    for (const sig of selectors) {
      expect(iface.hasFunction(sig)).to.equal(true);
    }

    expect(iface.hasFunction("deleteSignal(uint256)")).to.equal(false);
    expect(iface.hasFunction("updateSignal(uint256,bytes32,string,string)")).to.equal(false);
  });

  it("performs no external calls during registerSignal (no reentrancy surface)", async function () {
    const { registry } = await loadFixture(deployFixture);
    const Reentrancy = await ethers.getContractFactory("SignalRegistryReentrancyAttacker");
    const attacker = await Reentrancy.deploy(await registry.getAddress());
    await attacker.waitForDeployment();

    const hash = ethers.id("reentrancy-attempt");
    await attacker.attack(hash, URI, "BTCUSDT");

    const record = await registry.getSignal(1);
    expect(record.contentHash).to.equal(hash);
    expect(await registry.signalCount()).to.equal(1);
  });

  it("rejects registration with zero hash from any account", async function () {
    const { registry, signers } = await loadFixture(deployFixture);
    for (const signer of signers.slice(0, 5)) {
      await expect(
        registry.connect(signer).registerSignal(ethers.ZeroHash, URI, "BTCUSDT"),
      ).to.be.revertedWith("empty hash");
    }
  });

  it("event matches stored state (integrity for off-chain indexers)", async function () {
    const { registry, signers } = await loadFixture(deployFixture);
    const alice = signers[1];
    const hash = ethers.id("event-integrity");
    const symbol = "SOLUSDT";

    const tx = await registry.connect(alice).registerSignal(hash, URI, symbol);
    const receipt = await tx.wait();
    const log = receipt.logs.find((l) => {
      try {
        return registry.interface.parseLog(l)?.name === "SignalRegistered";
      } catch {
        return false;
      }
    });
    expect(log).to.not.equal(undefined);

    const parsed = registry.interface.parseLog(log);
    const onChain = await registry.getSignal(1);

    expect(parsed.args.signalId).to.equal(1);
    expect(parsed.args.contentHash).to.equal(onChain.contentHash);
    expect(parsed.args.storageUri).to.equal(onChain.storageUri);
    expect(parsed.args.symbol).to.equal(onChain.symbol);
    expect(parsed.args.submitter).to.equal(onChain.submitter);
    expect(parsed.args.timestamp).to.equal(onChain.timestamp);
  });
});
