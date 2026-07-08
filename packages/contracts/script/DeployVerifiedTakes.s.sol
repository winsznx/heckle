// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleAttestationRegistry} from "../src/HeckleAttestationRegistry.sol";
import {HeckleVerifiedTakes} from "../src/HeckleVerifiedTakes.sol";

/// @title DeployVerifiedTakes
/// @notice Non-broadcasting deploy for the Wave 1 contract-verified take layer:
///         HeckleAttestationRegistry (rooted in 0G's InferenceServing) +
///         HeckleVerifiedTakes. Run with `forge script ... --broadcast --rpc-url`.
/// @dev After deploy, the owner registers the provider's acknowledged TEE signer
///      (`registry.syncFromOG(provider)` or `registerAttestor(...)`) and
///      authorizes the agent committer (`verified.setCommitter(agent, true)`).
contract DeployVerifiedTakes is Script {
    /// 0G InferenceServing on 0G mainnet (chainId 16661).
    address internal constant OG_INFERENCE_SERVING = 0x47340d900bdFec2BD393c626E12ea0656F938d84;

    function run() external {
        vm.startBroadcast();

        HeckleAttestationRegistry registry = new HeckleAttestationRegistry(OG_INFERENCE_SERVING);
        HeckleVerifiedTakes verified = new HeckleVerifiedTakes(address(registry));

        vm.stopBroadcast();

        console.log("HeckleAttestationRegistry:", address(registry));
        console.log("HeckleVerifiedTakes:", address(verified));
    }
}
