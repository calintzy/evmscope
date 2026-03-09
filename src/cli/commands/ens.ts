import { getClient } from "../../shared/rpc-client.js";

export async function cmdENS(nameOrAddress: string, json: boolean) {
  const client = getClient("ethereum");
  const isAddress = nameOrAddress.startsWith("0x") && nameOrAddress.length === 42;

  if (isAddress) {
    const name = await client.getEnsName({ address: nameOrAddress as `0x${string}` });
    if (json) { console.log(JSON.stringify({ address: nameOrAddress, name }, null, 2)); return; }
    console.log(`ENS Reverse Lookup`);
    console.log(`  Address: ${nameOrAddress}`);
    console.log(`  Name:    ${name ?? "not found"}`);
  } else {
    const address = await client.getEnsAddress({ name: nameOrAddress });
    if (json) { console.log(JSON.stringify({ name: nameOrAddress, address }, null, 2)); return; }
    console.log(`ENS Resolve`);
    console.log(`  Name:    ${nameOrAddress}`);
    console.log(`  Address: ${address ?? "not found"}`);
  }
}
