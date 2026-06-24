// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgenticID} from "../contracts/agentic/AgenticID.sol";

/// @title DeployAgenticID
/// @notice Deploy Attestra Agentic ID (ERC-7857) on 0G Galileo testnet.
contract DeployAgenticID is Script {
    function run() external returns (AgenticID agentic) {
        vm.startBroadcast();
        agentic = new AgenticID("Attestra Signal Agent", "ATSIG", 0);
        vm.stopBroadcast();

        console2.log("AgenticID deployed at:", address(agentic));
        console2.log("Chain ID:", block.chainid);
    }
}
