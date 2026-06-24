// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SignalRegistry} from "../../contracts/SignalRegistry.sol";

/// @notice Handler for invariant testing — only valid registrations increment count.
contract SignalRegistryHandler is Test {
    SignalRegistry public immutable registry;
    uint256 public registrations;

    constructor(SignalRegistry registry_) {
        registry = registry_;
    }

    function register(bytes32 hash) external {
        if (hash == bytes32(0)) return;
        if (registry.hashToSignalId(hash) != 0) return;

        registry.registerSignal(hash, "0g-storage://invariant", "BTCUSDT");
        registrations++;
    }
}

contract SignalRegistryInvariantTest is Test {
    SignalRegistry internal registry;
    SignalRegistryHandler internal handler;

    function setUp() public {
        registry = new SignalRegistry();
        handler = new SignalRegistryHandler(registry);
        targetContract(address(handler));
    }

    function invariant_SignalCountMatchesRegistrations() public view {
        assertEq(registry.signalCount(), handler.registrations());
    }

    function invariant_HashMappingConsistent() public view {
        uint256 count = registry.signalCount();
        for (uint256 i = 1; i <= count; i++) {
            (bytes32 hash,,,, uint256 timestamp) = registry.getSignal(i);
            assertTrue(timestamp != 0);
            assertEq(registry.hashToSignalId(hash), i);
        }
    }
}
