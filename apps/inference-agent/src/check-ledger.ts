import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";

// Read-only: inspect the 0G Compute ledger + available providers for this wallet.
async function main(): Promise<void> {
  const rpc = process.env.ZG_RPC_URL ?? "https://evmrpc.0g.ai";
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  console.log("wallet:", wallet.address);

  const broker = await createZGComputeNetworkBroker(wallet);

  try {
    const ledger = await broker.ledger.getLedger();
    console.log(
      "LEDGER EXISTS:",
      JSON.stringify(ledger, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2),
    );
  } catch (e) {
    console.log("NO LEDGER:", (e as Error).message);
  }

  try {
    const services = await broker.inference.listService();
    console.log(`services available: ${services.length}`);
    for (const s of services.slice(0, 10)) {
      console.log(`  - ${s.provider} | ${s.model} | ${s.serviceType} | verifiability=${s.verifiability}`);
    }
  } catch (e) {
    console.log("listService error:", (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
