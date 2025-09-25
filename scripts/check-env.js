const keys = ["MAINNET_RPC","SEPOLIA_RPC","PRIVATE_KEY","ETHERSCAN_API_KEY"];
for (const k of keys) {
  const v = process.env[k];
  let masked = "MISSING";
  if (v) {
    if (k === "PRIVATE_KEY") masked = v.slice(0,6) + "…" + v.slice(-4);
    else masked = v.slice(0,40) + (v.length > 40 ? "…" : "");
  }
  console.log(`${k.padEnd(18)} present=${!!v}  value=${masked}`);
}

