// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {SignalRegistry} from "../contracts/SignalRegistry.sol";

/// @title DeploySignalRegistry
/// @notice Foundry deploy script for 0G Galileo testnet.
/// @dev Usage:
///   forge script script/DeploySignalRegistry.s.sol:DeploySignalRegistry \
///     --rpc-url og_testnet --broadcast --private-key $ZG_PRIVATE_KEY
contract DeploySignalRegistry is Script {
    function run() external returns (SignalRegistry registry) {
        vm.startBroadcast();
        registry = new SignalRegistry();
        vm.stopBroadcast();

        console2.log("SignalRegistry deployed at:", address(registry));
        console2.log("Chain ID:", block.chainid);
    }
}
