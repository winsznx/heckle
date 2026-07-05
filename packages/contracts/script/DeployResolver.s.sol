// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleResolver} from "../src/HeckleResolver.sol";

/// @title DeployResolver
/// @notice Deploys HeckleResolver with the deployer as the sole resolver.
/// @dev Run with `forge script` + `--broadcast`/`--rpc-url`. Passing address(0)
///      makes msg.sender (the broadcasting deployer) the resolver.
contract DeployResolver is Script {
    function run() external {
        vm.startBroadcast();
        HeckleResolver resolver = new HeckleResolver(address(0));
        vm.stopBroadcast();
        console.log("HeckleResolver:", address(resolver));
    }
}
