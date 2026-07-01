import "dotenv/config";
import { ethers } from "ethers";

// Send native 0G for gas from AGENT_PRIVATE_KEY to a recipient.
// Usage: tsx src/fund.ts <toAddress> [amountIn0G=0.5]
async function main(): Promise<void> {
  const to = process.argv[2];
  const amount = process.argv[3] ?? "0.5";
  if (!to || !ethers.isAddress(to)) throw new Error("usage: fund.ts <toAddress> [amount]");

  const rpc = process.env.ZG_RPC_URL ?? "https://evmrpc.0g.ai";
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  console.log(`from ${wallet.address} → ${to}: ${amount} 0G`);

  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amount) });
  console.log("tx:", tx.hash);
  await tx.wait();

  const bal = await provider.getBalance(to);
  console.log("confirmed. recipient balance:", ethers.formatEther(bal), "0G");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
