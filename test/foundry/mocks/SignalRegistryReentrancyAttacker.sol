// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SignalRegistry} from "../../../contracts/SignalRegistry.sol";

/// @dev Test helper — external call path for reentrancy surface analysis.
contract SignalRegistryReentrancyAttacker {
    SignalRegistry private immutable _registry;

    constructor(SignalRegistry registry) {
        _registry = registry;
    }

    function attack(bytes32 contentHash, string calldata storageUri, string calldata symbol)
        external
    {
        _registry.registerSignal(contentHash, storageUri, symbol);
    }
}
