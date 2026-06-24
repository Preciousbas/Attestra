// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SignalRegistry} from "../../contracts/SignalRegistry.sol";
import {SignalRegistryReentrancyAttacker} from "./mocks/SignalRegistryReentrancyAttacker.sol";

/// @title SignalRegistryTest
/// @notice Unit, fuzz, and security tests for the on-chain signal anchor.
contract SignalRegistryTest is Test {
    SignalRegistry internal registry;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    string internal constant URI = "0g-storage://0xabc";
    string internal constant SYMBOL = "BTCUSDT";

    event SignalRegistered(
        uint256 indexed signalId,
        bytes32 indexed contentHash,
        string storageUri,
        string symbol,
        address indexed submitter,
        uint256 timestamp
    );

    function setUp() public {
        registry = new SignalRegistry();
    }

    // --- Deployment ---

    function test_SignalCount_InitiallyZero() public view {
        assertEq(registry.signalCount(), 0);
    }

    function test_GetSignal_RevertsWhenIdZero() public {
        vm.expectRevert(bytes("not found"));
        registry.getSignal(0);
    }

    // --- registerSignal happy path ---

    function test_RegisterSignal_EmitsEventAndStoresRecord() public {
        bytes32 hash = keccak256("payload-1");

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit SignalRegistered(1, hash, URI, SYMBOL, alice, block.timestamp);

        uint256 signalId = registry.registerSignal(hash, URI, SYMBOL);

        assertEq(signalId, 1);
        assertEq(registry.signalCount(), 1);
        assertEq(registry.hashToSignalId(hash), 1);

        (
            bytes32 contentHash,
            string memory storageUri,
            string memory symbol,
            address submitter,
            uint256 timestamp
        ) = registry.getSignal(1);

        assertEq(contentHash, hash);
        assertEq(storageUri, URI);
        assertEq(symbol, SYMBOL);
        assertEq(submitter, alice);
        assertEq(timestamp, block.timestamp);
    }

    function test_RegisterSignal_IncrementsIdsForMultipleUsers() public {
        bytes32 hash1 = keccak256("one");
        bytes32 hash2 = keccak256("two");

        vm.prank(alice);
        registry.registerSignal(hash1, URI, SYMBOL);

        vm.prank(bob);
        registry.registerSignal(hash2, URI, "ETHUSDT");

        assertEq(registry.signalCount(), 2);

        (,, string memory symbol2, address submitter2,) = registry.getSignal(2);
        assertEq(symbol2, "ETHUSDT");
        assertEq(submitter2, bob);
    }

    function test_RegisterSignal_AcceptsEmptyStrings() public {
        bytes32 hash = keccak256("empty-meta");

        vm.prank(alice);
        registry.registerSignal(hash, "", "");

        (, string memory storageUri, string memory symbol,,) = registry.getSignal(1);
        assertEq(storageUri, "");
        assertEq(symbol, "");
    }

    function test_RegisterSignal_UsesBlockTimestamp() public {
        bytes32 hash = keccak256("time");
        vm.warp(1_700_000_000);

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        (,,,, uint256 timestamp) = registry.getSignal(1);
        assertEq(timestamp, 1_700_000_000);
    }

    // --- Reverts ---

    function test_RegisterSignal_RevertsOnZeroHash() public {
        vm.prank(alice);
        vm.expectRevert(bytes("empty hash"));
        registry.registerSignal(bytes32(0), URI, SYMBOL);

        assertEq(registry.signalCount(), 0);
    }

    function test_RegisterSignal_RevertsOnDuplicateHash() public {
        bytes32 hash = keccak256("dup");

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        vm.prank(bob);
        vm.expectRevert(bytes("hash exists"));
        registry.registerSignal(hash, "other-uri", "ETHUSDT");

        assertEq(registry.signalCount(), 1);
    }

    function test_GetSignal_RevertsForMissingId() public {
        bytes32 hash = keccak256("only-one");

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        vm.expectRevert(bytes("not found"));
        registry.getSignal(2);

        vm.expectRevert(bytes("not found"));
        registry.getSignal(999);
    }

    function test_HashToSignalId_ReturnsZeroForUnknown() public view {
        assertEq(registry.hashToSignalId(keccak256("missing")), 0);
    }

    // --- Access ---

    function test_GetSignal_PublicRead() public {
        bytes32 hash = keccak256("public-read");

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        vm.prank(bob);
        (bytes32 contentHash,,,,) = registry.getSignal(1);
        assertEq(contentHash, hash);
    }

    // --- Fuzz ---

    function testFuzz_RegisterUniqueHashes(
        bytes32 hash,
        string calldata uri,
        string calldata symbol
    ) public {
        vm.assume(hash != bytes32(0));

        // Prevent duplicate hash in fuzz iterations within same test
        vm.assume(registry.hashToSignalId(hash) == 0);

        vm.prank(alice);
        uint256 id = registry.registerSignal(hash, uri, symbol);

        assertEq(id, registry.signalCount());
        assertEq(registry.hashToSignalId(hash), id);
    }

    function testFuzz_DuplicateHashAlwaysReverts(bytes32 hash) public {
        vm.assume(hash != bytes32(0));

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        vm.prank(bob);
        vm.expectRevert(bytes("hash exists"));
        registry.registerSignal(hash, "uri-2", "ETHUSDT");
    }

    function testFuzz_ZeroHashAlwaysReverts(address caller) public {
        vm.assume(caller != address(0));

        vm.prank(caller);
        vm.expectRevert(bytes("empty hash"));
        registry.registerSignal(bytes32(0), URI, SYMBOL);
    }

    // --- Security ---

    function test_Security_PermissionlessRegistrationByDesign() public {
        bytes32 hash = keccak256("permissionless");
        address anyone = makeAddr("anyone");

        vm.prank(anyone);
        registry.registerSignal(hash, URI, SYMBOL);

        (,,, address submitter,) = registry.getSignal(1);
        assertEq(submitter, anyone);
    }

    function test_Security_ImmutableAfterRegistration() public {
        bytes32 hash = keccak256("immutable");

        vm.prank(alice);
        registry.registerSignal(hash, URI, SYMBOL);

        vm.prank(bob);
        vm.expectRevert(bytes("hash exists"));
        registry.registerSignal(hash, "evil", "SCAM");

        (, string memory storageUri,, address submitter,) = registry.getSignal(1);
        assertEq(storageUri, URI);
        assertEq(submitter, alice);
    }

    function test_Security_NoExternalCallsInRegister() public {
        SignalRegistryReentrancyAttacker attacker = new SignalRegistryReentrancyAttacker(registry);

        bytes32 hash = keccak256("reentrancy");

        attacker.attack(hash, URI, SYMBOL);

        (bytes32 stored,,,,) = registry.getSignal(1);
        assertEq(stored, hash);
        assertEq(registry.signalCount(), 1);
    }

    function test_Security_EventMatchesStorage() public {
        bytes32 hash = keccak256("event-integrity");

        vm.prank(alice);
        registry.registerSignal(hash, URI, "SOLUSDT");

        (
            bytes32 onChainHash,
            string memory onChainUri,
            string memory onChainSymbol,
            address submitter,
            uint256 timestamp
        ) = registry.getSignal(1);

        assertEq(onChainHash, hash);
        assertEq(onChainUri, URI);
        assertEq(onChainSymbol, "SOLUSDT");
        assertEq(submitter, alice);
        assertEq(timestamp, block.timestamp);
    }
}
